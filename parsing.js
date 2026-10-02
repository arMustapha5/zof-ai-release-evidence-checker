// parsing.js — rule 1: raw text in, result out. Pure, no DOM, so it's tested too.
// Enhancement: moved here from app.js to make malformed JSON testable.
(function () {
  var EMPTY_INPUT_REASON = "The input is empty: paste a JSON report or upload a file, then press Validate.";
  var MALFORMED_PREFIX = "The input is not valid JSON: ";

  // Same shape as a validateRelease result, so the page draws both the same way.
  function malformedResult(reason) {
    return {
      overall: "BLOCKED",
      releaseName: null,
      blockingReasons: [reason],
      warnings: [],
      checks: [],
      invalidData: [],
      malformedJson: true
    };
  }

  // Blank -> BLOCKED; unparseable -> BLOCKED with the parse error; else validateRelease.
  window.checkReportText = function (text) {
    if (typeof text !== "string" || text.trim() === "") {
      return malformedResult(EMPTY_INPUT_REASON);
    }
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseError) {
      return malformedResult(MALFORMED_PREFIX + parseError.message);
    }
    return window.validateRelease(parsed);
  };
})();
