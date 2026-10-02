# Build prompt — Release Evidence Checker

## Where the files are

The exercise ZIP has already been extracted into **`~/Downloads`**. Locate the two input files yourself — the folder name is not known in advance:

```bash
find ~/Downloads -iname "Candidate_Brief.txt" -o -iname "sample-release.json" 2>/dev/null
```

Read both from wherever that finds them. **Tell me the full paths you used** before you start coding, so I can confirm you have the right copies and not a stale duplicate.

**Create the deliverable here:**

```bash
mkdir -p ~/Downloads/Abdul_Mustapha_Software_Engineer
cd ~/Downloads/Abdul_Mustapha_Software_Engineer
```

All work happens inside that folder. **Copy `sample-release.json` into it rather than referencing it in place**, and leave the original untouched.

If you cannot find either file, stop and tell me — do not proceed on assumed field names.

---

## Before you write any code

**Read `Candidate_Brief.txt` and `sample-release.json` first.** The brief is the authority, not this file. Derive the **exact field names, the exact status vocabulary, and the exact JSON shape** from those two files. Do not invent or assume field names — if the sample uses `checks`, `id`, `name`, `required`, `status`, `evidence`, use exactly those; if it differs, follow the sample.

**Then state back to me, in two lines before coding:** the field names you found, and the exact set of permitted `status` values. I will confirm or correct. Do not skip this step.

If anything in this file conflicts with `Candidate_Brief.txt`, **the brief wins** — say so and follow the brief.

---

## Hard constraints

- **75 minutes total.** A smaller correct solution beats a larger one.
- **Plain HTML, CSS and vanilla JavaScript.** No framework, no build step, no `npm install`, no bundler, no CDN dependency.
- **No ES module syntax.** No `import` / `export`, no `type="module"`. Use plain `<script src="...">` tags and attach functions to `window`. Reason: the app must open from `file://` and ES modules fail there on CORS in Chrome.
- **No network calls of any kind.** No `fetch`, no `XMLHttpRequest`, no external fonts or stylesheets.
- **No authentication, database, cloud, or external API.**
- Minimal CSS. Readable, not designed. Visual polish is explicitly deprioritised in the brief.

---

## File layout — exactly this

```
~/Downloads/Abdul_Mustapha_Software_Engineer/
├── index.html        the app
├── validation.js     pure validation logic, zero DOM access
├── app.js            DOM wiring only, zero validation logic
├── tests.html        in-browser test runner
├── tests.js          the test cases
├── sample-release.json          (copied from the ZIP, unmodified)
├── fixtures/         additional test JSON files
└── README.md
```

**`validation.js` must contain no DOM references and no `document`, `window.alert`, or rendering.** It exposes one pure function:

```js
window.validateRelease = function (parsedObject) {
  // returns a result object — never throws
}
```

This separation is not stylistic. I must be able to explain the readiness logic on its own in a live demo, and incorporate a new requirement mid-exercise by editing one place.

---

## The validation rules — implement exactly

### Precedence, in this order. Stop at the first that applies.

**1 — Malformed JSON** → `BLOCKED`, reason: the parse error, shown in plain language. Parsing happens in `app.js`, not `validation.js`.

**2 — Invalid data anywhere in the report, including in an optional check** → `BLOCKED`. This overrides everything below. An optional check with invalid data does **not** degrade to a warning.

**3 — No required check exists** → `BLOCKED`. This covers both an empty report and a report containing only optional checks. Treat them as the same rule with the same reason text.

**4 — Any required check that is not passing, or whose evidence is blank** → `BLOCKED`, one specific reason per offending check, naming the check ID and name.

**5 — Otherwise** → `READY`, with warnings for any optional check that failed or did not run.

### What counts as invalid data

Implement each of these. Report every one found, not just the first.

- `checks` missing, or not an array
- a check that is not an object
- `id` missing, not a string, or blank after trimming
- `name` missing, not a string, or blank after trimming
- `required` missing, or not a boolean — **a string `"true"` is invalid, not truthy**
- `status` missing, not a string, or not one of the permitted values from the brief
- `evidence` present but not a string
- duplicate `id` across two checks
- release name missing or blank — **treat as invalid data and document it as an assumption**

### Blank evidence

Blank means empty **or whitespace-only**. `"   "` is blank. `"\t\n"` is blank. Trim before testing.

A **required** check with blank evidence is a blocker.
An **optional** check with blank evidence is neither a blocker nor invalid — note it as a warning. Document this as an assumption.

### Evidence handling — important

Evidence is a **supplied reference string only**. Do **not** fetch it, resolve it, follow it, validate its format, or imply the application has checked what it points to.

In the UI, label the column **"Evidence reference (not verified by this tool)"**. State the same thing in the README. The brief is explicit about this and it is a scored point.

### Result object shape

```js
{
  overall: "READY" | "BLOCKED",
  releaseName: string | null,
  blockingReasons: string[],   // [] when READY
  warnings: string[],
  checks: [ /* normalised for display */ ],
  invalidData: string[]        // populated only for rule 2
}
```

---

## UI requirements

- **A textarea for pasting JSON, plus a file upload.** Both. They are cheap and the demo is smoother with both.
- **A "Validate" button**, and a **"Clear"** button.
- Display: the release name, then a table of every check — ID, name, Required (yes/no), Status, and the evidence reference with the not-verified label.
- **A prominent overall result banner** — `READY` or `BLOCKED` — visually unmissable. Green and red is sufficient.
- **Blocking reasons** listed explicitly, each naming the check it came from.
- **Warnings** listed separately, visibly distinct from blocking reasons.
- **Invalid-data problems** listed in their own section when rule 2 fires.

### State reset — the most important UI requirement

**On every validation attempt, clear all previous output before rendering anything new.** A malformed-JSON submission must never leave a previous `READY` banner on screen. Write a single `clearResults()` function and call it as the **first line** of the validate handler, before parsing.

The brief names this explicitly: *"The application must not crash or leave an earlier READY result visible."* Test it deliberately.

### Reloading without code changes

The user must be able to paste or upload a different report and press Validate again, repeatedly, with no page reload required and no source edit. Verify this works more than twice in a row.

### Never crash

Wrap the whole validate handler in `try/catch`. On an unexpected error, show a plain message and leave the UI usable. `validateRelease` itself must never throw — it returns findings rather than raising.

---

## Tests — at least five, automated

`tests.html` loads `validation.js` and `tests.js` with plain script tags and prints results to the page: test name, expected, actual, PASS or FAIL, plus a total count. No test framework.

Write these as a minimum, and label each with what it proves:

1. **READY** — all required checks pass with non-blank evidence
2. **BLOCKED** — a required check has status fail
3. **BLOCKED** — a required check passes but evidence is whitespace-only
4. **BLOCKED** — report contains only optional checks, no required check
5. **BLOCKED** — empty `checks` array
6. **BLOCKED** — an **optional** check has invalid data (proves invalid data overrides the optional-warning path)
7. **READY with warnings** — all required pass, one optional failed
8. **BLOCKED** — duplicate check IDs
9. **BLOCKED** — `required` is the string `"true"` rather than a boolean

Each test asserts on the **overall result and the specific reasons**, not just the overall. A test that only checks `overall === "BLOCKED"` would pass for the wrong reason — assert the reason text or count too.

Also create `fixtures/` with the JSON for each scenario as a separate file, so they can be loaded through the UI during the demo rather than retyped.

---

## README.md — required sections

1. **Launch instructions, exact.** Primary: open `index.html` in a browser. Fallback: `python3 -m http.server 8000` then the URL. Same for `tests.html`. Test these instructions yourself before finishing.
2. **How the readiness logic works** — the five precedence rules in order, in plain prose.
3. **Assumptions** — at minimum: what counts as invalid data, blank-evidence handling for optional checks, release name treated as required, duplicate IDs treated as invalid, and the permitted status vocabulary and where it came from.
4. **Known limitations** — explicitly including: evidence is a reference string that is never fetched or verified; no persistence; single-file prototype; browser-based tests rather than a CI runner.
5. **Tools and AI used** — state that an AI coding assistant was used, and for what.
6. **What I verified myself** — leave this section with a clear heading and a placeholder line. I will write it myself; do not fill it in.

---

## Do not do

- Do not modify `sample-release.json`. **It is supposed to return BLOCKED.** If it returns READY, your logic is wrong — do not adjust the sample to match.
- Do not add routing, state management, a component framework, TypeScript, a linter config, or a package.json.
- Do not use `localStorage` or `sessionStorage`.
- Do not write clever one-liners. Favour named variables and short functions that read aloud well. I have to explain every line.
- Do not add features the brief does not ask for.
- Do not leave `console.log` in the delivered code.
- Do not write comments that restate the code. Comment only where the **why** is not obvious — particularly the precedence order.

---

## Build order

Work in this sequence and tell me when each is done:

1. Confirm field names and status vocabulary from the brief and sample.
2. `validation.js` — all five rules, the full invalid-data taxonomy. Nothing else.
3. `tests.js` + `tests.html` — the nine tests. **Run them. Report pass/fail before touching the UI.**
4. `index.html` + `app.js` — the UI, with `clearResults()` first in the handler.
5. Load `sample-release.json` through the UI. **Confirm it returns BLOCKED and tell me the exact reasons it gives.**
6. `fixtures/` files.
7. `README.md`.

If time runs short, stop after step 5 and say so. A correct validator with passing tests and a basic UI is a complete submission. An elaborate UI over untested logic is not.

---

## One more requirement is coming

A further requirement will arrive partway through the exercise. Structure the rules so a new one can be added in a single place, in the documented precedence order, without touching the UI. When it arrives I will paste it; add it as a new rule, add a test for it, and tell me which precedence position it takes and why.
