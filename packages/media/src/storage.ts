import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { repoRoot } from "@vendefacil/config";

export type StorageBucket = "private" | "public";

export type StorageService = {
  driver: "local" | "r2";
  generateUploadUrl(input: { bucket: StorageBucket; objectKey: string; mimeType: string; uploadUrl: string }): Promise<{
    url: string;
    method: "PUT" | "POST";
    headers: Record<string, string>;
  }>;
  putObject(bucket: StorageBucket, objectKey: string, body: Buffer, mimeType: string): Promise<void>;
  getObject(bucket: StorageBucket, objectKey: string): Promise<Buffer>;
  openLocalStream(bucket: StorageBucket, objectKey: string): Promise<{ stream: ReadableStream; size: number } | null>;
  getSignedDownloadUrl(bucket: StorageBucket, objectKey: string, expiresSeconds: number): Promise<string>;
  deleteObject(bucket: StorageBucket, objectKey: string): Promise<void>;
  copyObject(from: { bucket: StorageBucket; objectKey: string }, to: { bucket: StorageBucket; objectKey: string }): Promise<void>;
  getMetadata(bucket: StorageBucket, objectKey: string): Promise<{ sizeBytes: number; mimeType?: string } | null>;
  publicUrl(objectKey: string): string | null;
};

type StorageConfig = {
  driver: "local" | "r2";
  localDir: string;
  appUrl: string;
  r2?: {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    privateBucket: string;
    publicBucket: string;
    publicBaseUrl: string;
  };
};

function localPath(root: string, bucket: StorageBucket, objectKey: string) {
  const resolved = path.resolve(root, bucket, objectKey);
  const base = path.resolve(root, bucket);
  if (!resolved.startsWith(base)) throw new Error("Caminho de arquivo inválido.");
  return resolved;
}

function s3(config: NonNullable<StorageConfig["r2"]>) {
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

function bucketName(config: NonNullable<StorageConfig["r2"]>, bucket: StorageBucket) {
  return bucket === "public" ? config.publicBucket : config.privateBucket;
}

export function createStorage(config: StorageConfig): StorageService {
  const root = path.isAbsolute(config.localDir) ? config.localDir : path.join(repoRoot(), config.localDir);

  if (config.driver === "local") {
    return {
      driver: "local",
      async generateUploadUrl(input) {
        return { url: input.uploadUrl, method: "POST", headers: {} };
      },
      async putObject(bucket, objectKey, body) {
        const file = localPath(root, bucket, objectKey);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, body);
      },
      async getObject(bucket, objectKey) {
        return fs.readFile(localPath(root, bucket, objectKey));
      },
      async openLocalStream(bucket, objectKey) {
        const file = localPath(root, bucket, objectKey);
        const stat = await fs.stat(file).catch(() => null);
        if (!stat) return null;
        const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
        return { stream, size: stat.size };
      },
      async getSignedDownloadUrl(bucket, objectKey) {
        return `${config.appUrl}/api/media/file?bucket=${bucket}&key=${encodeURIComponent(objectKey)}`;
      },
      async deleteObject(bucket, objectKey) {
        await fs.rm(localPath(root, bucket, objectKey), { force: true });
      },
      async copyObject(from, to) {
        const source = localPath(root, from.bucket, from.objectKey);
        const target = localPath(root, to.bucket, to.objectKey);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(source, target);
      },
      async getMetadata(bucket, objectKey) {
        const stat = await fs.stat(localPath(root, bucket, objectKey)).catch(() => null);
        if (!stat) return null;
        return { sizeBytes: stat.size };
      },
      publicUrl() {
        return null;
      },
    };
  }

  if (!config.r2) throw new Error("R2 não configurado.");
  const client = s3(config.r2);
  const r2 = config.r2;
  return {
    driver: "r2",
    async generateUploadUrl(input) {
      const command = new PutObjectCommand({
        Bucket: bucketName(r2, input.bucket),
        Key: input.objectKey,
        ContentType: input.mimeType,
      });
      const url = await getSignedUrl(client, command, { expiresIn: 900 });
      return { url, method: "PUT", headers: { "content-type": input.mimeType } };
    },
    async putObject(bucket, objectKey, body, mimeType) {
      await client.send(new PutObjectCommand({ Bucket: bucketName(r2, bucket), Key: objectKey, Body: body, ContentType: mimeType }));
    },
    async getObject(bucket, objectKey) {
      const result = await client.send(new GetObjectCommand({ Bucket: bucketName(r2, bucket), Key: objectKey }));
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) throw new Error("Arquivo vazio.");
      return Buffer.from(bytes);
    },
    async openLocalStream() {
      return null;
    },
    async getSignedDownloadUrl(bucket, objectKey, expiresSeconds) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucketName(r2, bucket), Key: objectKey }), { expiresIn: expiresSeconds });
    },
    async deleteObject(bucket, objectKey) {
      await client.send(new DeleteObjectCommand({ Bucket: bucketName(r2, bucket), Key: objectKey }));
    },
    async copyObject(from, to) {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucketName(r2, to.bucket),
          Key: to.objectKey,
          CopySource: `${bucketName(r2, from.bucket)}/${from.objectKey}`,
        }),
      );
    },
    async getMetadata(bucket, objectKey) {
      try {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucketName(r2, bucket), Key: objectKey }));
        return { sizeBytes: head.ContentLength ?? 0, mimeType: head.ContentType };
      } catch {
        return null;
      }
    },
    publicUrl(objectKey) {
      if (!r2.publicBaseUrl) return null;
      return `${r2.publicBaseUrl.replace(/\/$/, "")}/${objectKey}`;
    },
  };
}
