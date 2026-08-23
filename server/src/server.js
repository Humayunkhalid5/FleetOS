require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');
const { getJwtSecret } = require('./config/security');
const bootstrap = require('./data/bootstrap');
const { initSocket } = require('./socket');

const port = Number(process.env.PORT || 5000);
let server;

function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return;
  getJwtSecret();
  if (!String(process.env.CORS_ORIGINS || '').trim()) {
    throw new Error('CORS_ORIGINS is required in production. Add the deployed client and admin origins.');
  }
}

async function start() {
  try {
    validateProductionConfig();
    await connectDB();
    await bootstrap();
    server = http.createServer(app);
    initSocket(server);
    await new Promise((resolve, reject) => {
      const onError = (error) => reject(error);
      server.once('error', onError);
      server.listen(port, '0.0.0.0', () => {
        server.removeListener('error', onError);
        console.log(`FleetOS API listening on http://localhost:${port}`);
        resolve();
      });
    });
  } catch (error) {
    console.error(`FleetOS failed to start: ${error.message}`);
    if (String(error.message).includes('ECONNREFUSED')) {
      console.error('Start MongoDB Community Server, then run npm run dev again. MongoDB Compass alone is not a database server.');
    }
    process.exit(1);
  }
}

start();

async function shutdown(signal) {
  console.log(`${signal} received; closing FleetOS connections.`);
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.close().catch(() => {});
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
