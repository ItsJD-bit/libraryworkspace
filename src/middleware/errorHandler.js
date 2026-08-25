export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(error);
  } else {
    console.warn(`[${statusCode}] ${error.message}`);
  }

  response.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : error.message,
    ...(error.details ? { details: error.details } : {})
  });
}
