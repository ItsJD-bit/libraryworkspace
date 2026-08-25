import 'dotenv/config';
import app from './app.js';
import { ensureBookCirculationSchema, ensureInternetSessionSchema } from './db/pool.js';
import { environment } from './config/environment.js';

await ensureInternetSessionSchema();
await ensureBookCirculationSchema();

app.listen(environment.port, '0.0.0.0', () => {
  console.log(`Book Catalog AI listening on http://localhost:${environment.port}`);
  console.log(`Network access: http://<this-computer-ip>:${environment.port}`);
});
