export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode || 500;
  console.error(error);
  response.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : error.message,
    ...(error.details ? { details: error.details } : {})
  });
}
