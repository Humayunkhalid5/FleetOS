require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const bootstrap = require('./data/bootstrap');
const { initSocket } = require('./socket');
const http = require('http');

const START_PORT = process.env.PORT ? Number(process.env.PORT) : 0;

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

