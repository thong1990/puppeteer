import app from './app';

const port = parseInt(process.env.PORT || '3000');

console.log('🚀 Starting Email OTP Retrieval API (IMAP)...');
console.log(`📧 Server running on port ${port}`);
console.log(`🔗 http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};