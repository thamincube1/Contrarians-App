import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { listOutboxEmails } from "@/lib/storage";

// Dev-only: lets a developer actually open the PDFs lib/email.ts logs
// instead of sending while RESEND_API_KEY is unset. The /landlord layout
// already redirects non-landlords away; the role check below is just
// defense-in-depth for this specific page. Reads the outbox index (local
// disk, or the Supabase bucket if configured — see lib/storage.ts) on
// every request so a just-sent email shows up immediately.
export const dynamic = "force-dynamic";

export default async function DevOutboxPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const session = await verifySession();
  if (session.user.role !== "LANDLORD") notFound();

  const entries = await listOutboxEmails();

  return (
    <div>
      <header className="py-5 px-7 pb-4" style={{ borderBottom: "1px solid var(--hairline)" }}>
        <div className="flex items-center justify-between gap-5 flex-wrap">
          <div>
            <div className="text-[11px] tracking-[0.08em] uppercase" style={{ color: "#605d5d" }}>
              Dev only · not available in production
            </div>
            <h1 className="mt-[3px] text-[30px] font-extrabold tracking-tight leading-[1.1]">Dev outbox</h1>
          </div>
          <a href="/landlord" className="btn text-[13px] px-3.5 py-2 border" style={{ borderColor: "var(--hairline)" }}>
            ← Back to the app
          </a>
        </div>
        <div className="text-sm mt-2" style={{ color: "#605d5d" }}>
          Every email <code style={{ fontFamily: "ui-monospace,Menlo,monospace" }}>lib/email.ts</code> logged instead of
          sending, because <code style={{ fontFamily: "ui-monospace,Menlo,monospace" }}>RESEND_API_KEY</code> is unset
          — {entries.length} so far.
        </div>
      </header>

      <div className="p-4">
        {entries.length === 0 ? (
          <div className="surface p-6 text-sm" style={{ color: "#605d5d" }}>
            Nothing logged yet — send a statement, invoice or letter of demand from a tenant record, or offboard a
            tenant, and it&apos;ll show up here.
          </div>
        ) : (
          <div className="surface">
            <table className="table">
              <thead>
                <tr style={{ background: "#eae9e9" }}>
                  <th className="pl-[22px]">Sent</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th className="pr-[22px]">PDF</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  // Two sends of the same kind/unit on the same day share a
                  // filename (the later one overwrites the PDF on disk) —
                  // sentAt is what keeps each log row's key unique.
                  <tr key={`${e.sentAt}-${e.filename}`}>
                    <td className="tabnum pl-[22px]" style={{ color: "#605d5d" }} data-label="Sent">
                      {new Date(e.sentAt).toLocaleString("en-ZA", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="font-semibold" data-label="To">
                      {e.to}
                    </td>
                    <td data-label="Subject">{e.subject}</td>
                    <td className="pr-[22px]" data-label="PDF">
                      <a
                        href={`/landlord/dev/outbox/pdf?file=${encodeURIComponent(e.filename)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn text-[13px]"
                        style={{ color: "#ae1800" }}
                      >
                        Open →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
