export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err.name === 'ZodError') return res.status(400).json({ message: err.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Images must be smaller than 5 MB.' });
  if (err.code === 11000) return res.status(409).json({ message: 'This item already exists.' });
  if (!err.status) console.error('Request failed:', err.message);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong. Please try again.' });
}
