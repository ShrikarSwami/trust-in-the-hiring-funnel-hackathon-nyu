"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CaseFile from "@/components/CaseFile";
import type { Role } from "@/lib/ats/types";
import type { ClaimedPosting, MatchResult } from "@/lib/match";

interface VerifyResponse {
  company: string;
  provider: string;
  token: string;
  source: "live" | "cache";
  fetchedAt: string;
  roles: Role[];
  results: { posting: ClaimedPosting; match: MatchResult }[];
}

const REVEAL_EVERY_MS = 450;
const RESOLVE_AFTER_MS = 900;

const STATE_STYLE = {
  checking: "border-l-accent bg-accent/5",
  verified: "border-l-ok bg-ok/[0.08] flash-ok",
  unverified: "border-l-warn bg-warn/[0.08]",
  no_such_req: "border-l-bad bg-bad/10 flash-bad cursor-pointer hover:bg-bad/20",
} as const;

export default function Home() {
  const [input, setInput] = useState("Coinbase");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [resolved, setResolved] = useState<string[]>([]);
  const [flashRole, setFlashRole] = useState<string | null>(null);
  const [open, setOpen] = useState<{ posting: ClaimedPosting; match: MatchResult } | null>(null);

  const runId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const roleRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const run = useCallback(async (name: string) => {
    const id = ++runId.current;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLoading(true);
    setError(null);
    setData(null);
    setRevealed([]);
    setResolved([]);
    setFlashRole(null);
    setOpen(null);
    try {
      const res = await fetch(`/api/verify?company=${encodeURIComponent(name)}`);
      const json = await res.json();
      if (id !== runId.current) return;
      if (!res.ok) {
        setError(json.error ?? "Lookup failed");
        setLoading(false);
        return;
      }
      const d = json as VerifyResponse;
      setData(d);
      setLoading(false);
      d.results.forEach((r, i) => {
        timers.current.push(
          setTimeout(() => {
            if (id !== runId.current) return;
            setRevealed((p) => [...p, r.posting.id]);
          }, 600 + i * REVEAL_EVERY_MS),
        );
        timers.current.push(
          setTimeout(
            () => {
              if (id !== runId.current) return;
              setResolved((p) => [...p, r.posting.id]);
              const role = r.match.status === "verified" ? r.match.matchedRole : undefined;
              if (role) {
                setFlashRole(role.id);
                roleRefs.current.get(role.id)?.scrollIntoView({ block: "center", behavior: "smooth" });
              }
            },
            600 + i * REVEAL_EVERY_MS + RESOLVE_AFTER_MS,
          ),
        );
      });
    } catch {
      if (id === runId.current) {
        setError("Lookup failed");
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run("Coinbase");
    const t = timers;
    return () => t.current.forEach(clearTimeout);
  }, [run]);

  const matchedIds = useMemo(() => {
    const s = new Set<string>();
    data?.results.forEach((r) => {
      if (resolved.includes(r.posting.id) && r.match.status === "verified" && r.match.matchedRole) {
        s.add(r.match.matchedRole.id);
      }
    });
    return s;
  }, [data, resolved]);

  const counts = useMemo(() => {
    const c = { verified: 0, unverified: 0, no_such_req: 0 };
    data?.results.forEach((r) => {
      if (resolved.includes(r.posting.id)) c[r.match.status]++;
    });
    return c;
  }, [data, resolved]);

  const providerLabel = data ? data.provider.toUpperCase() : "ATS";

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      <header className="flex flex-wrap items-center gap-4 border-b border-line px-8 py-4">
        <div className="font-mono text-xl font-semibold tracking-tight">
          <span className="text-accent">▸</span> REQ CHECK
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) run(input.trim());
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Company name"
            className="w-64 rounded border border-line bg-panel px-3 py-2 font-mono text-lg outline-none focus:border-accent"
            aria-label="Company name"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded border border-accent bg-accent/10 px-4 py-2 font-mono text-lg text-accent hover:bg-accent/20 disabled:opacity-50"
          >
            {loading ? "Looking up…" : "Verify"}
          </button>
        </form>
        <div className="ml-auto flex items-center gap-6 font-mono text-lg">
          <span className="text-ok">✓ {counts.verified}</span>
          <span className="text-warn">? {counts.unverified}</span>
          <span className="text-bad">✕ {counts.no_such_req}</span>
        </div>
      </header>

      {error && <div className="border-b border-bad/50 bg-bad/10 px-8 py-3 text-lg text-bad">{error}</div>}

      <main className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-line">
        {/* LEFT: claimed postings */}
        <section className="flex min-h-0 flex-col">
          <div className="border-b border-line px-8 py-3">
            <div className="text-base uppercase tracking-widest text-dim">Claimed postings</div>
            <div className="text-lg">
              “Hiring at {data?.company ?? input}” — found in the wild
              {data && <span className="font-mono text-dim"> · {data.results.length}</span>}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
            {data && data.results.length === 0 && (
              <div className="text-lg text-dim">No claimed postings on file for this company.</div>
            )}
            {data?.results
              .filter((r) => revealed.includes(r.posting.id))
              .map(({ posting, match }) => {
                const done = resolved.includes(posting.id);
                const state = done ? match.status : "checking";
                const clickable = done && match.status === "no_such_req";
                return (
                  <div
                    key={posting.id}
                    onClick={clickable ? () => setOpen({ posting, match }) : undefined}
                    className={`row-in relative overflow-hidden rounded border border-line border-l-4 p-4 ${STATE_STYLE[state]}`}
                  >
                    {!done && (
                      <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
                        <div className="scanbar h-full w-1/4 bg-accent" />
                      </div>
                    )}
                    <div className="font-mono text-lg font-medium leading-snug">{posting.title}</div>
                    <div className="mt-1 font-mono text-base text-dim">
                      {posting.location || "—"} · via {posting.source}
                    </div>
                    <div className="mt-2 font-mono text-base">
                      {!done && (
                        <span className="text-accent">
                          <span className="pulse-dot">●</span> checking against {providerLabel}…
                        </span>
                      )}
                      {done && match.status === "verified" && (
                        <span className="text-ok">
                          ✓ VERIFIED · req {match.matchedRole?.id} · {(match.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      {done && match.status === "unverified" && (
                        <span className="text-warn">
                          ? UNVERIFIED · closest: {match.closestRole?.title ?? "—"}
                        </span>
                      )}
                      {done && match.status === "no_such_req" && (
                        <span className="font-semibold text-bad">✕ NO SUCH REQ · click for case file</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* RIGHT: authoritative roles */}
        <section className="flex min-h-0 flex-col">
          <div className="border-b border-line px-8 py-3">
            <div className="text-base uppercase tracking-widest text-dim">
              Authoritative · {providerLabel}
              {data && <span className="font-mono normal-case"> · {data.token}</span>}
            </div>
            <div className="text-lg">
              {loading && <span className="text-accent">Fetching public job board…</span>}
              {data && (
                <>
                  <span className="font-mono">{data.roles.length}</span> open roles, straight from {data.company}
                  &apos;s own feed
                  <span className="font-mono text-dim">
                    {" "}
                    · {data.source === "live" ? "live" : "cached snapshot"}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-6">
            {data?.roles.map((role, i) => {
              const matched = matchedIds.has(role.id);
              return (
                <div
                  key={`${role.id}-${i}`}
                  ref={(el) => {
                    if (el) roleRefs.current.set(role.id, el);
                    else roleRefs.current.delete(role.id);
                  }}
                  className={`row-in rounded border-l-4 px-3 py-2 ${
                    matched ? "border-l-ok bg-ok/[0.08]" : "border-l-transparent bg-panel"
                  } ${flashRole === role.id ? "flash-ok" : ""}`}
                  style={{ animationDelay: `${Math.min(i, 20) * 25}ms` }}
                >
                  <div className="font-mono text-lg leading-snug">{role.title}</div>
                  <div className="font-mono text-base text-dim">
                    {role.location || "—"} · req {role.id}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {open && data && (
        <CaseFile
          company={data.company}
          provider={data.provider}
          token={data.token}
          totalRoles={data.roles.length}
          posting={open.posting}
          match={open.match}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
