import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import {
  getUsuario,
  updateUsuario,
  getMetas,
  createMeta,
  updateMeta,
  deleteMeta,
  getCategorias,
  createCategoria,
  updateCategoria,
  deleteCategoria,
  getTransacciones,
  createTransaccion,
  deleteTransaccion,
} from '../controllers/data.controller';

const router = Router();

// Todas las rutas de datos requieren token JWT válido
router.use(verifyToken);

// Usuario (config de ingresos)
router.get('/usuario', getUsuario);
router.put('/usuario', updateUsuario);

// Metas
router.get('/metas', getMetas);
router.post('/metas', createMeta);
router.put('/metas/:id', updateMeta);
router.delete('/metas/:id', deleteMeta);

// Categorías de presupuesto
router.get('/categorias', getCategorias);
router.post('/categorias', createCategoria);
router.put('/categorias/:id', updateCategoria);
router.delete('/categorias/:id', deleteCategoria);

// Transacciones de ingreso
router.get('/transacciones', getTransacciones);
router.post('/transacciones', createTransaccion);
router.delete('/transacciones/:id', deleteTransaccion);

export default router;