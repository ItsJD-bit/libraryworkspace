import 'dotenv/config';
import app from './app.js';
import { initializeDatabase } from './db/init.js';
import { ensureBookCirculationSchema, ensureInternetSessionSchema } from './db/pool.js';
import { environment } from './config/environment.js';


const startPort = Number.isInteger(environment.port) && environment.port > 0 ? environment.port : 3000;

async function startServer() {
  const maxAttempts = 10;

  for (let port = startPort; port < startPort + maxAttempts; port += 1) {
    try {
      await new Promise((resolve, reject) => {
        const server = app.listen(port, '0.0.0.0', () => {
          console.log(`Book Catalog AI listening on http://localhost:${port}`);
          console.log(`Network access: http://<this-computer-ip>:${port}`);
          resolve(server);
        });

        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            reject(error);
            return;
          }
          reject(error);
        });
      });
      return;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') {
        throw error;
      }
      if (port === startPort + maxAttempts - 1) {
        throw new Error(`Unable to start the app: no free port available from ${startPort} to ${startPort + maxAttempts - 1}.`);
      }
    }
  }
}

const databaseInitialized = await initializeDatabase();

if (!databaseInitialized) {
  throw new Error('Database schema initialization failed. Server cannot start.');
}

await ensureInternetSessionSchema();
await ensureBookCirculationSchema();
await startServer();

