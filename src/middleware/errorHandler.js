const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error('Unhandled error: %o', err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500 ? 'Internal server error' : err.message;
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
