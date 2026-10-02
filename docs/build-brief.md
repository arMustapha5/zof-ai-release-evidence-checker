# Release Evidence Checker: build brief

A record of what was built, how it fits together, and what was checked, so we can then go through the code file by file.

- **Project folder:** `~/Desktop/Abdul_Mustapha_Software_Engineer`
- **Source of truth:** `~/Desktop/Zof_AI_Software_Engineer_Challenge/Candidate_Brief.txt` and `sample-release.json`
- **Status:** complete. 18 of 18 automated tests pass. No extra requirement was issued.

---

## 1. What the app does

A local web page that reads a JSON release report, shows every check, and says whether the release is **READY** or **BLOCKED**, explaining why.

- Input: paste JSON into a text box, or upload a `.json` file.
- Output:
  - a big READY/BLOCKED banner with summary counts;
  - the release name;
  - blocking reasons, warnings and invalid-data problems as separate cards;
  - a table of every check with a highlighted outcome.
- Technology: plain HTML, CSS and vanilla JavaScript.
  - No framework, build step or `npm`.
  - No network calls and no ES modules, so it opens straight from `file://`.

---

## 2. How we got here (in order)

1. **Found the inputs.** macOS blocked access to `~/Downloads`, so the exercise folder was copied to the Desktop and the deliverable was built there.
2. **Confirmed the data contract** from the brief before writing any code:
   - fields: `release`, `checks[]`, and on each check `id`, `name`, `required`, `status`, `evidence`;
   - statuses: exactly `passed`, `failed`, `not_run`.
3. **`validation.js`:** all the readiness rules, as one pure function.
4. **Tests:** first 9 required tests, later extended to 18.
5. **UI:** `index.html` and `app.js`, with `clearResults()` run first on every validation.
6. **Checked the sample:** BLOCKED for `payments` (failed) and `audit` (blank evidence), with `copy` only a warning, exactly as the brief predicts.
7. **Fixtures and README.**
8. **Styling:** first a clean two-column layout, then a richer theme (gradient backdrop, frosted cards, glowing banner).
9. **Enhancements**, each marked `Enhancement:` in the code:
   - per-check outcome and row highlight;
   - exact test assertions;
   - summary counts in the banner;
   - screen-reader announcement;
   - automated malformed-JSON tests (rule 1 moved into `parsing.js`).
10. **Comments** throughout, explaining *why* rather than restating the code.
11. **Demo reports:** 11 realistic reports covering every rule, plus a suggested demo order.
12. **Tools:** IntelliJ IDEA installed to browse the code.

---

## 3. File map

| File | Lines | Role | Touches the page? |
|------|------:|------|:-:|
| `validation.js` | ~350 | **The rules.** `validateRelease(object)` decides READY or BLOCKED (rules 2–5) | No |
| `parsing.js` | ~45 | **Rule 1.** `checkReportText(text)` turns text into a result; malformed JSON is BLOCKED, valid JSON goes to `validateRelease` | No |
| `app.js` | ~230 | **Wiring only.** Reads the text box or uploaded file, calls `checkReportText`, draws the result | Yes |
| `index.html` | ~475 | Page layout plus all CSS | — |
| `tests.js` | ~385 | 18 test cases plus a tiny runner (`runTestCases`) | No |
| `tests.html` | ~75 | Loads the logic and tests, prints a PASS/FAIL table | Yes |
| `sample-release.json` | — | Supplied sample, byte-for-byte unchanged | — |
| `fixtures/` | 12 files | One JSON file per test input | — |
| `demo-reports/` | 11 files | Realistic reports for the live demo | — |
| `README.md` | ~170 | Launch steps, logic, tests, assumptions, limitations, AI use, enhancements | — |

**Why it's split this way:** the decision logic (`validation.js`, `parsing.js`) never touches the page. That means:

- the same files run in the app *and* in the tests;
- the readiness logic can be explained on its own;
- a new rule is added in one place without touching the UI.

---

## 4. How a click becomes a result

```
[Validate button]
      │
app.js  handleValidate()
      │  1. clearResults()            ← wipe ALL old output first (no stale READY)
      │  2. checkReportText(text)     ← parsing.js
      │        ├─ blank text?          → BLOCKED "The input is empty…"
      │        ├─ JSON.parse fails?    → BLOCKED "The input is not valid JSON: …"   (rule 1)
      │        └─ parsed OK            → validateRelease(object)                      (validation.js)
      │                                      runs BLOCKING_RULES in order, stops at first objection
      │  3. renderResult(result)      ← banner + counts, lists, table, screen-reader announcement
      └─ try/catch safety net         ← unexpected error → plain message, page stays usable
```

The file upload only fills the text box. You still press Validate, so there is exactly one path into the logic.

---

## 5. The readiness rules (precedence order; first match wins)

| # | Rule | Where | Result |
|---|------|-------|--------|
| 1 | Malformed or empty JSON | `parsing.js` → `checkReportText` | BLOCKED, with the parse error |
| 2 | Invalid data anywhere, **including optional checks** | `validation.js` → `ruleInvalidData` | BLOCKED, with every problem listed |
| 3 | No required check (empty report, or only optional checks) | `ruleAtLeastOneRequiredCheck` | BLOCKED |
| 4 | A required check not `passed`, or with blank evidence | `ruleRequiredChecksPassWithEvidence` | BLOCKED, one reason per check |
| 5 | None of the above | `evaluate` | READY, with warnings for optional problems |

Rules 2–4 are the `BLOCKING_RULES` list. To add a rule, write one function and slot it into that list at its place in the order.

**What counts as invalid data:**

- the root is not an object;
- `release` is missing or blank;
- `checks` is not an array;
- a check is not an object;
- `id` or `name` is missing, not a string, or blank;
- `required` is not a real boolean (`"true"` is invalid);
- `status` is not exactly `passed`, `failed` or `not_run`;
- `evidence` is present but not a string;
- a check id is used more than once.

**Blank evidence** means missing, `""`, or whitespace-only.

- On a required check, it blocks.
- On an optional check, it only produces a warning.

**Warnings** come from optional checks that failed, didn't run, or have blank evidence. They are shown even when rule 3 or 4 blocks the report, as in the sample, but not when the data is invalid.

**Per-check outcome:** each table row gets `ok`, `blocking`, `warning` or `invalid`.

- `decideCheckOutcome` in `validation.js` decides it.
- It uses the same helper as rule 4 and the warnings (`findReadinessProblems`), so the table always agrees with the lists.

---

## 6. Tests

- **Run:** open `tests.html`. It should say **18 of 18 tests passed**.
- **Strict:** each test lists the *complete, exact* expected blocking reasons, warnings, invalid-data messages and row outcomes, and compares them line for line.
  - The exception is malformed JSON, where only the start of the message is checked ("The input is not valid JSON:"), because the rest is the browser's own wording.
- **Mutation-checked:** deliberately wrong expectations (a reworded message, a wrong outcome, valid JSON given to a malformed test) each made their test fail, which proves the tests can catch mistakes.

| Tests | Cover |
|-------|-------|
| 1, 7, 18 | READY: all pass; READY with warnings; text end to end |
| 2, 3 | Required check failed; required evidence whitespace-only |
| 4, 5 | Only optional checks; empty checks array |
| 6 | Invalid data in an **optional** check still blocks |
| 8, 9, 11, 12, 13, 17 | Duplicate ids; `"true"` string; root not an object; several problems; six problems at once; `null` |
| 10 | The supplied sample |
| 14, 15, 16 | Malformed JSON; not JSON at all; empty input |
| M1 (manual) | READY followed by malformed: the old READY disappears (needs the real page) |

---

## 7. Assumptions (also in the README)

- Field names and statuses are taken from the brief; status matching is case-sensitive (`"PASSED"` is invalid).
- The release name is required (the brief says "nonblank release string").
- Duplicate ids are invalid data, compared exactly (case-sensitive, not trimmed).
- Blank evidence on an optional check is only a warning.
- Empty input is treated as malformed (rule 1).
- Evidence is **only a reference string**: it is never fetched or verified. The table column says so.

---

## 8. Where this differs from the original build prompt

| Prompt said | What we did | Why |
|-------------|-------------|-----|
| Build in `~/Downloads/...` | Built in `~/Desktop/...` | macOS blocked access to Downloads. The interviewer's email only asks for a correctly named folder |
| Parsing happens in `app.js` | Parsing is in `parsing.js` | So malformed JSON can have automated tests; still kept out of `validation.js` |
| Exact 7-item file layout | Added `parsing.js` and `demo-reports/` | Testability and a smoother demo |
| Minimal CSS | Richer styling | Requested during the session; logic and tests unaffected |

---

## 9. What was verified (by the assistant)

- All 18 tests pass in Node.js, and in headless Chrome opening `tests.html` from `file://` and from `python3 -m http.server`.
- The UI was driven in headless Chrome through long runs of validations without reloading, for example:
  - sample → READY → malformed → warnings → empty → invalid optional → not JSON → Clear.
  - Every step showed the correct banner, and no earlier result ever stayed on screen.
- Screenshots were reviewed for the sample, READY, invalid data, empty state and narrow screens.
- No `console.log`, `fetch`, storage, modules or external URLs in the code.
- `sample-release.json` is identical to the original.
- The file-upload control was driven in real Chrome via its remote-debugging interface: sample → READY report → malformed. Each upload filled the text box and cleared the old result, and Validate gave the right answer.
- Large input: about 20 ms for 5,000 checks and about 64 ms for 20,000 (validate and draw the table). The README lists "no large-input guard" as unfinished.

**Not yet verified, so do these yourself before the demo:**

- [ ] Use **Choose File** to upload `sample-release.json` once and check the result. The assistant checked upload in Chrome through its remote-debugging interface, but `tests.html` has no automated test for it, and you should see it work yourself.
- [ ] Write README section **6. What I verified myself** in your own words.
- [ ] Practise the demo order from the README: sample → `demo-reports/01` → `10` (malformed) → `02` → `07` → `08` → `05`/`06`.

---

## 10. Suggested order for learning the code

1. **`validation.js`**: the heart of the app; you'll be asked about it.
   - Start at `evaluate` and `BLOCKING_RULES`.
   - Then read the three rule functions.
   - Then `findInvalidData` / `findCheckFieldProblems`.
   - Then `findReadinessProblems` and `decideCheckOutcome`.
   - The helpers last.
2. **`parsing.js`**: short; it's rule 1 and the bridge into `validateRelease`.
3. **`app.js`**: start at `handleValidate` (the click), then `clearResults`, `renderResult`, and the small render helpers.
4. **`tests.js`**: one test case (test 6 is a good one to explain), then `compare` / `runTestCases`.
5. **`index.html`**: the markup at the bottom first (element IDs that `app.js` uses), then skim the CSS.
6. **`tests.html`**: how results are printed.

**Likely demo questions** to prepare for:

- "Why does invalid data in an optional check block?"
- "Where would you add a new rule?" (`BLOCKING_RULES`)
- "How do you guarantee no stale READY?" (`clearResults()` first)
- "Why is `"true"` invalid?"
- "What does the evidence column prove?" (nothing: it's an unverified reference)
