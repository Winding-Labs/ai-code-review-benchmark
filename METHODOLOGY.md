# Methodology

This summarizes the method the published numbers were produced with. The authoritative,
per-row evidence is on [ionwarp.com/benchmarks](https://ionwarp.com/benchmarks): every PR, the
expected issues, and what each reviewer said. Each family's JSON here carries the release id,
protocol, judge, publication status and the site's own warnings verbatim.

## Corpus

- **Code Review**:
  - the 50 PRs of the Core set of Martian's code-review-bench, pinned at revision
    [`e616e849`](https://github.com/withmartian/code-review-benchmark/tree/e616e849755441da38f18bf3adba2c9583b03803)
    (MIT);
  - the PRs come from cal.com, Discourse, Grafana, Keycloak and Sentry;
  - the corpus's expected issues (158) are the answer key;
  - the protocol is `martian-core-e616e849-v1`;
  - status `pinned_method_reproduction`, the only family where the site allows a ranking.
- **Specialist families** (Security, AI Architecture, Log & Errors, Docs, API Performance,
  SOC 2, CI/CD Performance, Cost):
  - 11–20 public PRs each, from open-source repositories, with expected issues scoped to the
    specialist's category;
  - some sets reuse Code Review PRs with category-scoped labels; others were found by searching
    for the lens's own defect classes, with labels written by one rater and admitted by a second
    (see each family's `notices`);
  - status `methodology_review`, with the blockers named in `publication.blockers`.
- **Only public repositories are served.** PRs from a private repository are not part of any
  public table, and the numbers are computed on the PRs a reader can open.

## Reviewers

- **Apps** (Qodo v2, Greptile v4.1, Cursor Bugbot, CodeRabbit):
  - their historical reviews of the same PR heads, January–April 2026;
  - kept as public mirror PRs under [code-review-benchmark](https://github.com/code-review-benchmark);
  - latency runs from the hosted review trigger to the last review comment.
- **IonWarp reviewers**:
  - the product's reviewer prompt for each family, run locally on each model listed, September 2026;
  - one trial per configuration and PR;
  - latency runs from reviewer invocation to final output, including tool calls and provider waits;
  - there is no hosted queue or GitHub delivery time in the measurement.
- Each IonWarp reviewer's production configuration (model + reasoning effort, plus a retry
  configuration) is named under `production_pin`. Each family's `notices` gives the date of the
  reviewer prompt that was measured; production has changed the prompt since.

## Grading

- A judge model (Claude Opus 4.5) matches each review's findings to the expected issues.
  - Code Review uses Martian's matching.
  - Specialist families use a category-scoped adaptation of it.
- `matched` is expected issues caught, `missed` is expected issues not caught, and `unmatched`
  is findings that match no expected issue.
- Precision = matched ÷ (matched + unmatched). This is golden-issue *matching* precision. An
  unmatched finding is not necessarily wrong; nobody independently adjudicated it.
- Recall = distinct expected issues caught ÷ expected issues in the graded PRs.
- F1 is the harmonic mean of precision and recall. F2 weights recall twice.
- A PR a configuration never started is listed with `status = not_started` and excluded from
  that row's metrics.

## Cost

- **IonWarp rows:** settled provider charges for the LLM calls ÷ billed review jobs on the
  row's PRs, retries included (`settled_inference_charges`). This is the inference cost of one
  review, not an IonWarp plan price.
- **App rows:** the app's published list price ÷ reviews per month in a fixed scenario
  (`app_list_price_estimate`):
  - the scenario is 5 seats, 100 reviews a month, billed monthly;
  - prices were checked 2026-09-08;
  - each JSON's `cost_scenario` and the site record the source pages.

## Reviewer Score

```
Score = (3 × F1 + latency + cost) ÷ 5
```

- Each part is the row's position between the worst (0) and the best (100) full-cohort row in
  the same family.
- Higher F1, lower p50 latency and lower cost per review score higher.
- A row is scored once F1, latency and cost are all measured and at least three rows are.
- Score is peer-relative. It compares rows within one family's table at one snapshot, and it
  changes when a row is added or removed. F1 alone is the accuracy figure.

## Limits

- One trial per configuration and PR: an exploratory comparison, not a significance test.
- Small specialist sets (6–31 expected issues): one PR can move F1 by several points.
- App outputs are historical, while IonWarp rows are fresh runs.
- Expected-issue matching rewards finding the labelled issues. A review that finds a real,
  unlabelled issue scores it as unmatched.
