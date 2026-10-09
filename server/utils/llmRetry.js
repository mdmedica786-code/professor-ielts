/**
 * Retry wrapper for LLM calls that must return structurally valid JSON.
 *
 * `fn` performs the request, parses and validates the response, and throws
 * on anything unusable. Only malformed output (JSON SyntaxError, a failed
 * validation, or a 5xx from the provider) is retried — auth, quota and bad
 * request errors fail immediately.
 */

class LlmValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "LlmValidationError";
    this.isValidation = true;
  }
}

function isRetryable(err) {
  if (err?.isValidation) return true;
  if (err instanceof SyntaxError) return true;
  return typeof err?.status === "number" && err.status >= 500;
}

async function callWithRetry(fn, maxRetries = 2, label = "LLM") {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt === maxRetries || !isRetryable(err)) throw err;
      console.warn(`${label} response invalid (${err.message}), retrying (${attempt + 1}/${maxRetries})...`);
    }
  }
}

/** Parse a chat completion's JSON content; throws SyntaxError on garbage. */
function parseJsonContent(completion) {
  const content = completion?.choices?.[0]?.message?.content;
  if (!content) throw new LlmValidationError("Leere Antwort des Modells");
  return JSON.parse(content);
}

module.exports = { callWithRetry, parseJsonContent, LlmValidationError };
