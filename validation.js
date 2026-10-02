// validation.js — readiness rules 2–5. Pure logic, no DOM: shared by the app and the tests.
(function () {
  // Exact, case-sensitive vocabulary from the brief.
  var PERMITTED_STATUSES = ["passed", "failed", "not_run"];

  // trim() makes "   " and "\t\n" count as blank.
  function isNonBlankString(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  // typeof null and typeof [] are both "object", so exclude them.
  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  // e.g. 'got "true"' or "missing".
  function describeValue(value) {
    if (value === undefined) {
      return "missing";
    }
    return "got " + JSON.stringify(value);
  }

  // Position as well as id, because a broken check may have no usable id.
  function checkLabel(check, index) {
    var position = "Check #" + (index + 1);
    if (isPlainObject(check) && isNonBlankString(check.id)) {
      return position + ' (id "' + check.id + '")';
    }
    return position;
  }

  // ---- Invalid data (rule 2) ----

  // Returns every problem, not just the first. Absent evidence is allowed.
  function findCheckFieldProblems(check, index) {
    var label = checkLabel(check, index);
    var problems = [];

    if (!isPlainObject(check)) {
      problems.push(label + ": must be an object, " + describeValue(check));
      return problems;
    }
    if (!isNonBlankString(check.id)) {
      problems.push(label + ": id must be a nonblank string, " + describeValue(check.id));
    }
    if (!isNonBlankString(check.name)) {
      problems.push(label + ": name must be a nonblank string, " + describeValue(check.name));
    }
    if (typeof check.required !== "boolean") {
      problems.push(label + ": required must be a JSON boolean (true or false), " + describeValue(check.required));
    }
    if (PERMITTED_STATUSES.indexOf(check.status) === -1) {
      problems.push(label + ": status must be one of " + PERMITTED_STATUSES.join(", ") + ", " + describeValue(check.status));
    }
    if (check.evidence !== undefined && typeof check.evidence !== "string") {
      problems.push(label + ": evidence must be a string when present, " + describeValue(check.evidence));
    }
    return problems;
  }

  // Ids are compared exactly (case-sensitive, untrimmed).
  function findDuplicateIds(checks) {
    var problems = [];
    var firstIndexById = {};

    checks.forEach(function (check, index) {
      if (!isPlainObject(check) || !isNonBlankString(check.id)) {
        return;
      }
      if (Object.prototype.hasOwnProperty.call(firstIndexById, check.id)) {
        var firstPosition = firstIndexById[check.id] + 1;
        problems.push('Duplicate id "' + check.id + '": used by check #' + firstPosition + " and check #" + (index + 1));
      } else {
        firstIndexById[check.id] = index;
      }
    });
    return problems;
  }

  // [] means valid. Stops early only when it can't go further.
  function findInvalidData(report) {
    if (!isPlainObject(report)) {
      return ["Report root must be a JSON object, " + describeValue(report)];
    }

    var problems = [];
    if (!isNonBlankString(report.release)) {
      problems.push("release must be a nonblank string, " + describeValue(report.release));
    }
    if (!Array.isArray(report.checks)) {
      problems.push("checks must be an array, " + describeValue(report.checks));
      return problems;
    }

    report.checks.forEach(function (check, index) {
      problems = problems.concat(findCheckFieldProblems(check, index));
    });
    return problems.concat(findDuplicateIds(report.checks));
  }

  function hasBlankEvidence(check) {
    return !isNonBlankString(check.evidence);
  }

  function describeCheck(check) {
    return '"' + check.id + '" (' + check.name + ")";
  }

  // Not passed and/or blank evidence. Shared by rule 4, warnings and row outcome so they always agree.
  function findReadinessProblems(check) {
    var problems = [];
    if (check.status !== "passed") {
      var mustPass = check.required ? ' (must be "passed")' : "";
      problems.push('status is "' + check.status + '"' + mustPass);
    }
    if (hasBlankEvidence(check)) {
      problems.push("evidence is missing or blank");
    }
    return problems;
  }

  // ---- Readiness rules ----
  // Run in order; the first to object decides. Invalid data must come first because
  // the later rules rely on well-typed fields. Rule 1 (malformed JSON) is in parsing.js.
  // Each rule returns null (no objection) or { blockingReasons: [...] }.

  // Rule 2: invalid data anywhere, optional checks included.
  function ruleInvalidData(report) {
    var problems = findInvalidData(report);
    if (problems.length === 0) {
      return null;
    }
    return {
      blockingReasons: ["Report contains invalid data (" + problems.length + " problem(s)); see the invalid data list."],
      invalidData: problems
    };
  }

  // Rule 3: covers both an empty report and an optional-only report.
  function ruleAtLeastOneRequiredCheck(report) {
    var requiredChecks = report.checks.filter(function (check) { return check.required; });
    if (requiredChecks.length > 0) {
      return null;
    }
    return { blockingReasons: ["No required check exists: at least one check must have required: true."] };
  }

  // Rule 4: one reason per required check that isn't passed or lacks evidence.
  function ruleRequiredChecksPassWithEvidence(report) {
    var reasons = [];
    report.checks.forEach(function (check) {
      if (!check.required) {
        return;
      }
      var problems = findReadinessProblems(check);
      if (problems.length > 0) {
        reasons.push("Required check " + describeCheck(check) + ": " + problems.join("; "));
      }
    });
    return reasons.length > 0 ? { blockingReasons: reasons } : null;
  }

  // Precedence order. Rule 5 (READY) is what's left when none object.
  var BLOCKING_RULES = [
    ruleInvalidData,
    ruleAtLeastOneRequiredCheck,
    ruleRequiredChecksPassWithEvidence
  ];

  // Optional checks only ever warn.
  function collectWarnings(checks) {
    var warnings = [];
    checks.forEach(function (check) {
      if (check.required) {
        return;
      }
      var problems = findReadinessProblems(check);
      if (problems.length > 0) {
        warnings.push("Optional check " + describeCheck(check) + ": " + problems.join("; "));
      }
    });
    return warnings;
  }

  // ---- Table values (shown even when data is invalid) ----

  function displayText(value) {
    if (value === undefined) {
      return "";
    }
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  // Non-booleans are labelled invalid so "true" isn't mistaken for yes.
  function displayRequired(value) {
    if (value === true) {
      return "yes";
    }
    if (value === false) {
      return "no";
    }
    return "invalid: " + displayText(value);
  }

  function findRepeatedIds(checks) {
    var countById = {};
    checks.forEach(function (check) {
      if (isPlainObject(check) && isNonBlankString(check.id)) {
        countById[check.id] = (countById[check.id] || 0) + 1;
      }
    });
    return Object.keys(countById).filter(function (id) { return countById[id] > 1; });
  }

  // Enhancement: row outcome — "invalid", "blocking", "warning" or "ok".
  // With invalid data only the bad checks are flagged: the readiness rules never ran.
  function decideCheckOutcome(check, index, reportHasInvalidData, repeatedIds) {
    var isDuplicate = isPlainObject(check) && repeatedIds.indexOf(check.id) !== -1;
    if (findCheckFieldProblems(check, index).length > 0 || isDuplicate) {
      return "invalid";
    }
    if (reportHasInvalidData || findReadinessProblems(check).length === 0) {
      return "ok";
    }
    return check.required ? "blocking" : "warning";
  }

  // Non-object checks still get a row, so rows line up with "Check #n".
  function normaliseChecksForDisplay(report, reportHasInvalidData) {
    if (!isPlainObject(report) || !Array.isArray(report.checks)) {
      return [];
    }
    var repeatedIds = findRepeatedIds(report.checks);
    return report.checks.map(function (check, index) {
      var source = isPlainObject(check) ? check : {};
      return {
        id: displayText(source.id),
        name: displayText(source.name),
        required: displayRequired(source.required),
        status: displayText(source.status),
        evidence: displayText(source.evidence),
        outcome: decideCheckOutcome(check, index, reportHasInvalidData, repeatedIds)
      };
    });
  }

  function readReleaseName(report) {
    if (isPlainObject(report) && isNonBlankString(report.release)) {
      return report.release;
    }
    return null;
  }

  // Start READY; the first rule that objects sets BLOCKED and stops the loop.
  function evaluate(report) {
    var result = {
      overall: "READY",
      releaseName: readReleaseName(report),
      blockingReasons: [],
      warnings: [],
      checks: [],
      invalidData: []
    };

    for (var i = 0; i < BLOCKING_RULES.length; i++) {
      var ruleResult = BLOCKING_RULES[i](report);
      if (ruleResult) {
        result.overall = "BLOCKED";
        result.blockingReasons = ruleResult.blockingReasons;
        result.invalidData = ruleResult.invalidData || [];
        break;
      }
    }

    var reportHasInvalidData = result.invalidData.length > 0;
    // No warnings from untrusted (invalid) data.
    if (!reportHasInvalidData) {
      result.warnings = collectWarnings(report.checks);
    }
    // Last: row outcomes depend on whether the data was valid.
    result.checks = normaliseChecksForDisplay(report, reportHasInvalidData);
    return result;
  }

  // Never throws: any unexpected error fails safe to BLOCKED.
  window.validateRelease = function (parsedObject) {
    try {
      return evaluate(parsedObject);
    } catch (error) {
      return {
        overall: "BLOCKED",
        releaseName: null,
        blockingReasons: ["Unexpected error while validating: " + error.message],
        warnings: [],
        checks: [],
        invalidData: []
      };
    }
  };
})();
