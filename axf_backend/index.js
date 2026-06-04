// ============================================================================
//  index.js  —  AXF Backend (con chat + motor de strikes automático)
//
//  CAMBIOS respecto a la versión anterior:
//    1. import reportesRoutes          → rutas del módulo de alertas
//    2. import { procesarStrikes }     → motor de escalada
//    3. setInterval(procesarStrikes)   → ejecuta cada 24 horas automáticamente
//    4. app.use('/api/reportes', ...)  → registrar rutas
//    5. import movilNutricionRoutes    → rutas móviles de nutrición  ← NUEVO
//    6. app.use('/api/movil/nutricion',...)                          ← NUEVO
// ============================================================================

import './env.js';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import pool from './config/database.js';
import { initSocket } from './config/socket.js';

// ── Rutas existentes ──────────────────────────────────────────────────────────
import authRoutes             from './routes/auth.routes.js';
import sucursalesRoutes       from './routes/sucursales.routes.js';
import personalRoutes         from './routes/personal.routes.js';
import suscriptoresRoutes     from './routes/suscriptores.routes.js';
import suscripcionesRoutes    from './routes/suscripciones.routes.js';
import promocionesRoutes      from './routes/promociones.routes.js';
import incidenciasRoutes      from './routes/incidencias.routes.js';
import avisosRoutes           from './routes/avisos.routes.js';
import recompensasRoutes      from './routes/recompensas.routes.js';
import dashboardRoutes        from './routes/dashboard.routes.js';
import nutricionRoutes        from './routes/nutricion.routes.js';
import entrenamientoRoutes    from './routes/entrenamiento.routes.js';
import hardwareRoutes         from './routes/hardware.routes.js';
import pagosRoutes            from './routes/pagos.routes.js';
import chatRoutes             from './routes/chat.routes.js';
import reportesRoutes         from './routes/reportes.routes.js';
import movilNutricionRoutes    from './routes/movil.nutricion.routes.js';
import movilEntrenamientoRoutes from './routes/movil.entrenamiento.routes.js';
import movilTiendaRoutes        from './routes/movil.tienda.routes.js';
import maestroRoutes             from './routes/maestro.routes.js';
import notificacionesSucursalRoutes from './routes/notificaciones_sucursal.routes.js';

// ── Motor de strikes ─────────────────────────────────────────────────────────
import { procesarStrikes }      from './services/strikes.service.js';
import { iniciarRecordatorios } from './services/recordatorio.service.js';

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
app.use('/api/auth',              authRoutes);
app.use('/api/sucursales',        sucursalesRoutes);
app.use('/api/personal',          personalRoutes);
app.use('/api/suscriptores',      suscriptoresRoutes);
app.use('/api/suscripciones',     suscripcionesRoutes);
app.use('/api/promociones',       promocionesRoutes);
app.use('/api/incidencias',       incidenciasRoutes);
app.use('/api/avisos',            avisosRoutes);
app.use('/api/recompensas',       recompensasRoutes);
app.use('/api/dashboard',         dashboardRoutes);
app.use('/api/nutricion',         nutricionRoutes);
app.use('/api/entrenamiento',     entrenamientoRoutes);
app.use('/api/hardware',          hardwareRoutes);
app.use('/api/pagos',             pagosRoutes);
app.use('/api/chat',              chatRoutes);
app.use('/api/reportes',          reportesRoutes);
app.use('/api/movil/nutricion',      movilNutricionRoutes);
app.use('/api/movil/entrenamiento',  movilEntrenamientoRoutes);
app.use('/api/movil/tienda',         movilTiendaRoutes);
app.use('/api/maestro',              maestroRoutes);
app.use('/api/notificaciones-sucursal', notificacionesSucursalRoutes);

// ── Crear httpServer y adjuntar Socket.io ─────────────────────────────────────
const httpServer = createServer(app);
initSocket(httpServer);

// ── Motor automático de escalada de strikes ───────────────────────────────────
const INTERVALO_STRIKES_MS = 24 * 60 * 60 * 1_000; // 24 horas

function iniciarMotorStrikes() {
  console.log(`[STRIKES] 🕐 Motor iniciado. Ciclo cada ${INTERVALO_STRIKES_MS / 60_000} minutos.`);
  procesarStrikes().catch(err => console.error('[STRIKES] Error inicial:', err.message));
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
      console.log(`[WS]     Socket.io listo en puerto ${PORT}`);
      iniciarMotorStrikes();
      iniciarRecordatorios();
    });
  } catch (error) {
    console.error('[DB] Connection error:', error.message);
    process.exit(1);
  }
}

startServer();