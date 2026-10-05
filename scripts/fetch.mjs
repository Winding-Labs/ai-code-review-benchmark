#!/usr/bin/env node
// SPDX-License-Identifier: MIT — Copyright (c) 2026 Winding Labs
// Regenerates data/ from the public IonWarp benchmarks API (no credentials).
//   node scripts/fetch.mjs            # writes data/*.csv, data/*.json, data/manifest.json
//   BENCH_ORIGIN=https://ionwarp.com node scripts/fetch.mjs
// Every value comes from a public read under /benchmarks/v1; nothing is computed
// except ranks (sorted from the served Score and F1) and the CSV flattening.
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.BENCH_ORIGIN ?? "https://ionwarp.com";
const API = `${ORIGIN}/benchmarks/v1`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data");

async function get(path) {
  const res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join(" ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};
const toCsv = (rows, cols) =>
  [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n";
const round = (v, d = 4) => (typeof v === "number" ? Number(v.toFixed(d)) : null);

/** "runs" = the configuration IonWarp is pinned to in production for this reviewer
 * (model AND reasoning effort must match), "retry" = its retry configuration. */
function role(row, pin) {
  if (!pin || row.kind !== "ionwarp") return "";
  if (row.model === pin.model && row.effort === pin.reasoning_effort) return "runs";
  if (pin.retry && row.model === pin.retry.model && row.effort === pin.retry.reasoning_effort)
    return "retry";
  return "";
}

function rank(rows, key) {
  const scored = rows.filter((r) => typeof r[key] === "number").sort((a, b) => b[key] - a[key]);
  return new Map(scored.map((r, i) => [r, i + 1]));
}

const ROW_COLS = [
  "family", "snapshot_id", "ranking_allowed", "order_by_score", "order_by_f1", "reviewer", "kind", "model", "developer",
  "effort", "ionwarp_role", "score", "score_f1_part", "score_latency_part", "score_cost_part", "f1",
  "f2", "precision", "recall", "matched", "unmatched", "missed", "expected_issues", "prs_graded",
  "prs_in_cohort", "latency_p50_s", "latency_p90_s", "cost_per_review_usd", "cost_basis",
  "measured_dates",
];
const CASE_COLS = [
  "family", "reviewer", "case_id", "repository", "pr_number", "pr_url", "status",
  "expected_issues", "caught", "seconds", "review_url",
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const fetchedAt = new Date().toISOString();
  const { families } = await get("/families");
  const manifest = { source: `${API}`, fetched_at: fetchedAt, families: [] };

  for (const [key, fam] of Object.entries(families)) {
    const m = await get(`/reviewers/${encodeURIComponent(fam.family.id)}/metrics`);
    const pin = m.configured_pin ?? null;
    const measured = m.rows.filter((r) => typeof r.f1 === "number");
    const byScore = rank(measured, "composite");
    const byF1 = rank(measured, "f1");
    const rows = measured.map((r) => {
      const f1p = r.popovers?.f1 ?? {};
      const cost = r.popovers?.cost ?? {};
      const parts = r.popovers?.score?.parts ?? {};
      return {
        family: key,
        snapshot_id: m.snapshot.id,
        ranking_allowed: m.publication?.ranking_allowed ?? false,
        order_by_score: byScore.get(r) ?? null,
        order_by_f1: byF1.get(r) ?? null,
        reviewer: r.label ?? r.name,
        kind: r.kind === "competitor" ? "app" : "ionwarp_model",
        model: r.model ?? null,
        developer: r.developer ?? null,
        effort: r.effort ?? null,
        ionwarp_role: role(r, pin),
        score: r.composite ?? null,
        score_f1_part: parts.f1 ?? null,
        score_latency_part: parts.latency ?? null,
        score_cost_part: parts.cost ?? null,
        f1: round(r.f1),
        f2: round(r.f2 ?? f1p.f2),
        precision: round(r.precision),
        recall: round(r.recall),
        matched: r.tp ?? null,
        unmatched: r.fp ?? null,
        missed: r.fn ?? null,
        expected_issues: r.expected ?? null,
        prs_graded: r.coverage?.graded ?? null,
        prs_in_cohort: f1p.cohort_of ?? m.case_count ?? null,
        latency_p50_s: round(r.latency_p50_seconds ?? r.display_latency_seconds, 1),
        latency_p90_s: round(r.latency_p90_seconds, 1),
        cost_per_review_usd: round(r.chart_cost, 4),
        cost_basis:
          r.chart_cost == null ? "" : cost.estimate ? "app_list_price_estimate" : "settled_inference_charges",
        measured_dates: r.run_dates ?? [],
        _cases: (r.popovers?.prs?.cases ?? []).map((c) => ({
          family: key,
          reviewer: r.label ?? r.name,
          case_id: c.case_id,
          repository: c.repository,
          pr_number: c.number,
          pr_url: c.url,
          status: c.status,
          expected_issues: c.expected,
          caught: c.caught,
          seconds: c.seconds ?? null,
          review_url: c.review_url ?? null,
        })),
      };
    });
    rows.sort((a, b) => (a.order_by_score ?? 99) - (b.order_by_score ?? 99) || (a.order_by_f1 ?? 99) - (b.order_by_f1 ?? 99));
    const cases = rows.flatMap((r) => r._cases);
    const summary = rows.map(({ _cases, ...rest }) => rest);
    const doc = {
      family: key,
      reviewer_id: fam.family.id,
      name: fam.family.name,
      page: `${ORIGIN}/benchmarks/${fam.family.agent}`,
      snapshot: {
        id: m.snapshot.id,
        captured_at: m.snapshot.captured_at,
        status: m.snapshot.status,
        protocol: m.publication?.protocol ?? m.snapshot.protocol,
        source_dataset: m.snapshot.source_revision_url ?? m.snapshot.source_url ?? null,
      },
      publication: {
        status: m.publication?.status ?? null,
        label: m.publication?.label ?? null,
        ranking_allowed: m.publication?.ranking_allowed ?? false,
        blockers: m.publication?.blockers ?? [],
        methodology_url: m.publication?.methodology_url ?? null,
      },
      judge: m.judge ?? null,
      scope: m.scope ?? null,
      case_count: m.case_count,
      issue_count: m.issue_count,
      score_definition: m.score_definition ?? null,
      ranking_basis: m.ranking_basis ?? null,
      cost_scenario: m.scenario ?? null,
      production_pin: pin
        ? {
            model: pin.model,
            reasoning_effort: pin.reasoning_effort,
            retry: pin.retry ? { model: pin.retry.model, reasoning_effort: pin.retry.reasoning_effort } : null,
            measured_row: summary.find((r) => r.ionwarp_role === "runs")?.reviewer ?? null,
          }
        : null,
      warnings: m.warnings ?? [],
      notices: m.notices ?? [],
      not_measured: m.rows.filter((r) => typeof r.f1 !== "number").map((r) => r.label ?? r.name),
      rows: summary,
      cases,
    };
    await writeFile(join(OUT, `${key}.json`), JSON.stringify(doc, null, 2) + "\n");
    await writeFile(join(OUT, `${key}.csv`), toCsv(summary, ROW_COLS));
    await writeFile(join(OUT, `${key}.cases.csv`), toCsv(cases, CASE_COLS));
    manifest.families.push({
      family: key,
      name: fam.family.name,
      snapshot_id: m.snapshot.id,
      captured_at: m.snapshot.captured_at,
      ranking_allowed: doc.publication.ranking_allowed,
      prs: m.case_count,
      rows: summary.length,
      case_rows: cases.length,
    });
    console.log(`${key}: ${summary.length} rows, ${cases.length} case rows (${m.snapshot.id})`);
  }
  await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
