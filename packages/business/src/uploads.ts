import { randomUUID } from "node:crypto";
import type { MediaKind, PrismaClient } from "@prisma/client";
import { imageMetadata, signPayload, verifyPayload, detectMime, assertAllowedUpload, extensionForMime, type StorageService } from "@vendefacil/media";
import { AppError } from "./errors";
import { assertMinRole } from "./permissions";
import type { Tenant } from "./tenant";
import type { BillingService } from "./billing";

export class MediaService {
  constructor(
    private db: PrismaClient,
    private storage: StorageService,
    private encryptionKey: string,
    private appUrl: string,
    private billing: BillingService,
  ) {}

  async request(tenant: Tenant, input: { mimeType: string; sizeBytes: number; kind: "IMAGE" | "VIDEO" | "AUDIO"; originalName?: string }) {
    assertMinRole(tenant.role, "EDITOR");
    const declared = input.mimeType === "audio/mp3" ? "audio/mpeg" : input.mimeType;
    const limits = this.limits();
    const max = input.kind === "IMAGE" ? limits.image : input.kind === "AUDIO" ? limits.audio : limits.video;
    if (input.sizeBytes > max) throw new AppError("FILE_TOO_LARGE", "O arquivo excede o tamanho permitido.", 413);
    await this.billing.assertStorage(tenant.organizationId, input.sizeBytes);
    const id = randomUUID();
    const objectKey = `org/${tenant.organizationId}/originals/${id}.${extensionForMime(declared)}`;
    const asset = await this.db.mediaAsset.create({
      data: {
        id,
        organizationId: tenant.organizationId,
        ownerUserId: tenant.userId,
        kind: input.kind as MediaKind,
        bucket: "private",
        objectKey,
        mimeType: declared,
        sizeBytes: input.sizeBytes,
        originalName: (input.originalName ?? "").slice(0, 180),
      },
    });
    const exp = Date.now() + 15 * 60 * 1000;
    const payload = `${asset.id}.${exp}`;
    const upload = await this.storage.generateUploadUrl({
      bucket: "private",
      objectKey,
      mimeType: declared,
      uploadUrl: `${this.appUrl}/api/uploads/direct?token=${payload}.${signPayload(payload, this.encryptionKey)}`,
    });
    return { assetId: asset.id, ...upload };
  }

  async writeDirect(token: string, body: Buffer) {
    const [assetId, exp, signature] = token.split(".");
    if (!assetId || !exp || !signature || !verifyPayload(`${assetId}.${exp}`, signature, this.encryptionKey)) {
      throw new AppError("TOKEN_INVALID", "Upload expirado ou inválido.", 401);
    }
    if (Number(exp) < Date.now()) throw new AppError("TOKEN_EXPIRED", "O link de upload expirou.", 401);
    const asset = await this.db.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status !== "PENDING") throw new AppError("NOT_FOUND", "Upload não encontrado.", 404);
    if (body.byteLength > this.maxFor(asset.kind)) throw new AppError("FILE_TOO_LARGE", "O arquivo excede o tamanho permitido.", 413);
    await this.storage.putObject("private", asset.objectKey, body, asset.mimeType);
    return { assetId: asset.id };
  }

  async confirm(tenant: Tenant, assetId: string) {
    assertMinRole(tenant.role, "EDITOR");
    const asset = await this.db.mediaAsset.findFirst({ where: { id: assetId, organizationId: tenant.organizationId } });
    if (!asset) throw new AppError("NOT_FOUND", "Arquivo não encontrado.", 404);
    if (asset.status === "READY") return { id: asset.id, url: `/api/media/${asset.id}` };
    const bytes = await this.storage.getObject("private", asset.objectKey).catch(() => null);
    if (!bytes) throw new AppError("UPLOAD_MISSING", "O arquivo ainda não chegou ao armazenamento.", 409);
    try {
      const detected = detectMime(bytes);
      assertAllowedUpload({
        declaredMime: asset.mimeType,
        detectedMime: detected,
        sizeBytes: bytes.byteLength,
        kind: asset.kind === "AUDIO" ? "AUDIO" : asset.kind === "VIDEO" ? "VIDEO" : "IMAGE",
        limits: this.limits(),
      });
      let width: number | null = null;
      let height: number | null = null;
      if (asset.kind === "IMAGE") {
        const meta = await imageMetadata(bytes);
        width = meta.width;
        height = meta.height;
      }
      await this.db.mediaAsset.update({
        where: { id: asset.id },
        data: { status: "READY", sizeBytes: bytes.byteLength, mimeType: detected || asset.mimeType, width, height },
      });
      return { id: asset.id, url: `/api/media/${asset.id}` };
    } catch (error) {
      await this.storage.deleteObject("private", asset.objectKey).catch(() => undefined);
      await this.db.mediaAsset.update({ where: { id: asset.id }, data: { status: "REJECTED" } });
      throw new AppError("UPLOAD_REJECTED", error instanceof Error ? error.message : "Arquivo recusado.", 422);
    }
  }

  async readable(assetId: string, tenant: { organizationId: string } | null, query: { exp?: string; sig?: string }) {
    const asset = await this.db.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.status === "DELETED" || asset.status === "REJECTED") return null;
    const authed = Boolean(query.exp && query.sig && Number(query.exp) > Date.now() && verifyPayload(`${assetId}.${query.exp}`, query.sig, this.encryptionKey));
    const member = tenant && tenant.organizationId === asset.organizationId;
    const isPublic = asset.visibility === "PUBLIC" && Boolean(asset.publicObjectKey);
    if (!isPublic && !authed && !member) return null;
    return asset;
  }

  private limits() {
    return {
      image: Number(process.env.MAX_IMAGE_BYTES || 10 * 1024 * 1024),
      audio: Number(process.env.MAX_AUDIO_BYTES || 15 * 1024 * 1024),
      video: Number(process.env.MAX_VIDEO_BYTES || 100 * 1024 * 1024),
    };
  }

  private maxFor(kind: MediaKind) {
    const limits = this.limits();
    if (kind === "IMAGE") return limits.image;
    if (kind === "AUDIO") return limits.audio;
    return limits.video;
  }
}
