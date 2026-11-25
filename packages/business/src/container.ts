import path from "node:path";
import { config as loadEnv } from "dotenv";
import { loadConfig, repoRoot } from "@vendefacil/config";

loadEnv({ path: path.join(repoRoot(), ".env") });
import { createAiRegistry } from "@vendefacil/ai";
import { getPrisma } from "@vendefacil/database";
import { createStorage } from "@vendefacil/media";
import { AccountService } from "./account";
import { AdminService } from "./admin";
import { AuthService } from "./auth";
import { BillingService } from "./billing";
import { CatalogService } from "./catalog";
import { CommerceService } from "./commerce";
import { MediaService } from "./uploads";
import { PublicationService } from "./publish";
import { StudioService } from "./studio";
import { TenantService } from "./tenant";
import { VideoService } from "./video";

export type Container = ReturnType<typeof createContainer>;

export function createContainer() {
  const config = loadConfig();
  const db = getPrisma();
  const storage = createStorage({
    driver: config.STORAGE_DRIVER,
    localDir: path.isAbsolute(config.STORAGE_LOCAL_DIR) ? config.STORAGE_LOCAL_DIR : path.join(repoRoot(), config.STORAGE_LOCAL_DIR),
    appUrl: config.APP_URL,
    r2: config.STORAGE_DRIVER === "r2"
      ? {
          accessKeyId: config.R2_ACCESS_KEY_ID,
          secretAccessKey: config.R2_SECRET_ACCESS_KEY,
          endpoint: config.R2_ENDPOINT,
          privateBucket: config.R2_BUCKET_PRIVATE,
          publicBucket: config.R2_BUCKET_PUBLIC,
          publicBaseUrl: config.R2_PUBLIC_BASE_URL,
        }
      : undefined,
  });
  const ai = createAiRegistry(config);
  const auth = new AuthService(db);
  const tenants = new TenantService(db);
  const catalog = new CatalogService(db, storage, tenants);
  const billing = new BillingService(db);
  const media = new MediaService(db, storage, config.ENCRYPTION_KEY, config.APP_URL, billing);
  const studio = new StudioService(db, ai, storage, tenants, catalog, billing);
  const videos = new VideoService(db, ai, storage, billing);
  const commerce = new CommerceService(db);
  const publications = new PublicationService(db, tenants, config.ENCRYPTION_KEY, config.APP_URL);
  const account = new AccountService(db, storage);
  const admin = new AdminService(db);
  return { db, storage, ai, config, auth, tenants, catalog, media, studio, videos, commerce, billing, publications, account, admin };
}

let cached: Container | null = null;

export function getContainer() {
  if (!cached) cached = createContainer();
  return cached;
}
