import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import sucursalesRoutes from './routes/sucursales.routes.js';
import personalRoutes from './routes/personal.routes.js';

dotenv.config();

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// En Express 5 el wildcard '*' no funciona, se omite el app.options manual
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ── Servir fotos del personal estáticamente ───────────────────────────────────
// Las fotos se acceden como: http://localhost:3001/uploads/personal/archivo.jpg
app.use('/uploads', express.static('uploads'));

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/personal', personalRoutes);

// ── Iniciar servidor ──────────────────────────────────────────────────────────
async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Connected to ${process.env.DB_NAME}`);
    connection.release();

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`[SERVER] Listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('[DB] Connection error:', error.message);
    process.exit(1);
  }
}

startServer();