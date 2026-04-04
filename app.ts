import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import session from 'express-session';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Favicon handler at the very top to avoid middleware overhead/errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Trust proxy for Vercel/Cloud Run
app.set('trust proxy', 1);

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'cpicrs-secret-key',
  resave: false,
  saveUninitialized: true, // Changed to true to ensure session existence
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Global Variables for Views
app.use((req, res, next) => {
  if (req.session) {
    res.locals.user = req.session.user || null;
    res.locals.success_msg = req.session.success_msg || null;
    res.locals.error_msg = req.session.error_msg || null;
    // Safely delete session messages
    const sessionAny = req.session as any;
    delete sessionAny.success_msg;
    delete sessionAny.error_msg;
  } else {
    res.locals.user = null;
    res.locals.success_msg = null;
    res.locals.error_msg = null;
  }
  next();
});

// Routes
import publicRoutes from './routes/public';
import adminRoutes from './routes/admin';

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).render('error', { 
    error: new Error('The page you are looking for does not exist.')
  });
});

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', err);
  const status = err.status || 500;
  res.status(status).render('error', { 
    error: {
      message: err.message || 'An unexpected error occurred.',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
});

export default app;
