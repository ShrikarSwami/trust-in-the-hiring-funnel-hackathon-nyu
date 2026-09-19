"use client";

import { useEffect, useState } from "react";
import type { MatchResult } from "@/lib/match";
import type { ClaimedPosting } from "@/lib/match";

interface Props {
  company: string;
  provider: string;
  token: string;
  totalRoles: number;
  posting: ClaimedPosting;
  match: MatchResult;
  onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="text-base uppercase tracking-widest text-dim">{label}</div>
      <div className="mt-1 break-words font-mono text-lg">{children}</div>
    </div>
  );
}

export default function CaseFile({ company, provider, token, totalRoles, posting, match, onClose }: Props) {
  const [closestText, setClosestText] = useState<string | null>(null);
  const closest = match.closestRole;

  useEffect(() => {
    let dead = false;
    if (closest && closest.provider === "greenhouse") {
      fetch(`/api/role?token=${encodeURIComponent(token)}&id=${encodeURIComponent(closest.id)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => !dead && j && setClosestText(j.text))
        .catch(() => {});
    }
    return () => {
      dead = true;
    };
  }, [closest, token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fabricated = posting.origin === "fabricated";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <aside
        className="drawer-in h-full w-full max-w-2xl overflow-y-auto border-l border-bad/60 bg-panel p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Case file"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-base uppercase tracking-widest text-bad">Case file · {posting.id}</div>
            <h2 className="mt-2 font-mono text-2xl font-semibold">{posting.title}</h2>
          </div>
          <button onClick={onClose} className="rounded border border-line px-3 py-1 text-base text-dim hover:text-fg">
            Close ✕
          </button>
        </div>

        <div className="mb-6 rounded border border-bad/60 bg-bad/10 p-4 text-lg leading-relaxed">
          <strong className="text-bad">No matching requisition exists.</strong> {company}&apos;s public{" "}
          <span className="font-mono">{provider}</span> job board (<span className="font-mono">{token}</span>,{" "}
          {totalRoles} open roles) contains no role matching this title. A posting claiming to be from {company} that
          has no real req behind it is fraudulent by definition.
        </div>

        {fabricated && (
          <div className="fabricated-stripes mb-6 rounded border border-dashed border-warn/70 p-3 text-base text-warn">
            FABRICATED DEMO DATA — this posting was written for the demo. It is not a real-world finding.
          </div>
        )}

        <Field label="Posting text">
          <span className="text-fg">{posting.title}</span>
          <span className="text-dim"> — {posting.location || "no location given"}</span>
        </Field>
        <Field label="Where it was found">
          {posting.source}
          <div className="mt-1 text-base text-dim">{posting.source_url}</div>
          <div className="text-base text-dim">collected {posting.collected_at}</div>
        </Field>
        <Field label="Contact domain">
          {posting.contact_domain ?? <span className="text-dim">none listed</span>}
        </Field>
        <Field label="Verdict">
          NO_SUCH_REQ · best title similarity in ATS {(match.titleScore * 100).toFixed(0)}%
        </Field>

        {closest && (
          <div className="mt-2 border-t border-line pt-5">
            <div className="text-base uppercase tracking-widest text-dim">Closest real role (not a match)</div>
            <div className="mt-1 font-mono text-lg">{closest.title}</div>
            <div className="font-mono text-base text-dim">
              {closest.location} · req {closest.id}
            </div>
            {closestText && (
              <p className="mt-3 max-h-48 overflow-y-auto whitespace-pre-line text-base leading-relaxed text-dim">
                {closestText}
              </p>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
