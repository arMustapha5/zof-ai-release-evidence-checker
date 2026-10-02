// tests.js — automated tests (no framework).
// Enhancement: exact assertions. Each case lists the complete expected blocking
// reasons, warnings, invalid data and row outcomes, compared line for line.
// input goes to validateRelease; inputText goes to checkReportText (rule 1).
// blockingReasonsStartWith is for malformed JSON, whose parser text varies by browser.
(function () {
  // Omitted evidence is left out entirely, to test "absent".
  function check(id, name, required, status, evidence) {
    var result = { id: id, name: name, required: required, status: status };
    if (evidence !== undefined) {
      result.evidence = evidence;
    }
    return result;
  }

  var NO_REQUIRED_CHECK = "No required check exists: at least one check must have required: true.";
  function invalidDataReason(problemCount) {
    return "Report contains invalid data (" + problemCount + " problem(s)); see the invalid data list.";
  }

  window.TEST_CASES = [
    {
      name: "1. READY: all required checks pass with nonblank evidence",
      input: {
        release: "r1",
        checks: [
          check("login", "Customer login", true, "passed", "run-1"),
          check("payments", "Payment workflow", true, "passed", "run-2")
        ]
      },
      expected: {
        overall: "READY",
        blockingReasons: [],
        warnings: [],
        invalidData: [],
        outcomes: ["ok", "ok"]
      }
    },
    {
      name: "2. BLOCKED: a required check has status failed",
      input: {
        release: "r1",
        checks: [
          check("login", "Customer login", true, "passed", "run-1"),
          check("payments", "Payment workflow", true, "failed", "run-2")
        ]
      },
      expected: {
        overall: "BLOCKED",
        blockingReasons: ['Required check "payments" (Payment workflow): status is "failed" (must be "passed")'],
        warnings: [],
        invalidData: [],
        outcomes: ["ok", "blocking"]
      }
    },
    {
      name: "3. BLOCKED: a required check passes but evidence is whitespace-only",
      input: {
        release: "r1",
        checks: [check("audit", "Audit trail", true, "passed", " \t\n ")]
      },
      expected: {
        overall: "BLOCKED",
        blockingReasons: ['Required check "audit" (Audit trail): evidence is missing or blank'],
        warnings: [],
        invalidData: [],
        outcomes: ["blocking"]
      }
    },
    {
      name: "4. BLOCKED: report contains only optional checks",
      input: {
        release: "r1",
        checks: [check("copy", "UI text check", false, "passed", "run-9")]
      },
      expected: {
        overall: "BLOCKED",
        blockingReasons: [NO_REQUIRED_CHECK],
        warnings: [],
        invalidData: [],
        outcomes: ["ok"]
      }
    },
    {
      name: "5. BLOCKED: empty checks array",
      input: { release: "r1", checks: [] },
      expected: {
        overall: "BLOCKED",
        blockingReasons: [NO_REQUIRED_CHECK],
        warnings: [],
        invalidData: [],
        outcomes: []
      }
    },
    {
      name: "6. BLOCKED: invalid data in an OPTIONAL check overrides the warning path",
      input: {
        release: "r1",
        checks: [
          check("login", "Customer login", true, "passed", "run-1"),
          check("copy", "UI text check", false, "skipped", "run-9")
        ]
      },
      expected: {
        overall: "BLOCKED",
        blockingReasons: [invalidDataReason(1)],
        warnings: [],
        invalidData: ['Check #2 (id "copy"): status must be one of passed, failed, not_run, got "skipped"'],
        outcomes: ["ok", "invalid"]
      }
    },
    {
      name: "7. READY with warning: all required pass, one optional failed",
      input: {
        release: "r1",
        checks: [
          check("login", "Customer login", true, "passed", "run-1"),
          check("copy", "UI text check", false, "failed", "run-9")
        ]
      },
      expected: {
        overall: "READY",
        blockingReasons: [],
        warnings: ['Optional check "copy" (UI text check): status is "failed"'],
        invalidData: [],
        outcomes: ["ok", "warning"]
      }
    },
    {
      name: "8. BLOCKED: duplicate check ids",
      input: {
        release: "r1",
        checks: [
          check("login", "Customer login", true, "passed", "run-1"),
          check("login", "Login again", true, "passed", "run-2")
        ]
      },
      expected: {
        overall: "BLOCKED",
        blockingReasons: [invalidDataReason(1)],
        warnings: [],
        invalidData: ['Duplicate id "login": used by check #1 and check #2'],
        outcomes: ["invalid", "invalid"]
      }
    },
    {
      name: '9. BLOCKED: required is the string "true", not a boolean',
      input: {
        release: "r1",
        checks: [check("login", "Customer login", "true", "passed", "run-1")]
      },
      expected: {
        overall: "BLOCKED",
        blockingReasons: [invalidDataReason(1)],
        warnings: [],
        invalidData: ['Check #1 (id "login"): required must be a JSON boolean (true or false), got "true"'],
        outcomes: ["invalid"]
      }
    },
    {
      name: "10. BLOCKED: supplied sample (payments failed, audit missing evidence, copy only a warning)",
      input: {
        release: "customer-demo-v1",
        checks: [
          check("login", "Customer login", true, "passed", "login-test-run-101"),
          check("payments", "Payment workflow", true, "failed", "payment-test-run-102"),
          check("audit", "Audit trail", true, "passed", ""),
          check("copy", "UI text check", false, "failed", "")
        ]
      },
      expected: {
        overall: "BLOCKED",
        blockingReasons: [
          'Required check "payments" (Payment workflow): status is "failed" (must be "passed")',
          'Required check "audit" (Audit trail): evidence is missing or blank'
        ],
        warnings: ['Optional check "copy" (UI text check): status is "failed"; evidence is missing or blank'],
        invalidData: [],
        outcomes: ["ok", "blocking", "blocking", "warning"]
      }
    },
    {
      name: "11. BLOCKED: root is not an object",
      input: [],
      expected: {
        overall: "BLOCKED",
        blockingReasons: [invalidDataReason(1)],
        warnings: [],
        invalidData: ["Report root must be a JSON object, got []"],
        outcomes: []
      }
    },
    {
      name: "12. BLOCKED: blank release and missing checks are both reported",
      input: { release: "  " },
      expected: {
        overall: "BLOCKED",
        blockingReasons: [invalidDataReason(2)],
        warnings: [],
        invalidData: [
          'release must be a nonblank string, got "  "',
          "checks must be an array, missing"
        ],
        outcomes: []
      }
    },
    {
      name: "13. BLOCKED: every invalid field is reported, not just the first (demo-reports/08)",
      input: {
        release: "inventory-v4.3.0",
        checks: [
          check("stock-sync", "Stock sync", "yes", "passed", "ci-run-301"),
          check("pricing", "Pricing rules", true, "PASSED", "ci-run-302"),
          check("stock-sync", "Stock sync (again)", true, "passed", "ci-run-303"),
          check("   ", "", true, "passed", "ci-run-304"),
          "this check is not an object"
        ]
      },
      expected: {
        overall: "BLOCKED",
        blockingReasons: [invalidDataReason(6)],
        warnings: [],
        invalidData: [
          'Check #1 (id "stock-sync"): required must be a JSON boolean (true or false), got "yes"',
          'Check #2 (id "pricing"): status must be one of passed, failed, not_run, got "PASSED"',
          'Check #4: id must be a nonblank string, got "   "',
          'Check #4: name must be a nonblank string, got ""',
          'Check #5: must be an object, got "this check is not an object"',
          'Duplicate id "stock-sync": used by check #1 and check #3'
        ],
        outcomes: ["invalid", "invalid", "invalid", "invalid", "invalid"]
      }
    },

    // ---- Rule 1: raw text (Enhancement: automated malformed-JSON tests) ----
    {
      name: "14. BLOCKED: malformed JSON (trailing comma, missing brace) is reported, nothing else runs",
      inputText: '{\n  "release": "broken-v1",\n  "checks": [\n    { "id": "login", "name": "Customer login", "required": true, }\n  ]\n',
      expected: {
        overall: "BLOCKED",
        blockingReasonsStartWith: ["The input is not valid JSON: "],
        warnings: [],
        invalidData: [],
        outcomes: []
      }
    },
    {
      name: "15. BLOCKED: text that is not JSON at all (YAML-style) is malformed",
      inputText: "release: search-v1.2.0\nchecks:\n  - id: indexing\n",
      expected: {
        overall: "BLOCKED",
        blockingReasonsStartWith: ["The input is not valid JSON: "],
        warnings: [],
        invalidData: [],
        outcomes: []
      }
    },
    {
      name: "16. BLOCKED: empty or whitespace-only input asks for a report",
      inputText: "   \n\t ",
      expected: {
        overall: "BLOCKED",
        blockingReasons: ["The input is empty: paste a JSON report or upload a file, then press Validate."],
        warnings: [],
        invalidData: [],
        outcomes: []
      }
    },
    {
      name: "17. BLOCKED: valid JSON that is not an object (null) passes rule 1 and is caught by rule 2",
      inputText: "null",
      expected: {
        overall: "BLOCKED",
        blockingReasons: [invalidDataReason(1)],
        warnings: [],
        invalidData: ["Report root must be a JSON object, got null"],
        outcomes: []
      }
    },
    {
      name: "18. READY: valid JSON text goes through parsing and validation end to end",
      inputText: '{ "release": "r1", "checks": [ { "id": "login", "name": "Customer login", "required": true, "status": "passed", "evidence": "run-1" } ] }',
      expected: {
        overall: "READY",
        blockingReasons: [],
        warnings: [],
        invalidData: [],
        outcomes: ["ok"]
      }
    }
  ];

  // ---- Test runner ----------------------------------------------------------

  function sameList(actualList, expectedList) {
    if (actualList.length !== expectedList.length) {
      return false;
    }
    return actualList.every(function (line, index) {
      return line === expectedList[index];
    });
  }

  function eachStartsWith(actualList, expectedPrefixes) {
    if (actualList.length !== expectedPrefixes.length) {
      return false;
    }
    return actualList.every(function (line, index) {
      var prefix = expectedPrefixes[index];
      return line.indexOf(prefix) === 0 && line.length > prefix.length;
    });
  }

  // Returns the names of the parts that didn't match ([] = pass).
  function compare(expected, actual) {
    var failures = [];
    if (actual.overall !== expected.overall) {
      failures.push("overall");
    }
    if (expected.blockingReasonsStartWith) {
      if (!eachStartsWith(actual.blockingReasons, expected.blockingReasonsStartWith)) {
        failures.push("blocking reasons");
      }
    } else if (!sameList(actual.blockingReasons, expected.blockingReasons)) {
      failures.push("blocking reasons");
    }
    if (!sameList(actual.warnings, expected.warnings)) {
      failures.push("warnings");
    }
    if (!sameList(actual.invalidData, expected.invalidData)) {
      failures.push("invalid data");
    }
    if (expected.outcomes) {
      var actualOutcomes = actual.checks.map(function (check) { return check.outcome; });
      if (!sameList(actualOutcomes, expected.outcomes)) {
        failures.push("check outcomes");
      }
    }
    return failures;
  }

  // No DOM here; tests.html draws the results.
  window.runTestCases = function () {
    return window.TEST_CASES.map(function (testCase) {
      var actual = testCase.inputText !== undefined
        ? window.checkReportText(testCase.inputText)
        : window.validateRelease(testCase.input);
      var failures = compare(testCase.expected, actual);
      return {
        name: testCase.name,
        expected: testCase.expected,
        actual: actual,
        passed: failures.length === 0,
        failures: failures
      };
    });
  };
})();
