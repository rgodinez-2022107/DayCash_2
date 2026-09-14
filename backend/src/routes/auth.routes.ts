import { Router } from 'express';
import { login, me, googleLogin, refresh } from '../controllers/auth.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Ruta pública: inicio de sesión del usuario único
router.post('/login', login);

// Ruta pública: inicio de sesión con Google
router.post('/google', googleLogin);

// Ruta pública: renueva el JWT (sesión deslizante según la interactividad)
router.post('/refresh', refresh);

// Ruta privada de ejemplo protegida con JWT
router.get('/me', verifyToken, me);

export default router;
