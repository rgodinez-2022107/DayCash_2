import express, { Request, Response } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { config } from './config/env';
import authRoutes from './routes/auth.routes';
import dataRoutes from './routes/data.routes';
import { testConnection } from './db/pool';
import { ensureAdminExists } from './repositories/usuario.repository';
import * as usuarioRepo from './repositories/usuario.repository';
import * as metaRepo from './repositories/meta.repository';
import * as categoriaRepo from './repositories/categoria.repository';
import * as transaccionRepo from './repositories/transaccion.repository';

const app = express();

app.use(
  cors({
    origin: config.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Repositorios de datos disponibles para los controladores vía app.locals
app.locals.usuarioRepo = usuarioRepo;
app.locals.metaRepo = metaRepo;
app.locals.categoriaRepo = categoriaRepo;
app.locals.transaccionRepo = transaccionRepo;

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'financial-login-backend' });
});

// Rutas de autenticación (login + rutas protegidas de ejemplo)
app.use('/api/auth', authRoutes);

// Rutas CRUD de datos de la aplicación (protegidas con JWT)
app.use('/api/data', dataRoutes);

// 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Recurso no encontrado.' });
});

async function startServer(): Promise<void> {
  try {
    // 1. Verificamos que PostgreSQL esté disponible
    const version = await testConnection();
    console.log(`Conexión a PostgreSQL exitosa. Versión: ${version}`);

    // 2. Aseguramos que exista el usuario administrador
    const passwordHash = bcrypt.hashSync(config.admin.password, 10);
    await ensureAdminExists(config.admin.email, passwordHash);
    console.log(`Usuario administrador garantizado: ${config.admin.email}`);

    // 3. Arrancamos Express
    app.listen(config.port, () => {
      console.log(`Servidor backend corriendo en http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor por un problema con la base de datos:', error);
    process.exit(1);
  }
}

startServer();
