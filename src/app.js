import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bookRoutes from './routes/bookRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import circulationRoutes from './routes/circulationRoutes.js';
import databaseRoutes from './routes/databaseRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import internetRoutes from './routes/internetRoutes.js';
import patronRoutes from './routes/patronRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import accountRoutes from './routes/accountRoutes.js';
import { requireAdminPage } from './middleware/requireAdmin.js';

const app = express();
const publicDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const viewsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'views');

app.set('view engine', 'ejs');
app.set('views', viewsDirectory);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(session({
	secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
	resave: false,
	saveUninitialized: false,
	cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));
app.use((request, response, next) => {
	response.locals.account = request.session?.account || null;
	next();
});
app.use(express.static(publicDirectory));
app.get('/', requireAdminPage, (request, response) => response.render('index'));
app.get(['/attendance-monitoring', '/attendance-monitoring.html'], requireAdminPage, (request, response) => response.render('attendance-monitoring'));
app.get(['/book-management', '/book-management.html'], requireAdminPage, (request, response) => response.render('book-management'));
app.get(['/catalog', '/catalog.html'], requireAdminPage, (request, response) => response.render('catalog'));
app.get(['/circulation', '/circulation.html'], requireAdminPage, (request, response) => response.render('circulation'));
app.get(['/discussion-room', '/discussion-room.html'], requireAdminPage, (request, response) => response.render('discussion-room'));
app.get(['/internet-room', '/internet-room.html'], requireAdminPage, (request, response) => response.render('internet-room'));
app.get(['/patron-registration', '/patron-registration.html'], requireAdminPage, (request, response) => response.render('patron-registration'));
app.get(['/patron-view', '/patron-view.html'], (request, response) => response.render('patron-view'));
app.get(['/patrons', '/patrons.html'], requireAdminPage, (request, response) => response.render('patrons'));
app.get(['/reports', '/reports.html'], requireAdminPage, (request, response) => response.render('reports'));
app.get('/admin-login', (request, response) => response.render('admin-login'));
app.get('/account-manager', requireAdminPage, (request, response) => response.render('account-manager', { account: request.session.account }));
app.use(accountRoutes);
app.use(healthRoutes);
app.use(databaseRoutes);
app.use(catalogRoutes);
app.use(bookRoutes);
app.use(circulationRoutes);
app.use(internetRoutes);
app.use(patronRoutes);
app.use(reportRoutes);
app.use(errorHandler);

export default app;
