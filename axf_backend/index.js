import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import sucursalesRoutes from './routes/sucursales.routes.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Montar rutas
app.use('/api/auth', authRoutes);
app.use('/api/sucursales', sucursalesRoutes);

async function startServer() {
  try {
    // Verificar conexión antes de levantar el servidor
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