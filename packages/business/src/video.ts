import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AspectRatio, Prisma, PrismaClient, TransitionType, VideoObjective, VideoStyle } from "@prisma/client";
import { ProviderNotConfiguredError, type AiRegistry } from "@vendefacil/ai";
import { ASPECT_DIMENSIONS, formatBrl } from "@vendefacil/types";
import { cleanupRenderDir, findFont, renderPhotoVideo, type StorageService } from "@vendefacil/media";
import { log } from "@vendefacil/config";
import { AppError } from "./errors";
import { debitKind, creditKind, assertGroundedCopy } from "./ledger";
import { isRetryable, isTerminal, nextRetryDelayMs, progressFor } from "./pipeline";
import { assertMinRole } from "./permissions";
import { audit, type Tenant } from "./tenant";

const projectInclude = {
  scenes: { orderBy: { position: "asc" as const } },
  renders: { orderBy: { createdAt: "desc" as const }, take: 1 },
  product: { select: { id: true, name: true, priceCents: true, promoPriceCents: true } },
  voiceProfile: true,
} satisfies Prisma.VideoProjectInclude;

export class VideoService {
  constructor(private db: PrismaClient, private ai: AiRegistry, private storage: StorageService) {}

  async list(tenant: Tenant) {
    const rows = await this.db.videoProject.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { updatedAt: "desc" },
      take: 40,
      include: { renders: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      durationSec: row.durationSec,
      aspectRatio: row.aspectRatio,
      style: row.style,
      updatedAt: row.updatedAt,
      render: row.renders[0] ? { id: row.renders[0].id, status: row.renders[0].status, progress: row.renders[0].progress } : null,
    }));
  }

  async voices() {
    return this.db.voiceProfile.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }

  async music(tenant: Tenant) {
    return this.db.musicTrack.findMany({
      where: { OR: [{ organizationId: tenant.organizationId }, { isSystem: true }] },
      orderBy: { createdAt: "desc" },
    });
  }

  async addMusic(tenant: Tenant, input: { title: string; licenseNote: string; assetId: string }) {
    assertMinRole(tenant.role, "EDITOR");
    const asset = await this.db.mediaAsset.findFirst({ where: { id: input.assetId, organizationId: tenant.organizationId, kind: "AUDIO", status: "READY" } });
    if (!asset) throw new AppError("NOT_FOUND", "Áudio não encontrado.", 404);
    return this.db.musicTrack.create({
      data: { organizationId: tenant.organizationId, title: input.title, licenseNote: input.licenseNote, objectKey: asset.objectKey, bucket: asset.bucket, mimeType: asset.mimeType, durationMs: asset.durationMs },
    });
  }

  async create(tenant: Tenant, input: { productId: string; title?: string; objective: VideoObjective; style: VideoStyle; durationSec: number; aspectRatio: AspectRatio; motionMode?: "PHOTO" | "GENERATIVE"; voiceProfileId?: string | null; musicTrackId?: string | null }) {
    assertMinRole(tenant.role, "EDITOR");
    if (input.motionMode === "GENERATIVE" && !this.ai.generativeVideo) {
      throw new AppError("PROVIDER_NOT_CONFIGURED", "O modo generativo precisa de um provedor de vídeo. O modo com fotos funciona sem ele.", 503);
    }
    const product = await this.db.product.findFirst({ where: { id: input.productId, organizationId: tenant.organizationId }, include: { images: { orderBy: { position: "asc" } } } });
    if (!product) throw new AppError("NOT_FOUND", "Produto não encontrado.", 404);
    if (!product.images.length) throw new AppError("IMAGES_REQUIRED", "Adicione ao menos uma foto ao produto.", 422);
    if (input.voiceProfileId) await this.ensureVoice(input.voiceProfileId);
    if (input.musicTrackId) await this.ensureMusic(tenant.organizationId, input.musicTrackId);
    const project = await this.db.videoProject.create({
      data: {
        organizationId: tenant.organizationId,
        productId: product.id,
        title: input.title || product.name,
        objective: input.objective,
        style: input.style,
        durationSec: input.durationSec,
        aspectRatio: input.aspectRatio,
        motionMode: input.motionMode ?? "PHOTO",
        voiceProfileId: input.voiceProfileId ?? null,
        musicTrackId: input.musicTrackId ?? null,
        scenes: {
          create: this.evenScenes(product.images.map((image) => image.mediaAssetId), input.durationSec * 1000, tenant.organizationId),
        },
      },
      include: projectInclude,
    });
    await audit(this.db, { organizationId: tenant.organizationId, actorUserId: tenant.userId, action: "video.created", entityType: "VideoProject", entityId: project.id });
    return project;
  }

  async get(tenant: Tenant, id: string) {
    const project = await this.db.videoProject.findFirst({ where: { id, organizationId: tenant.organizationId }, include: projectInclude });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);
    return project;
  }

  async update(tenant: Tenant, id: string, input: Partial<{ title: string; script: string; voiceProfileId: string | null; musicTrackId: string | null; narrationVolume: number; musicVolume: number; showPrice: boolean; showLogo: boolean; cta: string; scenes: Array<{ mediaAssetId?: string | null; durationMs: number; transition: TransitionType; zoom: number; panX: number; panY: number; headline?: string; caption?: string; cta?: string }> }>) {
    assertMinRole(tenant.role, "EDITOR");
    await this.get(tenant, id);
    if (input.scenes) {
      for (const scene of input.scenes) {
        if (scene.mediaAssetId) {
          const asset = await this.db.mediaAsset.findFirst({ where: { id: scene.mediaAssetId, organizationId: tenant.organizationId, status: "READY" } });
          if (!asset) throw new AppError("NOT_FOUND", "Uma das mídias da cena não pertence a esta loja.", 404);
        }
      }
    }
    await this.db.$transaction(async (tx) => {
      await tx.videoProject.update({
        where: { id },
        data: {
          title: input.title,
          script: input.script,
          voiceProfileId: input.voiceProfileId,
          musicTrackId: input.musicTrackId,
          narrationVolume: input.narrationVolume,
          musicVolume: input.musicVolume,
          showPrice: input.showPrice,
          showLogo: input.showLogo,
          cta: input.cta,
        },
      });
      if (input.scenes) {
        await tx.videoScene.deleteMany({ where: { projectId: id, organizationId: tenant.organizationId } });
        await tx.videoScene.createMany({
          data: input.scenes.map((scene, position) => ({
            organizationId: tenant.organizationId,
            projectId: id,
            position,
            durationMs: scene.durationMs,
            mediaAssetId: scene.mediaAssetId ?? null,
            transition: scene.transition,
            zoom: scene.zoom,
            panX: scene.panX,
            panY: scene.panY,
            headline: scene.headline ?? "",
            caption: scene.caption ?? "",
            cta: scene.cta ?? "",
          })),
        });
      }
    });
    return this.get(tenant, id);
  }

  async storyboard(tenant: Tenant, id: string, mode: "ai" | "even") {
    assertMinRole(tenant.role, "EDITOR");
    const project = await this.db.videoProject.findFirst({
      where: { id, organizationId: tenant.organizationId },
      include: { product: true, scenes: { orderBy: { position: "asc" } } },
    });
    if (!project?.product) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);
    if (mode === "even") {
      return this.get(tenant, id);
    }
    if (!this.ai.text) throw new AppError("PROVIDER_NOT_CONFIGURED", "O roteiro por IA precisa de um provedor configurado. As fotos já foram divididas em cenas para edição manual.", 503);
    const sceneCount = Math.max(1, project.scenes.length);
    try {
      const result = await this.ai.text.videoScript({
        facts: {
          name: project.product.name,
          priceLabel: formatBrl(project.product.promoPriceCents ?? project.product.priceCents),
          facts: project.product.description,
        },
        objective: project.objective,
        style: project.style,
        sceneCount,
      });
      assertGroundedCopy(result.script.narration, true);
      await this.db.$transaction(async (tx) => {
        await tx.videoProject.update({ where: { id }, data: { script: result.script.narration } });
        for (const [index, scene] of project.scenes.entries()) {
          const copy = result.script.scenes[index];
          await tx.videoScene.update({
            where: { id: scene.id },
            data: { headline: copy?.headline || project.product?.name || "", caption: copy?.caption || "", cta: project.cta },
          });
        }
        await tx.aiGeneration.create({
          data: { organizationId: tenant.organizationId, userId: tenant.userId, kind: "TEXT", status: "SUCCEEDED", metadata: { projectId: id }, ...result.usage },
        });
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof ProviderNotConfiguredError) throw new AppError("PROVIDER_NOT_CONFIGURED", error.message, 503);
      throw new AppError("AI_FAILED", "Não foi possível gerar o roteiro.", 502);
    }
    return this.get(tenant, id);
  }

  async narrate(tenant: Tenant, input: { script: string; voiceProfileId: string; speed?: number; style?: string; projectId?: string | null }, idempotencyKey: string) {
    assertMinRole(tenant.role, "EDITOR");
    const voice = await this.ensureVoice(input.voiceProfileId);
    const provider = this.ai.speech.find((item) => item.id === voice.provider);
    if (!provider) throw new AppError("PROVIDER_NOT_CONFIGURED", `A voz ${voice.name} precisa do provedor ${voice.provider} configurado.`, 503);
    if (input.projectId) await this.get(tenant, input.projectId);
    const speed = input.speed ?? 1;
    let audio;
    try {
      audio = await provider.synthesize({ text: input.script, voiceId: voice.providerVoiceId, speed });
    } catch (error) {
      await this.db.aiGeneration.create({ data: { organizationId: tenant.organizationId, userId: tenant.userId, kind: "TTS", provider: voice.provider, model: "unknown", status: "FAILED", errorCode: "TTS_FAILED" } });
      throw new AppError("AI_FAILED", error instanceof Error ? error.message : "Falha na narração.", 502);
    }
    const generation = await this.db.aiGeneration.create({
      data: { organizationId: tenant.organizationId, userId: tenant.userId, kind: "TTS", status: "SUCCEEDED", metadata: { projectId: input.projectId ?? null }, ...audio.usage },
    });
    await debitKind(this.db, { organizationId: tenant.organizationId, kind: "NARRATION", amount: 1, reason: "narration", idempotencyKey: `tts:${idempotencyKey}`, referenceType: "AiGeneration", referenceId: generation.id });
    const key = `org/${tenant.organizationId}/audio/${generation.id}.mp3`;
    await this.storage.putObject("private", key, audio.audio, audio.mimeType);
    const asset = await this.db.mediaAsset.create({
      data: { organizationId: tenant.organizationId, ownerUserId: tenant.userId, kind: "AUDIO", status: "READY", bucket: "private", objectKey: key, mimeType: audio.mimeType, sizeBytes: audio.audio.byteLength },
    });
    const row = await this.db.audioGeneration.create({
      data: { organizationId: tenant.organizationId, projectId: input.projectId ?? null, voiceProfileId: voice.id, script: input.script, provider: voice.provider, status: "SUCCEEDED", mediaAssetId: asset.id, speed },
    });
    if (input.projectId) await this.db.videoProject.update({ where: { id: input.projectId }, data: { script: input.script, voiceProfileId: voice.id } });
    return { id: row.id, url: `/api/media/${asset.id}` };
  }

  async requestRender(tenant: Tenant, projectId: string, idempotencyKey: string) {
    assertMinRole(tenant.role, "EDITOR");
    const existing = await this.db.videoRender.findUnique({ where: { idempotencyKey } });
    if (existing && existing.organizationId === tenant.organizationId) return existing;
    const project = await this.get(tenant, projectId);
    if (project.motionMode === "GENERATIVE") {
      throw new AppError("PROVIDER_UNSUPPORTED", "O modo generativo está reservado para um provedor que entregue o arquivo final. Use o modo com fotos para renderizar agora.", 422);
    }
    if (!project.scenes.length) throw new AppError("SCENES_REQUIRED", "O projeto precisa de cenas.", 422);
    const render = await this.db.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.findUnique({ where: { organizationId_kind: { organizationId: tenant.organizationId, kind: "RENDER" } } });
      if (!wallet) throw new AppError("NOT_FOUND", "Carteira de vídeo não encontrada.", 404);
      const { applyCredit } = await import("./ledger");
      await applyCredit(tx, { organizationId: tenant.organizationId, walletId: wallet.id, amount: -1, reason: "video_render", idempotencyKey: `render:${idempotencyKey}`, referenceType: "VideoRender" });
      const created = await tx.videoRender.create({
        data: { organizationId: tenant.organizationId, projectId, idempotencyKey, creditsReserved: 1, creditKind: "RENDER", status: "CREATED" },
      });
      await tx.backgroundJob.create({
        data: { organizationId: tenant.organizationId, type: "VIDEO_RENDER", payload: {}, videoRenderId: created.id, idempotencyKey: `job:${created.id}` },
      });
      return created;
    });
    await wakeJob(render.id, "VIDEO_RENDER");
    return render;
  }

  async cancel(tenant: Tenant, projectId: string) {
    assertMinRole(tenant.role, "EDITOR");
    const render = await this.db.videoRender.findFirst({ where: { projectId, organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" } });
    if (!render) throw new AppError("NOT_FOUND", "Não há render para cancelar.", 404);
    if (isTerminal(render.status)) return render;
    await this.db.videoRender.update({ where: { id: render.id }, data: { cancelRequested: true } });
    return render;
  }

  private evenScenes(assetIds: string[], totalMs: number, organizationId: string) {
    const count = Math.min(8, Math.max(1, assetIds.length));
    const each = Math.max(1500, Math.floor(totalMs / count));
    return assetIds.slice(0, count).map((mediaAssetId, position) => ({
      organizationId,
      position,
      mediaAssetId,
      durationMs: position === count - 1 ? totalMs - each * (count - 1) : each,
      transition: "FADE" as const,
    }));
  }

  private async ensureVoice(id: string) {
    const voice = await this.db.voiceProfile.findUnique({ where: { id } });
    if (!voice || !voice.active) throw new AppError("NOT_FOUND", "Voz não encontrada.", 404);
    return voice;
  }

  private async ensureMusic(organizationId: string, id: string) {
    const track = await this.db.musicTrack.findFirst({ where: { id, OR: [{ organizationId }, { isSystem: true }] } });
    if (!track) throw new AppError("NOT_FOUND", "Trilha não encontrada.", 404);
  }
}

export async function advanceVideoRender(db: PrismaClient, storage: StorageService, renderId: string) {
  const render = await db.videoRender.findUnique({ where: { id: renderId }, include: { job: true } });
  if (!render || isTerminal(render.status)) return render;
  let stage = render.status === "RETRYING" ? render.resumeStage || "VALIDATING" : render.status;
  if (stage === "CREATED") stage = "VALIDATING";
  const order = ["VALIDATING", "GENERATING_SCRIPT", "GENERATING_AUDIO", "PREPARING_SCENES", "RENDERING", "UPLOADING"] as const;
  const start = Math.max(0, order.indexOf(stage as (typeof order)[number]));
  for (const current of order.slice(start)) {
    const fresh = await db.videoRender.findUnique({ where: { id: renderId } });
    if (!fresh || isTerminal(fresh.status)) return fresh;
    if (fresh.cancelRequested && current !== "UPLOADING") {
      await failRender(db, fresh.id, "CANCELLED", "Cancelado pelo usuário.", true);
      return db.videoRender.findUnique({ where: { id: renderId } });
    }
    await db.videoRender.update({ where: { id: renderId }, data: { status: current, progress: progressFor(current), startedAt: fresh.startedAt ?? new Date() } });
    try {
      if (current === "VALIDATING") await validateRender(db, renderId);
      if (current === "GENERATING_SCRIPT") await Promise.resolve();
      if (current === "GENERATING_AUDIO") await ensureNarrationFile(db, storage, renderId);
      if (current === "PREPARING_SCENES") await normalizeScenes(db, renderId);
      if (current === "RENDERING") await renderScenes(db, storage, renderId);
      if (current === "UPLOADING") await publishRender(db, storage, renderId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha no render.";
      if (message === "CANCELLED") {
        await failRender(db, renderId, "CANCELLED", "Cancelado durante a renderização.", true);
        return db.videoRender.findUnique({ where: { id: renderId } });
      }
      const attempts = fresh.attempts + 1;
      log("error", "video.stage_failed", { renderId, stage: current, attempts, message });
      if (attempts < fresh.maxAttempts && isRetryable(error)) {
        await db.videoRender.update({ where: { id: renderId }, data: { status: "RETRYING", resumeStage: current, attempts, errorCode: "RETRYING", errorMessage: message.slice(0, 500) } });
        await db.backgroundJob.updateMany({ where: { videoRenderId: renderId }, data: { status: "PENDING", attempts, runAt: new Date(Date.now() + nextRetryDelayMs(attempts)), lockedAt: null, lastError: message.slice(0, 500) } });
        return db.videoRender.findUnique({ where: { id: renderId } });
      }
      await failRender(db, renderId, "FAILED", message, true);
      return db.videoRender.findUnique({ where: { id: renderId } });
    }
  }
  return db.videoRender.findUnique({ where: { id: renderId } });
}

async function validateRender(db: PrismaClient, renderId: string) {
  const render = await db.videoRender.findUnique({ where: { id: renderId }, include: { project: { include: { scenes: true } } } });
  if (!render?.project.scenes.length) throw new AppError("SCENES_REQUIRED", "O projeto não tem cenas.", 422);
  if (render.project.motionMode !== "PHOTO") throw new AppError("PROVIDER_UNSUPPORTED", "Somente o modo com fotos é renderizado neste worker.", 422);
}

async function ensureNarrationFile(db: PrismaClient, _storage: StorageService, renderId: string) {
  const render = await db.videoRender.findUnique({ where: { id: renderId }, include: { project: true } });
  if (!render?.project.voiceProfileId) return;
  const audio = await db.audioGeneration.findFirst({ where: { projectId: render.projectId, status: "SUCCEEDED", mediaAssetId: { not: null } }, orderBy: { createdAt: "desc" } });
  if (!audio) throw new AppError("NARRATION_REQUIRED", "Gere a narração antes de exportar ou remova a voz do projeto.", 422);
}

async function normalizeScenes(db: PrismaClient, renderId: string) {
  const render = await db.videoRender.findUnique({ where: { id: renderId }, include: { project: { include: { scenes: { orderBy: { position: "asc" } }, product: true } } } });
  if (!render) return;
  const scenes = render.project.scenes;
  const target = render.project.durationSec * 1000;
  const current = scenes.reduce((sum, scene) => sum + scene.durationMs, 0) || target;
  let used = 0;
  for (const [index, scene] of scenes.entries()) {
    const durationMs = index === scenes.length - 1 ? Math.max(1000, target - used) : Math.max(1000, Math.round((scene.durationMs / current) * target));
    used += durationMs;
    const price = render.project.showPrice && render.project.product ? formatBrl(render.project.product.promoPriceCents ?? render.project.product.priceCents) : "";
    await db.videoScene.update({
      where: { id: scene.id },
      data: {
        durationMs,
        headline: scene.headline || (index === 0 ? render.project.title : ""),
        caption: scene.caption || price,
      },
    });
  }
}

async function renderScenes(db: PrismaClient, storage: StorageService, renderId: string) {
  const render = await db.videoRender.findUnique({
    where: { id: renderId },
    include: { project: { include: { scenes: { orderBy: { position: "asc" }, include: { media: true } }, musicTrack: true } }, job: true },
  });
  if (!render) return;
  const payload = (render.job?.payload && typeof render.job.payload === "object" ? render.job.payload : {}) as { outputKey?: string };
  if (payload.outputKey) return;
  const dir = path.join(os.tmpdir(), "vendefacil", renderId);
  await fs.mkdir(dir, { recursive: true });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10 * 60 * 1000);
  const poll = setInterval(async () => {
    const current = await db.videoRender.findUnique({ where: { id: renderId }, select: { cancelRequested: true } });
    if (current?.cancelRequested) controller.abort();
  }, 2000);
  try {
    const scenes = [];
    for (const [index, scene] of render.project.scenes.entries()) {
      if (!scene.media) throw new AppError("IMAGES_REQUIRED", "Toda cena precisa de uma imagem.", 422);
      const bytes = await storage.getObject("private", scene.media.objectKey);
      const imagePath = path.join(dir, `source-${index}.img`);
      await fs.writeFile(imagePath, bytes);
      const size = ASPECT_DIMENSIONS[render.project.aspectRatio];
      scenes.push({
        imagePath,
        durationMs: scene.durationMs,
        zoom: scene.zoom,
        panX: scene.panX,
        panY: scene.panY,
        headline: scene.headline.slice(0, 48),
        caption: [scene.caption, scene.cta].filter(Boolean).join(" · ").slice(0, 90),
        transition: scene.transition,
        width: size.width,
      });
    }
    let narrationPath: string | undefined;
    const narration = await db.audioGeneration.findFirst({ where: { projectId: render.projectId, status: "SUCCEEDED" }, include: { mediaAsset: true }, orderBy: { createdAt: "desc" } });
    if (narration?.mediaAsset) {
      narrationPath = path.join(dir, "narration.mp3");
      await fs.writeFile(narrationPath, await storage.getObject("private", narration.mediaAsset.objectKey));
    }
    let musicPath: string | undefined;
    if (render.project.musicTrack) {
      musicPath = path.join(dir, "music.bin");
      await fs.writeFile(musicPath, await storage.getObject("private", render.project.musicTrack.objectKey));
    }
    const font = await findFont(process.env.FONT_PATH);
    const result = await renderPhotoVideo({
      renderId,
      aspectRatio: render.project.aspectRatio,
      scenes,
      narrationPath,
      musicPath,
      narrationVolume: render.project.narrationVolume,
      musicVolume: render.project.musicVolume,
      ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
      fontPath: font,
      signal: controller.signal,
      onProgress: (progress) => {
        void db.videoRender.update({ where: { id: renderId }, data: { progress } }).catch(() => undefined);
      },
    });
    const outputKey = `org/${render.organizationId}/renders/${renderId}.mp4`;
    const srtKey = `org/${render.organizationId}/renders/${renderId}.srt`;
    await storage.putObject("private", outputKey, result.video, "video/mp4");
    await storage.putObject("private", srtKey, Buffer.from(result.srt), "application/x-subrip");
    await db.backgroundJob.updateMany({ where: { videoRenderId: renderId }, data: { payload: { outputKey, srtKey, bytes: result.video.byteLength } } });
    await cleanupRenderDir(result.tempDir);
  } finally {
    clearTimeout(timer);
    clearInterval(poll);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function publishRender(db: PrismaClient, _storage: StorageService, renderId: string) {
  const render = await db.videoRender.findUnique({ where: { id: renderId }, include: { job: true, project: true } });
  if (!render) return;
  if (render.outputAssetId) {
    await complete(db, render.id, render.organizationId, render.projectId);
    return;
  }
  const payload = render.job?.payload as { outputKey?: string; srtKey?: string; bytes?: number } | null;
  if (!payload?.outputKey) throw new Error("O arquivo renderizado não foi encontrado.");
  const asset = await db.mediaAsset.create({
    data: {
      organizationId: render.organizationId,
      ownerUserId: render.projectId,
      kind: "VIDEO",
      status: "READY",
      visibility: "PRIVATE",
      bucket: "private",
      objectKey: payload.outputKey,
      mimeType: "video/mp4",
      sizeBytes: payload.bytes ?? 0,
    },
  });
  if (payload.srtKey) {
    await db.mediaAsset.create({
      data: {
        organizationId: render.organizationId,
        ownerUserId: render.projectId,
        kind: "DOCUMENT",
        status: "READY",
        bucket: "private",
        objectKey: payload.srtKey,
        mimeType: "application/x-subrip",
        sizeBytes: 0,
        originalName: "legendas.srt",
      },
    });
  }
  await db.videoRender.update({ where: { id: render.id }, data: { outputAssetId: asset.id } });
  await complete(db, render.id, render.organizationId, render.projectId);
}

async function complete(db: PrismaClient, renderId: string, organizationId: string, projectId: string) {
  await db.videoRender.update({ where: { id: renderId }, data: { status: "COMPLETED", progress: 100, finishedAt: new Date(), errorCode: null, errorMessage: null } });
  await db.backgroundJob.updateMany({ where: { videoRenderId: renderId }, data: { status: "SUCCEEDED", progress: 100, lockedAt: null } });
  await db.notification.create({ data: { organizationId, title: "Vídeo pronto", body: "A exportação terminou e já pode ser baixada.", href: `/estudio/video/${projectId}` } });
  await audit(db, { organizationId, action: "video.completed", entityType: "VideoRender", entityId: renderId });
}

async function failRender(db: PrismaClient, renderId: string, status: "FAILED" | "CANCELLED", message: string, refund: boolean) {
  const render = await db.videoRender.findUnique({ where: { id: renderId } });
  if (!render || isTerminal(render.status)) return;
  if (refund && render.creditsReserved > 0) {
    await creditKind(db, { organizationId: render.organizationId, kind: render.creditKind, amount: render.creditsReserved, reason: status === "CANCELLED" ? "render_cancelled" : "render_refund", idempotencyKey: `render-refund:${render.id}`, referenceType: "VideoRender", referenceId: render.id });
  }
  await db.videoRender.update({ where: { id: renderId }, data: { status, errorCode: status, errorMessage: message.slice(0, 500), finishedAt: new Date(), progress: 100 } });
  await db.backgroundJob.updateMany({ where: { videoRenderId: renderId }, data: { status: status === "CANCELLED" ? "CANCELLED" : "DEAD", lastError: message.slice(0, 500), lockedAt: null } });
  await db.notification.create({ data: { organizationId: render.organizationId, title: status === "CANCELLED" ? "Vídeo cancelado" : "Vídeo não foi concluído", body: message.slice(0, 180), href: `/estudio/video/${render.projectId}` } });
}

export async function wakeJob(renderId: string, type: string) {
  if (!process.env.REDIS_URL) return;
  const { Queue } = await import("bullmq");
  const Redis = (await import("ioredis")).default;
  const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue("vendefacil", { connection });
  await queue.add(type, { renderId }, { jobId: renderId, removeOnComplete: 200, removeOnFail: 200 });
  await queue.close();
  await connection.quit();
}

export async function claimDueJobs(db: PrismaClient, take = 2) {
  const now = new Date();
  const stale = new Date(Date.now() - 15 * 60 * 1000);
  const due = await db.backgroundJob.findMany({
    where: {
      type: "VIDEO_RENDER",
      status: { in: ["PENDING"] },
      runAt: { lte: now },
      OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }],
    },
    orderBy: { runAt: "asc" },
    take,
  });
  const claimed: string[] = [];
  for (const job of due) {
    const updated = await db.backgroundJob.updateMany({
      where: { id: job.id, status: "PENDING", OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }] },
      data: { status: "RUNNING", lockedAt: new Date() },
    });
    if (updated.count === 1 && job.videoRenderId) claimed.push(job.videoRenderId);
  }
  return claimed;
}

void randomUUID;
void createHash;
