# AI Code Review Benchmark — open data

The numbers behind [ionwarp.com/benchmarks](https://ionwarp.com/benchmarks), as CSV and JSON.
They show how AI code reviewers do on real, public pull requests whose issues are known in
advance. Two kinds of reviewer are measured:

- **review apps**: Qodo v2, Greptile v4.1, Cursor Bugbot and CodeRabbit;
- **IonWarp reviewers** running on different LLMs: DeepSeek, GLM, Muse Spark, GPT, Gemini and Grok.

**Snapshot:** fetched **2026-10-05** from the public API at `https://ionwarp.com/benchmarks/v1`.
Each family's release was captured between 2026-09-21 and 2026-09-25 (see
[`data/manifest.json`](data/manifest.json)). Run `node scripts/fetch.mjs` to refresh.

## What is measured

For each reviewer and pull request, the benchmark records three things:

- whether the review caught the issues known to be in the PR (the *expected issues*);
- how long the review took;
- what one review cost.

| Family | PRs | Expected issues | Ranking allowed | Release captured | Rows | Files |
|---|---:|---:|:---:|---|---:|---|
| Code Review | 50 | 158 | **yes** | 2026-09-25 | 9 | [csv](data/code-review.csv) · [cases](data/code-review.cases.csv) · [json](data/code-review.json) |
| Security Review | 13 | 18 | no | 2026-09-25 | 11 | [csv](data/security-review.csv) · [cases](data/security-review.cases.csv) · [json](data/security-review.json) |
| AI Architecture Review | 11 | 6 | no | 2026-09-25 | 12 | [csv](data/ai-architecture.csv) · [cases](data/ai-architecture.cases.csv) · [json](data/ai-architecture.json) |
| Log & Errors Review | 17 | 31 | no | 2026-09-25 | 9 | [csv](data/log-coverage.csv) · [cases](data/log-coverage.cases.csv) · [json](data/log-coverage.json) |
| Docs Review | 19 | 17 | no | 2026-09-23 | 7 | [csv](data/docs-freshness.csv) · [cases](data/docs-freshness.cases.csv) · [json](data/docs-freshness.json) |
| API Performance Review | 18 | 13 | no | 2026-09-24 | 10 | [csv](data/performance-review.csv) · [cases](data/performance-review.cases.csv) · [json](data/performance-review.json) |
| SOC 2 Review | 20 | 15 | no | 2026-09-24 | 5 | [csv](data/soc2-review.csv) · [cases](data/soc2-review.cases.csv) · [json](data/soc2-review.json) |
| CI/CD Performance | 18 | 13 | no | 2026-09-21 | 5 | [csv](data/cicd-performance.csv) · [cases](data/cicd-performance.cases.csv) · [json](data/cicd-performance.json) |
| Cost Review | 20 | 14 | no | 2026-09-24 | 3 | [csv](data/cost-review.csv) · [cases](data/cost-review.cases.csv) · [json](data/cost-review.json) |

**Code Review** uses the 50-PR Core set of Martian's open
[code-review-bench](https://github.com/withmartian/code-review-benchmark/tree/e616e849755441da38f18bf3adba2c9583b03803).
It is graded with Martian's protocol and a Claude Opus 4.5 judge. It is the only family the site
publishes as a ranking (`ranking_allowed: true`).

**The specialist families** use 11–20 public PRs each, with labels scoped to the specialist's
category and an adapted judge. Each one is in `methodology_review` with named blockers, listed
in `publication.blockers` in its JSON:

- disputed or operator-written labels;
- scope that has not been independently adjudicated;
- generalist output re-scored.

Read their tables as provisional sort orders, not rankings. SOC 2, CI/CD Performance and Cost
measure IonWarp models only; the four apps were not run on them (`not_measured` in the JSON).
The Cost table holds only PRs from public repositories.

## Metrics

| Metric | Meaning |
|---|---|
| `precision`, `recall`, `f1`, `f2` | Matching between the review's findings and the expected issues. Precision is golden-issue *matching* precision, not independently adjudicated finding correctness. F2 weights recall twice and is what Martian's own leaderboard sorts on; the tables here sort on F1 and Score. |
| `latency_p50_s`, `latency_p90_s` | IonWarp rows: reviewer invocation to final output, run locally (no hosted queue, no GitHub delivery). App rows: hosted review trigger to the last review comment. |
| `cost_per_review_usd` + `cost_basis` | `settled_inference_charges`: the model provider's settled charges ÷ billed reviews, retries included. This is what the LLM calls cost, **not** an IonWarp plan price. `app_list_price_estimate`: the app's list price ÷ reviews per month at 5 seats and 100 reviews a month. Prices were checked 2026-09-08; sources are in each JSON. |
| `score` | Reviewer Score = (3 × F1 + latency + cost) ÷ 5. Each part is the row's place between the worst (0) and best (100) full-cohort row **in the same family**. Higher F1, lower latency and lower cost score higher. `score_*_part` holds the three parts. |
| `order_by_score`, `order_by_f1` | Sort position within the family. It is a ranking claim only where `ranking_allowed` is `true` (Code Review). |

### F1 versus Score

- **F1** is accuracy only.
- **Score** trades accuracy against speed and cost, and it is peer-relative: adding or removing a row moves every other row's Score.

On Code Review, Qodo v2 has the highest F1 (0.585). The Muse Spark 1.3 configuration has the
highest Score (73.1):
- its F1 is second (0.566);
- its p50 latency is lower (198 s against 340 s);
- its cost figure is lower ($0.42 of inference against Qodo's $1.67 list-price estimate; the two
  figures have different bases, see `cost_basis`).

## Where IonWarp's production configuration lands

Each IonWarp reviewer runs on a pinned model and reasoning effort, with a retry configuration
behind it. Each JSON names both under `production_pin`. In the CSVs:

- `ionwarp_role = runs` is the row whose model **and** effort match the pin;
- `ionwarp_role = retry` is the row that matches the retry configuration.

**Code Review (ranked):**
- The production pin, DeepSeek V4.1 Flash (medium), is **8th of 9 by Score** (29.7) and **6th of 9 by F1** (0.467).
- Its retry configuration, Muse Spark 1.3, is 1st by Score (73.1) and 2nd by F1 (0.566).
- Qodo v2 has the highest F1 (0.585).

**Specialist families (provisional sort order, not a ranking):**

| Family | Production pin | By Score | By F1 | Highest F1 in the table |
|---|---|---|---|---|
| Security Review | DeepSeek V4.1 Flash | 2nd of 11 (63.4) | 3rd of 11 (0.625) | Qodo v2 (0.733) |
| AI Architecture Review | DeepSeek V4.1 Flash | 6th of 12 (47.8) | 4th–5th of 12, tied (0.471) | CodeRabbit (0.727) |
| Log & Errors Review | DeepSeek V4.1 Flash | 3rd of 9 (57.0) | 6th of 9 (0.590) | Qodo v2 (0.727) |
| SOC 2 Review | DeepSeek V4.1 Flash | 3rd of 5 (68.6) | 1st–2nd of 5, tied (0.667) | IonWarp models only |
| CI/CD Performance | DeepSeek V4.1 Flash | 3rd of 5 (51.2) | 2nd of 5 (0.595) | IonWarp models only |
| Docs Review | DeepSeek V4.1 Flash | not measured in this snapshot | — | Gemini 3.8 Flash (0.686) |
| API Performance Review | GLM 5.3 Flash (medium) | not measured at the pinned effort (the GLM 5.3 Flash row ran at low effort) | — | Greptile v4.1 (0.769) |
| Cost Review | GLM 5.3 Flash (medium) | not measured at the pinned effort (the GLM 5.3 Flash row ran at low effort) | — | IonWarp models only |

Every family also carries the site's notice that the reviewer prompt measured has since
changed in production. The dates are in `notices`.

## Caveats (the site's own, in every JSON under `warnings`)

- One trial per configuration and PR: an exploratory comparison.
- "Competitor outputs are historical; fresh IonWarp runs use the same PR heads and new semantic grading."
  The app reviews date from January–April 2026; the IonWarp runs from September 2026.
- Some PRs were not started for some rows. They are listed in `*.cases.csv` with `status = not_started` (Docs 32, API Performance 24) and are excluded from that row's metrics.

## Files

- `data/manifest.json`: fetch time, and one entry per family (release id, capture time, row counts).
- `data/<family>.csv`: one row per reviewer configuration.
- `data/<family>.cases.csv`: one row per configuration × PR. Columns: expected issues, issues caught, seconds, the PR link, and for apps the link to the public review the app left.
- `data/<family>.json`: both of the above, plus release metadata, publication status and blockers, the judge, the Score definition, the cost scenario, the production pin, and the site's warnings.

Every PR is in a public open-source repository; links point at the original PR. App review
links point at the public mirror PRs the benchmark corpus keeps under
[github.com/code-review-benchmark](https://github.com/code-review-benchmark).

## Refresh

```sh
node scripts/fetch.mjs   # Node 18+, no credentials; rewrites data/
```

## Cite

```bibtex
@misc{ionwarp_ai_code_review_benchmark_2026,
  title  = {AI Code Review Benchmark (open data), snapshot 2026-10-05},
  author = {{Winding Labs}},
  year   = {2026},
  url    = {https://github.com/Winding-Labs/ai-code-review-benchmark},
  note   = {Data from https://ionwarp.com/benchmarks; Code Review corpus: Martian code-review-bench (MIT)}
}
```

## Links

- Live tables, per-PR evidence and methodology: <https://ionwarp.com/benchmarks>
- Which model reviews code well, written up from this data: <https://ionwarp.com/for/best-llm-for-code-review>
- AI code review tools compared: <https://ionwarp.com/for/ai-code-review-tools>
- Method: [METHODOLOGY.md](METHODOLOGY.md)

## License

Data and documentation are licensed [CC BY 4.0](LICENSE); `scripts/` is MIT. The Code Review PR set
and its expected issues come from Martian's code-review-bench (MIT). Product names and marks
belong to their owners. Including a product is not an endorsement.
