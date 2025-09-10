import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function JobsPage() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <Link href="/" className="text-sm underline">
          Home
        </Link>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-3">Time</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Bytes</th>
            <th className="py-2 pr-3">Device</th>
            <th className="py-2 pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} className="border-b">
              <td className="py-2 pr-3">
                {new Date(j.createdAt).toLocaleString()}
              </td>
              <td className="py-2 pr-3">
                {j.status}
                {j.error ? ` (${j.error})` : ""}
              </td>
              <td className="py-2 pr-3">{j.bytes ?? ""}</td>
              <td className="py-2 pr-3">{j.device ?? ""}</td>
              <td className="py-2 pr-3">
                <form action={`/api/jobs/${j.id}/reprint`} method="post">
                  <button className="px-2 py-1 border text-xs">Reprint</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
