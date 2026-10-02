# Demo talking points: Release Evidence Checker

15 minutes. **Lead with behaviour and tests, not styling.** Speak to what you've seen work.

---

## 0. Before they arrive (2 min setup)

- [ ] Open the folder `~/Desktop/Abdul_Mustapha_Software_Engineer` in Finder and in IntelliJ.
- [ ] Have `README.md` open. You'll launch the app *from it*, as the brief asks.
- [ ] Have `validation.js` open at `BLOCKING_RULES` (line ~165) and `tests.js` at test 6 (line ~96).
- [ ] Close every browser tab so you can show a clean launch.

---

## 1. Opening (30 seconds)

> "I built a small local web app in plain HTML, CSS and JavaScript. It has no framework, no build step and no network calls. It reads a JSON release report and says READY or BLOCKED, with the specific reasons. The rules live in one file, separate from the page, so the same code runs in the app and in the tests. I used an AI coding assistant, and I've verified the behaviour myself. I'll show you what I checked."

---

## 2. Launch from the README (30 seconds)

- Point at README section 1. Double-click `index.html`.
- *"There's a fallback with `python3 -m http.server` if a browser blocks local files."*

---

## 3. The three strongest minutes (show these first)

### ① The supplied sample: BLOCKED for exactly the right reasons
**Choose File → `sample-release.json` → Validate**

> "The brief says this should be BLOCKED because Payment workflow failed and Audit trail has no evidence, and that the UI text check should be a warning, not a blocker. That's exactly what it shows. There are two blocking reasons, each naming its check. `copy` appears only under Warnings, and its row is amber, not red."

### ② Invalid data in an *optional* check still blocks
**`demo-reports/07-blocked-invalid-optional-check.json` → Validate**

> "This is the subtle rule. The bad check is optional, so it would be easy to downgrade it to a warning. But its status is `skipped`, which isn't in the allowed vocabulary, and its evidence is a number. Once the data contract is broken, I can't trust any field, so the whole report is BLOCKED, and the invalid-data list says exactly what's wrong."

### ③ No stale READY
**`demo-reports/01-ready-all-required-pass.json` → Validate** (green READY), then **`demo-reports/10-malformed-json.json` → Validate**

> "The brief explicitly says malformed input must not leave an earlier READY visible. The green banner is gone and the table is empty. The first thing the Validate handler does is call `clearResults()`, before any parsing, so nothing from the previous run can survive. Choosing a new file also clears the old result straight away."

---

## 4. Explain the readiness logic (2–3 min, in `validation.js`)

Open at `BLOCKING_RULES`, then scroll to `evaluate`.

> "The rules are a list of functions in precedence order. Each one returns either null, meaning no objection, or a list of blocking reasons. `evaluate` starts from READY and asks each rule in turn. The first rule that objects makes the result BLOCKED, and the loop stops there."

The order, which you can say from memory:
1. **Malformed JSON** → BLOCKED (in `parsing.js`, because there's no object yet)
2. **Invalid data anywhere**, optional checks included → BLOCKED
3. **No required check** (empty report, or only optional checks) → BLOCKED
4. **A required check that isn't passed, or has blank evidence** → BLOCKED, one reason per check
5. **Otherwise READY**, with warnings for optional failed or not-run checks

> "Order matters for correctness, not just for the messages. Rules 3 and 4 read `required` and `status`. That only makes sense after rule 2 has confirmed they really are a boolean and an allowed string. That's why `"required": "true"`, a string, is invalid data rather than being treated as true."

> "To add a requirement, I write one function and put it in this list at its position. The UI doesn't change."

---

## 5. Explain a test (1–2 min, `tests.js` test 6, then `tests.html`)

> "Test 6 is the optional-invalid-data case. Each test states the *complete* expected lists: blocking reasons, warnings and invalid-data messages, plus every row's outcome. They're compared line for line, so a test can't pass for the wrong reason. Here the warnings list must be *empty*, which proves the optional check wasn't downgraded to a warning."

Open `tests.html`: **18 of 18 passed**.

> "To make sure the tests can catch mistakes, I deliberately broke expectations, for example by rewording a message or using the wrong outcome, and confirmed the test failed."

---

## 6. If time allows

- `demo-reports/02`: READY with 2 warnings (optional failures don't block).
- `demo-reports/08`: six different invalid-data problems listed at once, not just the first.
- `demo-reports/05` / `06`: empty report and optional-only report are both BLOCKED.

---

## 7. Be honest about what's unfinished (say this yourself, unprompted)

> "Three things I'd flag:
> - The file upload has no automated test. I checked it by hand, and it was also driven in Chrome.
> - The table isn't paginated. It handled 20,000 checks in about 64 ms, but a huge report gives a very long table. I'd shorten the display but still validate every check.
> - The stale-READY check needs the real page, so it's a documented manual test rather than in `tests.html`."

> "Evidence is only a reference string. The app never opens or verifies it, and the column header says so."

---

## 8. If they ask for a live change

**Most likely: "Add a rule." Prepared example (already tested: 19/19 pass):**
*"Treat evidence that just says `TODO` as missing."*

In `validation.js`, inside `findReadinessProblems`, extend the blank-evidence check:

```js
    if (hasBlankEvidence(check)) {
      problems.push("evidence is missing or blank");
    } else if (check.evidence.trim().toUpperCase() === "TODO") {
      problems.push('evidence is only a placeholder ("TODO")');
    }
```

> "I put it here rather than as a new entry in `BLOCKING_RULES` because it's part of the same evidence rule. That way it blocks required checks, warns on optional ones and highlights the row, all from one change. If it were a genuinely separate rule, it would go into `BLOCKING_RULES` at its precedence position."

Then add a test case and refresh `tests.html`:

```js
    {
      name: "19. BLOCKED: placeholder evidence TODO on a required check",
      input: { release: "r1", checks: [check("login", "Customer login", true, "passed", "todo")] },
      expected: {
        overall: "BLOCKED",
        blockingReasons: ['Required check "login" (Customer login): evidence is only a placeholder ("TODO")'],
        warnings: [],
        invalidData: [],
        outcomes: ["blocking"]
      }
    }
```

**Other possible asks:**

| Ask | Where |
|-----|-------|
| Allow a new status, e.g. `skipped` | Add it to `PERMITTED_STATUSES` (line 4), then decide whether a required `skipped` check blocks. It would, because `findReadinessProblems` blocks anything that isn't `passed`. Add a test. |
| Case-insensitive status | Two places: `findCheckFieldProblems` (vocabulary check, line ~53) and `findReadinessProblems` (`passed` check). Plus a test for `"PASSED"`. |
| Change a message | Change the string in `validation.js`, then update the matching expected text in `tests.js`; the exact tests will flag every place. |
| A new completely separate rule | New `ruleXxx(report)` function returning `null` or `{ blockingReasons }`, inserted into `BLOCKING_RULES` at its position, plus a test. |

---

## 9. Likely questions

| Question | Answer |
|---|---|
| Why does invalid data in an optional check block? | Once the contract is broken I can't trust any field, so I can't safely call it "just a warning". |
| Why no warnings when the data is invalid? | Same reason: a warning built from untrusted fields would claim something I haven't established. |
| Where would you add a new rule? | `BLOCKING_RULES` in `validation.js`, at its precedence position, or in `findReadinessProblems` if it's part of the pass/evidence rule. |
| How do you guarantee no stale READY? | `clearResults()` is the first line of `handleValidate` (`app.js:157`), before parsing. Picking a file clears too. |
| Why is `"true"` invalid? | The brief requires a JSON boolean. A string isn't a boolean, and accepting it would mean guessing intent. |
| Why is `"PASSED"` invalid? | A judgement call: a fixed vocabulary should reject near-misses rather than quietly correct them, which would hide bugs upstream. Easy to relax if wanted. |
| What does the evidence column prove? | Nothing. It's an unverified reference string, and the column says so. |
| Why is the logic in its own file? | The same code runs in the app and the tests, I can explain it on its own, and a rule can be added without touching the UI. |
| Why `parsing.js` separate from `validation.js`? | `validateRelease` only ever receives a parsed object. Parsing is rule 1, and splitting it out made malformed JSON testable. |
| Why `window.` instead of `import`? | ES modules fail when the page is opened from `file://` in Chrome, and the brief wants a simple local launch. |
| What did the AI do vs you? | It drafted code, tests and docs from my spec and the brief. I checked the behaviour myself (README section 6) and can explain every file. |
| What would you do next? | Truncate the table for huge reports, add an automated upload test with a browser-automation tool, and run the tests in CI. |

---

## 10. Don'ts

- Don't open with the styling. If asked: *"The brief prioritises behaviour and tests; the styling is CSS only and doesn't touch the logic."*
- Don't claim the app verifies evidence.
- Don't claim something works unless you've seen it work yourself.
- If you don't know an answer, open the file and read the function. The comments explain the *why*.
