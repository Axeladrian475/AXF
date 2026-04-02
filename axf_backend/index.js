// ============================================================================
//  index.js  —  AXF Backend (con chat + motor de strikes automático)
//
//  CAMBIOS respecto a la versión anterior:
//    1. import reportesRoutes          → rutas del módulo de alertas
//    2. import { procesarStrikes }     → motor de escalada
//    3. setInterval(procesarStrikes)   → ejecuta cada hora automáticamente
//    4. app.use('/api/reportes', ...)  → registrar rutas
// ============================================================================

import './env.js';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import pool from './config/database.js';
import { initSocket } from './config/socket.js';

// ── Rutas existentes ──────────────────────────────────────────────────────────
import authRoutes          from './routes/auth.routes.js';
import sucursalesRoutes    from './routes/sucursales.routes.js';
import personalRoutes      from './routes/personal.routes.js';
import suscriptoresRoutes  from './routes/suscriptores.routes.js';
import suscripcionesRoutes from './routes/suscripciones.routes.js';
import promocionesRoutes   from './routes/promociones.routes.js';
import incidenciasRoutes   from './routes/incidencias.routes.js';
import avisosRoutes        from './routes/avisos.routes.js';
import recompensasRoutes   from './routes/recompensas.routes.js';
import dashboardRoutes     from './routes/dashboard.routes.js';
import nutricionRoutes     from './routes/nutricion.routes.js';
import entrenamientoRoutes from './routes/entrenamiento.routes.js';
import hardwareRoutes      from './routes/hardware.routes.js';
import pagosRoutes         from './routes/pagos.routes.js';
import chatRoutes          from './routes/chat.routes.js';
import reportesRoutes      from './routes/reportes.routes.js';   // ← NUEVO

// ── Motor de strikes ─────────────────────────────────────────────────────────
import { procesarStrikes } from './services/strikes.service.js';  // ← NUEVO

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ── Registro de rutas ─────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/sucursales',    sucursalesRoutes);
app.use('/api/personal',      personalRoutes);
app.use('/api/suscriptores',  suscriptoresRoutes);
app.use('/api/suscripciones', suscripcionesRoutes);
app.use('/api/promociones',   promocionesRoutes);
app.use('/api/incidencias',   incidenciasRoutes);
app.use('/api/avisos',        avisosRoutes);
app.use('/api/recompensas',   recompensasRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/nutricion',     nutricionRoutes);
app.use('/api/entrenamiento', entrenamientoRoutes);
app.use('/api/hardware',      hardwareRoutes);
app.use('/api/pagos',         pagosRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/reportes',      reportesRoutes);   // ← NUEVO

// ── Crear httpServer y adjuntar Socket.io ─────────────────────────────────────
const httpServer = createServer(app);
initSocket(httpServer);

// ── Motor automático de escalada de strikes ───────────────────────────────────
//  Se ejecuta cada hora. En producción puedes cambiar el intervalo o usar
//  un cron job externo (node-cron, crontab, etc.).
const INTERVALO_STRIKES_MS = 60 * 60 * 1_000; // 1 hora

function iniciarMotorStrikes() {
  console.log(`[STRIKES] 🕐 Motor iniciado. Ciclo cada ${INTERVALO_STRIKES_MS / 60_000} minutos.`);
  // Primera ejecución al arrancar (útil para no esperar 1h en desarrollo)
  procesarStrikes().catch(err => console.error('[STRIKES] Error inicial:', err.message));
  // Ejecuciones periódicas
  setInterval(() => {
    procesarStrikes().catch(err => console.error('[STRIKES] Error en ciclo:', err.message));
  }, INTERVALO_STRIKES_MS);
}

// ── Iniciar servidor ──────────────────────────────────────────────────────────
async function startServer() {
  try {
    const connection = await pool.getConnection();
    console.log(`[DB] Connected to ${process.env.DB_NAME}`);
    connection.release();

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`[SERVER] Listening on port ${PORT}`);
      console.log(`[WS]     Socket.io listo en ws://localhost:${PORT}`);
      // Iniciar motor de strikes después de que el servidor esté listo
      iniciarMotorStrikes();
    });
  } catch (error) {
    console.error('[DB] Connection error:', error.message);
    process.exit(1);
  }
}

startServer();