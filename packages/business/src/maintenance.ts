import type { PrismaClient } from "@prisma/client";
import type { StorageService } from "@vendefacil/media";
import { log } from "@vendefacil/config";
import { BillingService } from "./billing";
import { PublicationService } from "./publish";

export async function runMaintenance(db: PrismaClient, storage: StorageService, billing: BillingService, publications: PublicationService) {
  const minute = new Date().toISOString().slice(0, 16);
  try {
    await db.backgroundJob.create({ data: { type: "MAINTENANCE", status: "RUNNING", payload: {}, idempotencyKey: `maintenance:${minute}` } });
  } catch {
    return;
  }
  const pendingCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await db.mediaAsset.findMany({ where: { status: "PENDING", createdAt: { lt: pendingCutoff } }, take: 50 });
  for (const asset of stale) {
    await storage.deleteObject("private", asset.objectKey).catch(() => undefined);
    await db.mediaAsset.update({ where: { id: asset.id }, data: { status: "DELETED" } });
  }
  await billing.renewDue();
  await publications.dispatchDue();
  log("info", "maintenance.completed", { removedPending: stale.length });
}
