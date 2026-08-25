import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bookRoutes from './routes/bookRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import circulationRoutes from './routes/circulationRoutes.js';
import databaseRoutes from './routes/databaseRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import internetRoutes from './routes/internetRoutes.js';
import patronRoutes from './routes/patronRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(publicDirectory));
app.use(healthRoutes);
app.use(databaseRoutes);
app.use(catalogRoutes);
app.use(bookRoutes);
app.use(circulationRoutes);
app.use(internetRoutes);
app.use(patronRoutes);
app.use(errorHandler);

export default app;
