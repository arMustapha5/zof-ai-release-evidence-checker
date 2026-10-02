# Release Evidence Checker

A small local web app that reads a JSON release report, shows every check, and says whether the release is **READY** or **BLOCKED**, with the specific reasons. Plain HTML, CSS and vanilla JavaScript. It has no dependencies, no build step and makes no network calls.

Supporting documents are in `docs/`:
- `build-prompt.md`: the specification the AI assistant was given.
- `build-brief.md`: a record of what was built and verified.
- `demo-talking-points.md`: the demo script and likely questions.

## 1. Launch instructions

### The app

**Primary:** double-click `index.html`, or open it from your browser's *File → Open File…* menu. It runs straight from `file://`.

**Fallback** (if your browser restricts local files):

```bash
cd ~/Desktop/Abdul_Mustapha_Software_Engineer
python3 -m http.server 8000
```

Then open <http://localhost:8000/index.html>. Stop the server with Ctrl+C.

### Using it

1. Paste JSON into the text box, **or** choose a file with *Upload a JSON file*. Uploading fills the text box.
2. Press **Validate**.
3. To check another report, paste or upload it and press **Validate** again. You never need to reload the page. **Clear** empties the input and the result.

Ready-made inputs are in `sample-release.json`, `demo-reports/` (realistic reports for the demo) and `fixtures/` (the test inputs).

### Demo reports

`demo-reports/` has one realistic report for each rule in the brief. Load them with **Choose File**, or paste them in, and press **Validate**.

| File | Brief rule it shows | Expected result |
|------|---------------------|-----------------|
| `01-ready-all-required-pass.json` | Required checks must pass with nonblank evidence | **READY**, 0 warnings |
| `02-ready-with-optional-warnings.json` | Optional failed / not_run checks are warnings, not blockers | **READY**, 2 warnings (`load-test` failed, `visual-diff` not_run) |
| `03-blocked-required-failed-and-not-run.json` | Every required check must have status passed | **BLOCKED**: `checkout` failed, `pen-test` not_run |
| `04-blocked-required-missing-evidence.json` | Required evidence must be nonblank (absent and whitespace-only both count) | **BLOCKED**: `audit-log` has no evidence field, `backup` has "    "; optional `docs` is only a warning |
| `05-blocked-empty-report.json` | Empty reports are BLOCKED | **BLOCKED**: no required check exists |
| `06-blocked-only-optional-checks.json` | Reports with only optional checks are BLOCKED | **BLOCKED**: no required check exists |
| `07-blocked-invalid-optional-check.json` | Invalid data in an **optional** check still blocks | **BLOCKED**: `templates` has status `"skipped"` and evidence `42` (a number) |
| `08-blocked-many-invalid-fields.json` | Invalid data is reported clearly, every problem at once | **BLOCKED**: 6 invalid-data problems (string `"yes"` for required, `"PASSED"` in capitals, blank id and name, a check that is not an object, duplicate id) |
| `09-blocked-missing-release-name.json` | The root needs a nonblank release string | **BLOCKED**: release is missing |
| `10-malformed-json.json` | Malformed JSON is handled clearly | **BLOCKED**: trailing comma and missing closing brace |
| `11-malformed-not-json-at-all.json` | Malformed JSON is handled clearly | **BLOCKED**: the file is YAML-style text, not JSON |

**Suggested demo order** (no reload, no code changes between steps):

1. `sample-release.json`: **BLOCKED** for `payments` and `audit`, with `copy` only a warning, as the brief expects.
2. `demo-reports/01-ready-all-required-pass.json`: **READY**.
3. `demo-reports/10-malformed-json.json`: **BLOCKED**. The READY banner from step 2 is gone; this shows the "no stale READY" requirement.
4. `demo-reports/02-ready-with-optional-warnings.json`: **READY** with warnings.
5. `demo-reports/07-blocked-invalid-optional-check.json`: **BLOCKED**, because invalid data in an optional check is not downgraded to a warning.
6. `demo-reports/08-blocked-many-invalid-fields.json`: every invalid field is listed.
7. `demo-reports/05-…` and `06-…`: the empty report and the optional-only report are both BLOCKED.

### The tests

There are **18 automated tests** and one manual test, each with its input, expected result and actual result.

#### Run the automated tests

1. Open `tests.html` in a browser by double-clicking it. Fallback: start the server above and open <http://localhost:8000/tests.html>.
2. The top of the page should read **`18 of 18 tests passed`**.
3. Each row shows the test name, the expected result, the actual result (the real output of `validateRelease`) and PASS or FAIL.

Every test states the overall result **and the complete, exact lists** of blocking reasons, warnings and invalid-data messages, and compares them line for line. A missing, extra, reworded or reordered message fails the test, so a test can't pass for the wrong reason. Tests 14–18 give **raw text** to `checkReportText` (`parsing.js`), the same path the Validate button uses. For malformed JSON they check that the reason starts with "The input is not valid JSON:", because the parser's own wording differs between browsers. Every test also checks each row's outcome, for example `ok, blocking, blocking, warning` for the sample.

#### Reproduce any test by hand in the app

1. Open `index.html`.
2. Click **Choose File** and pick the fixture listed below, or paste its contents into the text box.
3. Press **Validate**.
4. Compare the banner and the lists with the "Expected" column.
5. Load the next fixture and press **Validate** again. No reload is needed.

#### Results

Actual results are from a run on 2026-10-02 in Google Chrome. All 18 passed.

| # | What it proves | Input (fixture) | Expected | Actual |
|---|----------------|-----------------|----------|--------|
| 1 | All required checks pass with evidence | `fixtures/01-ready.json` | READY, no reasons, no warnings | READY, 0 reasons, 0 warnings: **PASS** |
| 2 | A failed required check blocks | `fixtures/02-blocked-required-failed.json` | BLOCKED, 1 reason naming `payments` | BLOCKED: `Required check "payments" (Payment workflow): status is "failed" (must be "passed")`: **PASS** |
| 3 | Whitespace-only evidence counts as missing | `fixtures/03-blocked-whitespace-evidence.json` | BLOCKED, 1 reason naming `audit` | BLOCKED: `Required check "audit" (Audit trail): evidence is missing or blank`: **PASS** |
| 4 | Only optional checks blocks | `fixtures/04-blocked-only-optional.json` | BLOCKED, "No required check exists" | BLOCKED: `No required check exists: at least one check must have required: true.`: **PASS** |
| 5 | An empty checks array blocks | `fixtures/05-blocked-empty-checks.json` | BLOCKED, "No required check exists" | BLOCKED: same message as test 4: **PASS** |
| 6 | Invalid data in an **optional** check blocks (no downgrade to a warning) | `fixtures/06-blocked-invalid-optional-status.json` | BLOCKED, 1 invalid-data line, 0 warnings | BLOCKED: `Check #2 (id "copy"): status must be one of passed, failed, not_run, got "skipped"`: **PASS** |
| 7 | A failed optional check only warns | `fixtures/07-ready-with-optional-warning.json` | READY, 1 warning naming `copy` | READY, warning `Optional check "copy" (UI text check): status is "failed"`: **PASS** |
| 8 | Duplicate ids are invalid | `fixtures/08-blocked-duplicate-ids.json` | BLOCKED, 1 invalid-data line | BLOCKED: `Duplicate id "login": used by check #1 and check #2`: **PASS** |
| 9 | `"true"` (a string) is not a boolean | `fixtures/09-blocked-required-string-true.json` | BLOCKED, 1 invalid-data line | BLOCKED: `Check #1 (id "login"): required must be a JSON boolean (true or false), got "true"`: **PASS** |
| 10 | The supplied sample | `sample-release.json` | BLOCKED: 2 reasons (`payments`, `audit`), 1 warning (`copy`) | BLOCKED, 2 reasons (`payments` failed, `audit` missing evidence), 1 warning (`copy`): **PASS** |
| 11 | Root must be an object | `fixtures/11-blocked-root-not-object.json` | BLOCKED, 1 invalid-data line | BLOCKED: `Report root must be a JSON object, got []`: **PASS** |
| 12 | Every problem is reported, not just the first | `fixtures/12-blocked-blank-release-no-checks.json` | BLOCKED, 2 invalid-data lines | BLOCKED: `release must be a nonblank string, got "  "` and `checks must be an array, missing`: **PASS** |
| 13 | Every invalid field in a report is listed | `demo-reports/08-blocked-many-invalid-fields.json` | BLOCKED, exactly 6 invalid-data lines in order | BLOCKED, the 6 expected lines (required `"yes"`, status `"PASSED"`, blank id, blank name, non-object check, duplicate `stock-sync`): **PASS** |
| 14 | Malformed JSON is BLOCKED and nothing else runs | `fixtures/13-malformed-json.json` (same text) | BLOCKED, 1 reason starting "The input is not valid JSON:", no table rows | BLOCKED: `The input is not valid JSON: Expected double-quoted property name in JSON at position 107 …`: **PASS** |
| 15 | Text that isn't JSON at all is malformed | `demo-reports/11-malformed-not-json-at-all.json` | BLOCKED, reason starts "The input is not valid JSON:" | BLOCKED: `The input is not valid JSON: Unexpected token 'r' …`: **PASS** |
| 16 | Empty / whitespace-only input | (blank text box) | BLOCKED: `The input is empty: paste a JSON report or upload a file, then press Validate.` | Same message: **PASS** |
| 17 | Valid JSON that isn't an object passes rule 1 and is caught by rule 2 | the text `null` | BLOCKED, invalid data `Report root must be a JSON object, got null` | Same: **PASS** |
| 18 | Valid JSON text goes through parsing and validation end to end | a one-check READY report as text | READY | READY: **PASS** |
| M1 | An old READY never stays visible (manual; it needs the real page) | Load `01-ready.json` → Validate, then `13-malformed-json.json` → Validate | Second attempt shows only BLOCKED and the parse error | Banner switched to BLOCKED, and the table and warnings were cleared: **PASS** (checked in Chrome) |

Fixture numbers follow the test numbers. There is no `fixtures/10-…` because test 10 uses `sample-release.json` itself, and test 13 uses `demo-reports/08-…`.

## 2. How the readiness logic works

Rules 2–5 are decided in `validation.js` by one pure function, `validateRelease(parsedObject)`. Rule 1, malformed JSON, is decided in `parsing.js` by `checkReportText(text)`. Neither file touches the page, and neither ever throws. `app.js` only passes the text box contents to `checkReportText` and draws the result.

The rules are applied in this order. **The first one that applies decides the result:**

1. **Malformed JSON → BLOCKED.** If the text can't be parsed, the parse error is shown and nothing else runs. This rule is in `parsing.js` (`checkReportText`), not `validation.js`, because it happens before there is an object to validate. `checkReportText` hands valid JSON on to `validateRelease`.
2. **Invalid data anywhere → BLOCKED.** This includes invalid data in an optional check, which does not get downgraded to a warning. Every problem found is listed, not just the first.
3. **No required check → BLOCKED.** An empty `checks` array and a report containing only optional checks get the same rule and the same message.
4. **A required check isn't `passed`, or its evidence is missing or blank → BLOCKED.** There is one reason per offending check, naming its id and name. Problems on the same check are combined into that check's reason.
5. **Otherwise → READY.** Optional checks that are `failed` or `not_run`, or have blank evidence, are listed as warnings.

Warnings are also shown when the report is BLOCKED by rule 3 or 4. For example, in the supplied sample, `copy` is shown as a warning, not an extra blocker. Warnings are **not** shown when the data is invalid. This is deliberate: once the data contract is broken, no field can be trusted, so a warning built from those fields would claim something that hasn't been established. The invalid-data list is the only output that can be relied on, so it is the only one shown.

Each check in the table also gets an **Outcome**: *OK*, *Blocks release*, *Warning* or *Invalid data*. Its row is highlighted to match. `validateRelease` decides the outcome and returns it with each check, using the same helper (`findReadinessProblems`) as rule 4 and the warnings, so the table always agrees with the lists. When the data is invalid, only the offending checks are marked, because the readiness rules never ran.

Rules 2–4 are entries in the `BLOCKING_RULES` list in `validation.js`. To add a new requirement, write one rule function and put it in that list at its place in the order. The UI doesn't need to change.

## 3. Assumptions

- **Field names and status vocabulary** come from `Candidate_Brief.txt` (Data Contract) and `sample-release.json`. The root has `release` and `checks`. Each check has `id`, `name`, `required`, `status` and an optional `evidence`. The allowed status values are exactly `passed`, `failed` and `not_run`. Matching is case-sensitive, so `"Passed"` is invalid. *This strictness is a judgement call, not something the brief requires.* A contract with a fixed vocabulary should reject near-misses rather than quietly correct them, because quiet correction hides bugs in whatever produced the report. If case-insensitive matching were wanted, it would be a small change in two places: compare the lower-cased status both in `findCheckFieldProblems` (the vocabulary check) and in `findReadinessProblems` (the `passed` check), plus a test for `"PASSED"`.
- **Invalid data** means any of the following:
  - the root is not a JSON object;
  - `release` is missing, not a string, or blank;
  - `checks` is missing or not an array;
  - a check is not an object;
  - `id` or `name` is missing, not a string, or blank after trimming;
  - `required` is not a JSON boolean (the string `"true"` is invalid);
  - `status` is missing or not one of the three allowed values;
  - `evidence` is present but not a string;
  - a check id is used more than once.
- **The release name is required.** The brief asks for a "nonblank release string", so a missing or blank `release` is invalid data.
- **Duplicate ids are invalid data.** Ids are compared exactly as written: they are case-sensitive and are not trimmed. As with status, this is a judgement call: `"Login"` and `"login"` are treated as different ids rather than guessing they were meant to be the same.
- **Blank evidence** means missing, empty, or whitespace-only (spaces, tabs, newlines).
  - On a **required** check, blank evidence is a blocker.
  - On an **optional** check, it is neither a blocker nor invalid data, only a warning.
- **Empty input** in the text box is treated as malformed JSON (rule 1), with a message asking for a report.

## 4. Known limitations

- **Evidence is a reference string only. It is never fetched, opened, resolved or verified.** The app makes no claim about what the evidence points to, and the table column is labelled "Evidence reference (not verified by this tool)". No particular format is required.
- **No persistence.** Nothing is saved, so reloading the page loses the current input and result.
- **Small prototype.** It is one page with a few script files. There is no routing, no accounts and no backend.
- **The tests run in the browser.** There is no CI or command-line test runner. You run them by opening `tests.html`.
- Clearing an old result on screen (no stale READY) needs the real page, so it is checked by the manual test M1 and by the assistant's headless-Chrome runs, not by `tests.html`.
- The wording of parse errors comes from the browser and differs between browsers.

### Unfinished or not automatically verified

- **The file-upload path has no automated test.** `tests.html` can't operate a file picker. Instead, upload was checked in real Chrome through its remote-debugging interface: choosing `sample-release.json`, then a READY report, then a malformed report filled the text box each time, cleared the previous result immediately, and gave the correct result on Validate. It should also be tried by hand before the demo.
- **No large-input guard.** The checks table isn't paginated or truncated, so a report with thousands of checks gives a very long table. The work is quick: validating and drawing the table took about 20 ms for 5,000 checks and about 64 ms for 20,000 in Chrome. If a limit were needed, the table would be truncated while the validation still ran over the full set, so the verdict and every blocking reason stayed correct.
- **Clearing the old result on screen (no stale READY) is a manual test (M1).** It needs the real page, so `tests.html` doesn't cover it. It was checked repeatedly in headless Chrome.
- **Section 6 (What I verified myself)** is written by the candidate.

## 5. Tools and AI used

- An AI coding assistant (Claude Code) was used to help draft `validation.js`, `parsing.js`, `app.js`, `index.html`, the tests, the fixtures and this README, following a written specification and the supplied brief.
- The assistant also ran the tests under Node.js and headless Google Chrome, and drove the UI through a sequence of repeated validations (sample → malformed → READY → sample → empty → READY → Clear, and the demo reports in the suggested demo order) to check that no earlier result stayed on screen.
- The assistant also checked the file-upload control in real Chrome using Chrome's built-in remote-debugging interface.
- No other libraries, services or tools are used by the app.

## 6. What I verified myself

_To be completed by the candidate._

## 7. Enhancements beyond the brief

These go beyond the core requirements. Each one is marked with an `Enhancement:` comment in the code, and none of them changes the READY/BLOCKED decision.

| Enhancement | What it does | Where |
|-------------|--------------|-------|
| Per-check outcome and row highlight | Each row is tagged *OK*, *Blocks release*, *Warning* or *Invalid data*, as a coloured badge and row tint. The outcome is decided in `validateRelease` (`decideCheckOutcome`), so the table always agrees with the lists. | `validation.js`, `app.js` (`renderChecks`), `index.html` |
| Exact test assertions | Tests compare the complete lists of reasons, warnings and invalid-data messages line for line, plus every row's outcome, instead of checking for a fragment. | `tests.js` |
| Summary counts under the banner | e.g. "2 blocking reasons · 1 warning · 4 checks". Computed only by counting what `validateRelease` returned. | `app.js` (`summariseResult`), `index.html` |
| Screen-reader announcement | A hidden `aria-live` region reads out each new result, e.g. "Result: BLOCKED. 2 blocking reasons · 1 warning · 4 checks." It is cleared together with the rest of the output. | `app.js` (`announce`), `index.html` (`#announcer`) |
| Automated malformed-JSON tests | Rule 1 moved out of `app.js` into the page-free `parsing.js` (`checkReportText`), so `tests.html` can test it: tests 14–18. |
| Demo reports | Realistic reports covering every rule in the brief, plus a suggested demo order. | `demo-reports/` |
