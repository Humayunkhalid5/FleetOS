// Vercel serverless entry point.
//
// Vercel's Node runtime invokes this handler for every request. The Express
// app in `src/app.js` is unchanged: it is mounted at the repository root, so
// its `/api/...` routes match the incoming request path exactly.
//
// Two things differ from `src/server.js` (the long-running server):
//   1. The database connection is cached per container. Vercel reuses warm
//      containers, so without the cache every request would open a new
//      connection and exhaust the Atlas connection limit.
//   2. Nothing is seeded on boot. Seeding is a one-off operation that belongs
//      in a script, not on a request path.
//
// Socket.IO is not available on serverless functions. Pages still load and
// mutate data over REST; only push updates need a long-running host.

const connectDB = require('../src/config/db');
const app = require('../src/app');

let connecting;

function ensureDatabase() {
  if (!connecting) {
    connecting = connectDB().catch((error) => {
      // Let the next request try again instead of caching a failure forever.
      connecting = undefined;
      throw error;
    });
  }
  return connecting;
}

module.exports = async function handler(req, res) {
  try {
    await ensureDatabase();
  } catch (error) {
    console.error('[database]', error.message);
    res.status(503).json({ message: 'The database is not reachable right now. Please try again shortly.' });
    return;
  }
  return app(req, res);
};
