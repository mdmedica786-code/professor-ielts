/**
 * Central model selection for the graders, so the free/paid tiering lives in one
 * place and is tunable from the Render dashboard without a code change.
 *
 *   PRO_EVAL_MODEL   (default gpt-4o)       — paid users get the most accurate grader
 *   FREE_EVAL_MODEL  (default gpt-4o-mini)  — free users get a ~10-20x cheaper grader
 *
 * Kill switch: set FREE_EVAL_MODEL=gpt-4o on Render to instantly revert the free
 * tier to the premium model if quality is a problem.
 */
function evalModel(isPremium) {
  return isPremium
    ? (process.env.PRO_EVAL_MODEL || "gpt-4o")
    : (process.env.FREE_EVAL_MODEL || "gpt-4o-mini");
}

module.exports = { evalModel };
