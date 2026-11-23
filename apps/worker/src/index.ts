import http from "node:http";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import { log, repoRoot } from "@vendefacil/config";
import { advanceVideoRender, claimDueJobs, getContainer, runMaintenance } from "@vendefacil/business";

loadEnv({ path: path.join(repoRoot(), ".env") });

const container = getContainer();
const db = container.db;
let stopping = false;

async function tick() {
  const ids = await claimDueJobs(db, 2);
  for (const renderId of ids) {
    try {
      await advanceVideoRender(db, container.storage, renderId);
    } catch (error) {
      log("error", "worker.render_crashed", { renderId, message: error instanceof Error ? error.message : "erro" });
    }
  }
}

async function maintenance() {
  try {
    await runMaintenance(db, container.storage, container.billing, container.publications);
  } catch (error) {
    log("error", "worker.maintenance_failed", { message: error instanceof Error ? error.message : "erro" });
  }
}

async function listenQueue() {
  if (!process.env.REDIS_URL) return;
  const { Worker } = await import("bullmq");
  const Redis = (await import("ioredis")).default;
  const connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  const worker = new Worker(
    "vendefacil",
    async (job) => {
      if (typeof job.data.renderId === "string") await advanceVideoRender(db, container.storage, job.data.renderId);
    },
    { connection, concurrency: 1 },
  );
  worker.on("failed", (job, error) => log("error", "worker.queue_failed", { jobId: job?.id, message: error.message }));
  return worker;
}

const port = Number(process.env.WORKER_PORT || 3001);
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, () => log("info", "worker.started", { port, redis: Boolean(process.env.REDIS_URL) }));
const queue = await listenQueue();
const poll = setInterval(() => { if (!stopping) void tick(); }, 4000);
const cron = setInterval(() => { if (!stopping) void maintenance(); }, 60_000);
void tick();

async function shutdown() {
  stopping = true;
  clearInterval(poll);
  clearInterval(cron);
  await queue?.close();
  server.close();
  await db.$disconnect();
}

process.on("SIGINT", () => void shutdown().then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown().then(() => process.exit(0)));
