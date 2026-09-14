import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { findByEmail } from '../repositories/usuario.repository';

/**
 * Middleware que protege rutas privadas.
 * Espera el header: Authorization: Bearer <token>
 * Además de verificar el token, carga el userId del usuario en la BD.
 */
export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Acceso denegado. Token no proporcionado.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { email: string };
    const usuario = await findByEmail(decoded.email);
    if (!usuario) {
      res.status(401).json({
        success: false,
        message: 'Usuario no encontrado.',
      });
      return;
    }
    req.user = { email: decoded.email, userId: usuario.id };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido o expirado.',
    });
  }
}
