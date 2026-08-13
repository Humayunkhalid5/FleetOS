require('dotenv').config();
process.env.JWT_SECRET = process.env.JWT_SECRET || 'fleetos_dev_secret_key_2026_super_secure';
const app = require('./app');
const connectDB = require('./config/db');
const bootstrap = require('./data/bootstrap');
const { initSocket } = require('./socket');
const http = require('http');

<<<<<<< HEAD
// Default to a fixed port so the Vite dev proxy (localhost:5000) can reach it.
const DEFAULT_PORT = 5000;
const START_PORT = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;
=======
const START_PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

>>>>>>> origin/aisha

const start = async () => {
  try {
    await connectDB();
    await bootstrap();
    const server = http.createServer(app);
    initSocket(server);

    const startListening = (port) => {
      server.once('error', (error) => {
        if (error.code === 'EADDRINUSE' && port !== 0) {
          console.warn(`Port ${port} is busy. Falling back to an available port...`);
          startListening(0);
        } else {
          console.error(`Failed to start server: ${error.message}`);
          process.exit(1);
        }
      });

      server.listen(port, () => {
        const address = server.address();
        console.log(`Server running on port ${address.port}`);
      });
    };

    startListening(START_PORT);
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

start();

