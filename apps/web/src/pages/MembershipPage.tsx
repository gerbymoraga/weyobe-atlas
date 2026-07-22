import { useEffect, useState, type FormEvent } from "react";
import { membershipApi } from "../api/endpoints";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import type { Membership } from "../types";

export function MembershipPage() {
  const { member } = useAuth();
  const [data, setData] = useState<Membership | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [apply, setApply] = useState({
    motivation: "",
    experience_level: "",
    interest: "",
  });
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void membershipApi.get().then(setData).catch(() => setData(null));
  }, []);

  async function openPortal() {
    const { url } = await membershipApi.portal();
    window.location.href = url;
  }

  async function startSub() {
    const { url } = await membershipApi.subscribe();
    window.location.href = url;
  }

  async function submitApply(e: FormEvent) {
    e.preventDefault();
    await membershipApi.applyExpedition(apply);
    setShowApply(false);
    setNote("Application received — no charge until approval.");
  }

  return (
    <div>
      <PageHeader
        title="Membership"
        subtitle="Plan, billing, and Expedition invitation requests."
      />
      {note ? <p className="mb-4 font-ui text-sm text-brass">{note}</p> : null}
      {!data ? (
        <Skeleton className="h-48" />
      ) : (
        <div className="border border-[var(--line)] bg-panel/50 p-6">
          <p className="font-display text-3xl capitalize">{data.tier}</p>
          <p className="mt-1 font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
            Status · {data.status}
            {member?.member_since ? ` · since ${member.member_since}` : ""}
          </p>
          <ul className="mt-6 space-y-2 text-[var(--muted)]">
            {data.benefits.map((b) => (
              <li key={b}>— {b}</li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void openPortal()}
              className="border border-brass px-4 py-2 font-ui text-xs uppercase tracking-wider text-brass"
            >
              Manage billing
            </button>
            <button
              type="button"
              onClick={() => void startSub()}
              className="bg-brass px-4 py-2 font-ui text-xs uppercase tracking-wider text-ink"
            >
              Start Navigator
            </button>
            {data.tier === "navigator" ? (
              <button
                type="button"
                onClick={() => setShowApply(true)}
                className="border border-[var(--line)] px-4 py-2 font-ui text-xs uppercase tracking-wider"
              >
                Request an invitation
              </button>
            ) : null}
          </div>
        </div>
      )}

      {showApply ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4">
          <form
            onSubmit={(e) => void submitApply(e)}
            className="w-full max-w-lg border border-[var(--line)] bg-panel p-6"
          >
            <h3 className="font-display text-2xl">Expedition application</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Application-gated — card captured only after approval.
            </p>
            {(["motivation", "experience_level", "interest"] as const).map((field) => (
              <label key={field} className="mt-4 block font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                {field.replaceAll("_", " ")}
                <textarea
                  className="mt-2 w-full border border-[var(--line)] bg-ink px-3 py-2 text-bone"
                  rows={3}
                  required
                  value={apply[field]}
                  onChange={(e) => setApply({ ...apply, [field]: e.target.value })}
                />
              </label>
            ))}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setShowApply(false)}
                className="flex-1 border border-[var(--line)] px-3 py-2 font-ui text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-brass px-3 py-2 font-ui text-xs uppercase text-ink"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
