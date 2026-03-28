import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import hardwareRoutes from './routes/hardware.routes.js';
import pagosRoutes from './routes/pagos.routes.js';


// ── Rutas ─────────────────────────────────────────────────────────────────────
import authRoutes from './routes/auth.routes.js';
import sucursalesRoutes from './routes/sucursales.routes.js';
import personalRoutes from './routes/personal.routes.js';
import suscriptoresRoutes from './routes/suscriptores.routes.js';   // Módulo Usuarios
import suscripcionesRoutes from './routes/suscripciones.routes.js';
import promocionesRoutes from './routes/promociones.routes.js';
import incidenciasRoutes from './routes/incidencias.routes.js';
import avisosRoutes from './routes/avisos.routes.js';
import recompensasRoutes from './routes/recompensas.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import nutricionRoutes from './routes/nutricion.routes.js';
import entrenamientoRoutes from './routes/entrenamiento.routes.js';

dotenv.config();

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ── Archivos estáticos ────────────────────────────────────────────────────────
app.use('/uploads', express.static('uploads'));

// ── Registro de rutas ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/sucursales', sucursalesRoutes);
app.use('/api/personal', personalRoutes);
app.use('/api/suscriptores', suscriptoresRoutes);
app.use('/api/suscripciones', suscripcionesRoutes);
app.use('/api/promociones', promocionesRoutes);
app.use('/api/incidencias', incidenciasRoutes);
app.use('/api/avisos', avisosRoutes);
app.use('/api/recompensas', recompensasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/nutricion', nutricionRoutes);
app.use('/api/entrenamiento', entrenamientoRoutes);
app.use('/api/hardware', hardwareRoutes);
app.use('/api/pagos', pagosRoutes);


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