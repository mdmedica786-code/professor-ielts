/**
 * Global Express error handler.
 * Catches all unhandled errors and returns structured JSON responses.
 */
function errorHandler(err, req, res, _next) {
  console.error("Server Error:", err.message);
  console.error(err.stack);

  // OpenAI SDK errors (transcription, disfluency, grading, question generation).
  // The openai v4+ SDK throws APIError subclasses that carry a numeric `status`.
  const isOpenAIError =
    err.constructor?.name?.includes("APIError") ||
    err.name?.includes("APIError") ||
    typeof err.status === "number";
  if (isOpenAIError) {
    // 429 = rate/quota; surface it as 429 so the client can back off.
    const status = err.status === 429 ? 429 : 502;
    return res.status(status).json({
      success: false,
      error:
        status === 429
          ? "AI provider rate limit or quota reached. Please wait and try again."
          : "AI service error (transcription/evaluation).",
      detail: err.message,
    });
  }

  // Multer file size errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      error: "File too large. Maximum size is 25MB.",
    });
  }

  // JSON parse errors (malformed model response)
  if (err instanceof SyntaxError && err.message.includes("JSON")) {
    return res.status(502).json({
      success: false,
      error: "AI returned malformed response. Please try again.",
      detail: err.message,
    });
  }

  // Default server error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
}

module.exports = errorHandler;
