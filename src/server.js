import 'dotenv/config';
import app from './app.js';
import { environment } from './config/environment.js';

app.listen(environment.port, () => {
  console.log(`Book Catalog AI listening on http://localhost:${environment.port}`);
});
