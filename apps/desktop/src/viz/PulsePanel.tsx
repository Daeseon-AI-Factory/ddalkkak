//! Usage Pulse (ADR-005, docs/USAGE_PULSE.md) — the cross-startup "pulse, not telemetry"
//! dashboard. Six glanceable views, EACH with a plain-language caption beside it (locked
//! requirement: a non-engineer must never wonder what a number means). Honest units only:
//! output tokens / active days / counts — never a $.

import { useEffect, useState } from "react";
import { useT } from "../i18n";
import type { StringKey } from "../i18n/strings";
import { fetchPulse, type Pulse, type PulseStartup } from "../usagePulse";

type T = (k: StringKey) => string;

interface Startup {
  id: string;
  name: string;
  emoji: string;
}

const col = {
  text: "#e2e8f0",
  muted: "#94a3b8",
  dim: "#64748b",
  line: "#1e293b",
  card: "#111a2e",
  blue: "#60a5fa",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#f87171",
};

function fmt(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

function Section({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: col.card, border: `1px solid ${col.line}`, borderRadius: 10, padding: 14 }}>
      <div style={{ color: col.text, fontWeight: 600, fontSize: 14 }}>{title}</div>
      <div style={{ color: col.dim, fontSize: 11, marginTop: 2, marginBottom: 12, lineHeight: 1.45 }}>
        💬 {caption}
      </div>
      {children}
    </div>
  );
}

function Empty({ t }: { t: T }) {
  return <div style={{ color: col.dim, fontSize: 12 }}>{t("pulse.none")}</div>;
}

export function PulsePanel({ startups }: { startups: Startup[] }) {
  const { t } = useT();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchPulse().then(setPulse, (e) => setErr(String(e)));
  }, []);

  const nameFor = (id: string) =>
    id === "unassigned"
      ? { emoji: "•", name: t("pulse.unassigned") }
      : (startups.find((s) => s.id === id) ?? { emoji: "•", name: id.slice(-6) });

  const row = (id: string, right: React.ReactNode) => {
    const s = nameFor(id);
    return (
      <div
        key={id}
        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" }}
      >
        <span style={{ flexShrink: 0 }}>{s.emoji}</span>
        <span
          style={{
            color: col.text,
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {s.name}
        </span>
        {right}
      </div>
    );
  };

  if (err) return <div style={{ color: col.red, fontSize: 12 }}>{err}</div>;
  if (!pulse) return <div style={{ color: col.dim }}>{t("pulse.loading")}</div>;

  const S = pulse.startups;
  const has = (pred: (s: PulseStartup) => boolean) => S.filter(pred);

  // ── 1. Effort split ──────────────────────────────────────────────────────
  const effort = has((s) => s.output_week > 0);
  const maxOut = Math.max(1, ...effort.map((s) => s.output_week));

  // ── 2. Momentum ──────────────────────────────────────────────────────────
  const momentum = [...S].sort((a, b) => (b.days_since_active ?? 999) - (a.days_since_active ?? 999));

  // ── 3. Fan-out ───────────────────────────────────────────────────────────
  const fanout = has((s) => s.steps_baseline > 0);

  // ── 4. Explore vs produce ────────────────────────────────────────────────
  const mix = has((s) => s.tool_explore + s.tool_produce > 0);

  // ── 5. Friction ──────────────────────────────────────────────────────────
  const friction = has((s) => s.blocks_week > 0 || s.tool_errors_week > 0);

  // ── 6. Shipped vs thrash ─────────────────────────────────────────────────
  const shipped = has((s) => s.turns_week > 0 || s.commits_week > 0);

  const daysSince = (s: PulseStartup) =>
    s.days_since_active === null
      ? t("pulse.never")
      : s.days_since_active === 0
        ? t("pulse.today")
        : `${s.days_since_active}${t("pulse.daysAgo")}`;

  return (
    <div>
      <div style={{ color: col.dim, fontSize: 11, marginBottom: 12 }}>
        {t("pulse.asOf")} {pulse.generated_day} · {t("pulse.last7")} · {t("pulse.note")}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 14,
        }}
      >
        {/* 1. Effort split */}
        <Section title={`📊 ${t("pulse.effort")}`} caption={t("pulse.cap.effort")}>
          {effort.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {effort.map((s) =>
                row(
                  s.startup_id,
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        width: 120,
                        height: 8,
                        background: "#0b1220",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          height: "100%",
                          width: `${(s.output_week / maxOut) * 100}%`,
                          background: col.blue,
                        }}
                      />
                    </span>
                    <b style={{ color: col.text, width: 52, textAlign: "right" }}>
                      {fmt(s.output_week)}
                    </b>
                  </span>,
                ),
              )}
            </div>
          )}
        </Section>

        {/* 2. Momentum */}
        <Section title={`🫀 ${t("pulse.momentum")}`} caption={t("pulse.cap.momentum")}>
          {momentum.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {momentum.map((s) => {
                const stale = (s.days_since_active ?? 99) >= 7 || s.active_days_14 === 0;
                return row(
                  s.startup_id,
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ display: "flex", gap: 2 }}>
                      {s.daily.map((d) => (
                        <span
                          key={d.day}
                          title={d.day}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 1,
                            background: d.active ? col.green : "#1e293b",
                          }}
                        />
                      ))}
                    </span>
                    <span style={{ color: stale ? col.amber : col.muted, width: 72, textAlign: "right" }}>
                      {stale ? "⚠️ " : ""}
                      {daysSince(s)}
                    </span>
                  </span>,
                );
              })}
            </div>
          )}
        </Section>

        {/* 3. Fan-out */}
        <Section title={`🌿 ${t("pulse.fanout")}`} caption={t("pulse.cap.fanout")}>
          {fanout.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {fanout.map((s) => {
                const up = s.steps_recent > s.steps_baseline * 1.25;
                return row(
                  s.startup_id,
                  <span style={{ flexShrink: 0, color: col.muted }}>
                    <b style={{ color: up ? col.amber : col.text }}>{s.steps_recent}</b>{" "}
                    {t("pulse.stepsPerTurn")} {up ? "↑" : ""}
                    <span style={{ color: col.dim }}>
                      {" "}
                      ({t("pulse.baseline")} {s.steps_baseline})
                    </span>
                  </span>,
                );
              })}
            </div>
          )}
        </Section>

        {/* 4. Explore vs produce */}
        <Section title={`🔍 ${t("pulse.mix")}`} caption={t("pulse.cap.mix")}>
          {mix.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {mix.map((s) => {
                const total = s.tool_explore + s.tool_produce || 1;
                const ex = Math.round((s.tool_explore / total) * 100);
                return row(
                  s.startup_id,
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span
                      style={{
                        display: "flex",
                        width: 120,
                        height: 8,
                        borderRadius: 4,
                        overflow: "hidden",
                        background: "#0b1220",
                      }}
                    >
                      <span style={{ width: `${ex}%`, background: col.amber }} />
                      <span style={{ width: `${100 - ex}%`, background: col.green }} />
                    </span>
                    <span style={{ color: col.dim, width: 92, textAlign: "right", fontSize: 11 }}>
                      <span style={{ color: col.amber }}>{ex}% {t("pulse.explore")}</span>
                    </span>
                  </span>,
                );
              })}
            </div>
          )}
        </Section>

        {/* 5. Friction */}
        <Section title={`⛔ ${t("pulse.friction")}`} caption={t("pulse.cap.friction")}>
          {friction.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {friction.map((s) =>
                row(
                  s.startup_id,
                  <span style={{ flexShrink: 0, color: col.muted, fontSize: 11.5 }}>
                    <b style={{ color: col.text }}>{s.blocks_week}×</b> {t("pulse.waitedYou")}
                    {s.tool_errors_week > 0 && (
                      <span style={{ color: col.red }}>
                        {" · "}
                        {s.tool_errors_week} {t("pulse.toolErrors")}
                      </span>
                    )}
                  </span>,
                ),
              )}
              {pulse.block_history_since && (
                <div style={{ color: col.dim, fontSize: 10.5, marginTop: 4 }}>
                  ⓘ {t("pulse.blockSince")} {pulse.block_history_since}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* 6. Shipped vs thrash */}
        <Section title={`🚢 ${t("pulse.shipped")}`} caption={t("pulse.cap.shipped")}>
          {shipped.length === 0 ? (
            <Empty t={t} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {shipped.map((s) => {
                const thrash = s.turns_week > 0 && s.commits_week === 0;
                return row(
                  s.startup_id,
                  <span style={{ flexShrink: 0, color: col.muted }}>
                    <b style={{ color: col.text }}>{s.turns_week}</b> {t("pulse.asks")} →{" "}
                    <b style={{ color: thrash ? col.amber : col.green }}>{s.commits_week}</b>{" "}
                    {t("pulse.commits")} {thrash ? "⚠️" : ""}
                  </span>,
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
