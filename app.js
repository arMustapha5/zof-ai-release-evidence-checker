// app.js — page wiring only. Every READY/BLOCKED decision comes from parsing.js / validation.js.
(function () {
  var jsonInput = document.getElementById("json-input");
  var fileInput = document.getElementById("file-input");
  var banner = document.getElementById("banner");
  var errorMessage = document.getElementById("error-message");
  var placeholder = document.getElementById("placeholder");
  var announcer = document.getElementById("announcer");

  // Any new output section must be listed here, or an old result could linger.
  var resultSections = [
    "release-section",
    "invalid-section",
    "blocking-section",
    "warnings-section",
    "checks-section"
  ];
  var resultLists = ["invalid-list", "blocking-list", "warnings-list", "checks-body"];

  // Called first on every attempt so a stale READY can never survive.
  function clearResults() {
    placeholder.hidden = true;
    banner.hidden = true;
    banner.textContent = "";
    banner.className = "";
    errorMessage.hidden = true;
    errorMessage.textContent = "";
    announcer.textContent = "";
    document.getElementById("release-name").textContent = "";
    resultSections.forEach(function (id) {
      document.getElementById(id).hidden = true;
    });
    resultLists.forEach(function (id) {
      document.getElementById(id).innerHTML = "";
    });
  }

  function countLabel(count, singular, plural) {
    return count + " " + (count === 1 ? singular : plural);
  }

  // Enhancement: banner counts, e.g. "2 blocking reasons · 1 warning · 4 checks".
  function summariseResult(result) {
    if (result.malformedJson) {
      return "Input could not be read as JSON";
    }
    var parts = [];
    if (result.invalidData.length > 0) {
      parts.push(countLabel(result.invalidData.length, "invalid-data problem", "invalid-data problems"));
    } else {
      parts.push(countLabel(result.blockingReasons.length, "blocking reason", "blocking reasons"));
    }
    parts.push(countLabel(result.warnings.length, "warning", "warnings"));
    parts.push(countLabel(result.checks.length, "check", "checks"));
    return parts.join(" · ");
  }

  // Enhancement: #announcer is an aria-live region, so screen readers read the result.
  function announce(overall, summary) {
    announcer.textContent = "Result: " + overall + ". " + summary + ".";
  }

  function showBanner(overall, summary) {
    banner.textContent = "";
    var text = document.createElement("div");
    var title = document.createElement("div");
    title.className = "banner-title";
    title.textContent = overall;
    var detail = document.createElement("div");
    detail.className = "banner-summary";
    detail.textContent = summary;
    text.appendChild(title);
    text.appendChild(detail);
    banner.appendChild(text);
    banner.className = overall === "READY" ? "ready" : "blocked";
    banner.hidden = false;
    announce(overall, summary);
  }

  // textContent, not innerHTML, so report text is never run as HTML.
  function renderList(sectionId, listId, items) {
    if (items.length === 0) {
      return;
    }
    var list = document.getElementById(listId);
    items.forEach(function (text) {
      var item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    });
    document.getElementById(sectionId).hidden = false;
  }

  // Enhancement: outcome badge; text as well as colour.
  var OUTCOME_LABELS = {
    ok: "OK",
    blocking: "Blocks release",
    warning: "Warning",
    invalid: "Invalid data"
  };

  function addCell(row, text, className) {
    var cell = document.createElement("td");
    cell.textContent = text;
    // Lets CSS colour known values (passed, failed, yes, no).
    cell.dataset.value = text;
    if (className) {
      cell.className = className;
    }
    row.appendChild(cell);
  }

  function addOutcomeCell(row, outcome) {
    var cell = document.createElement("td");
    cell.className = "outcome";
    var badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = OUTCOME_LABELS[outcome];
    cell.appendChild(badge);
    row.appendChild(cell);
  }

  // data-outcome on each row drives its highlight colour.
  function renderChecks(checks) {
    if (checks.length === 0) {
      return;
    }
    var body = document.getElementById("checks-body");
    checks.forEach(function (check) {
      var row = document.createElement("tr");
      row.dataset.outcome = check.outcome;
      addCell(row, check.id);
      addCell(row, check.name);
      addCell(row, check.required);
      addCell(row, check.status);
      addCell(row, check.evidence, "evidence");
      addOutcomeCell(row, check.outcome);
      body.appendChild(row);
    });
    document.getElementById("checks-section").hidden = false;
  }

  function renderResult(result) {
    showBanner(result.overall, summariseResult(result));
    if (result.releaseName !== null) {
      document.getElementById("release-name").textContent = result.releaseName;
      document.getElementById("release-section").hidden = false;
    }
    renderList("invalid-section", "invalid-list", result.invalidData);
    renderList("blocking-section", "blocking-list", result.blockingReasons);
    renderList("warnings-section", "warnings-list", result.warnings);
    renderChecks(result.checks);
  }

  // Clear first, then draw. The try/catch keeps the page usable on an unexpected error.
  function handleValidate() {
    clearResults();
    try {
      renderResult(window.checkReportText(jsonInput.value));
    } catch (unexpectedError) {
      clearResults();
      errorMessage.textContent = "Something went wrong while showing the result: " +
        unexpectedError.message + ". Please try again.";
      errorMessage.hidden = false;
      announcer.textContent = errorMessage.textContent;
    }
  }

  function handleClear() {
    clearResults();
    placeholder.hidden = false;
    jsonInput.value = "";
    fileInput.value = "";
  }

  // Upload only fills the text box (one path into validation) and clears the now-stale result.
  function handleFileChosen() {
    var file = fileInput.files[0];
    if (!file) {
      return;
    }
    clearResults();
    var reader = new FileReader();
    reader.onload = function () {
      jsonInput.value = reader.result;
    };
    reader.onerror = function () {
      errorMessage.textContent = "Could not read the file " + file.name + ".";
      errorMessage.hidden = false;
    };
    reader.readAsText(file);
  }

  document.getElementById("validate-button").addEventListener("click", handleValidate);
  document.getElementById("clear-button").addEventListener("click", handleClear);
  fileInput.addEventListener("change", handleFileChosen);
})();
