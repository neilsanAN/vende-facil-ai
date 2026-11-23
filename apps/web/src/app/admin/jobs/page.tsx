import { getContainer } from "@vendefacil/business";
import { requireAdminPage } from "@/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const session = await requireAdminPage();
  const jobs = await getContainer().admin.jobs(session);
  return <main className="mx-auto max-w-5xl px-4 py-6"><h1 className="text-xl font-semibold">Jobs</h1><ul className="mt-4 space-y-2 text-sm">{jobs.map((job) => <li key={job.id} className="rounded-xl border border-line bg-surface p-3">{job.type} · {job.status} · tentativas {job.attempts}{job.lastError ? ` · ${job.lastError}` : ""}</li>)}</ul></main>;
}
