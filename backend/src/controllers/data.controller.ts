import { Request, Response } from 'express';

/**
 * Los controladores reciben el usuario autenticado desde el middleware.
 * El middleware coloca req.user (email + userId) tras verificar el JWT.
 * Mediante helper requireUser nos aseguramos de que exista.
 */
function requireUser(req: Request): number | null {
  const userId = req.user?.userId;
  return typeof userId === 'number' ? userId : null;
}

// ===== Usuario (config de ingresos) =====
export async function getUsuario(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const config = await req.app.locals.usuarioRepo.findIncomeConfig(userId);
  if (!config) {
    res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    return;
  }
  res.json({ success: true, data: config });
}

export async function updateUsuario(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const { fixedIncome, variableHours, variableRate } = req.body ?? {};
  await req.app.locals.usuarioRepo.updateIncomeConfig(userId, {
    fixedIncome: Number(fixedIncome) || 0,
    variableHours: Number(variableHours) || 0,
    variableRate: Number(variableRate) || 0,
  });
  res.json({
    success: true,
    data: await req.app.locals.usuarioRepo.findIncomeConfig(userId),
  });
}

// ===== Metas =====
export async function getMetas(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  res.json({ success: true, data: await req.app.locals.metaRepo.findAllByUser(userId) });
}

export async function createMeta(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const { tipo, titulo, descripcion, contribution, target } = req.body ?? {};
  if (!tipo || !titulo) {
    res.status(400).json({ success: false, message: 'Debe proporcionar tipo y título.' });
    return;
  }
  const meta = await req.app.locals.metaRepo.createForUser(userId, {
    tipo,
    titulo,
    descripcion,
    contribution: Number(contribution) || 0,
    target: Number(target) || 0,
  });
  res.status(201).json({ success: true, data: meta });
}

export async function updateMeta(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const meta = await req.app.locals.metaRepo.updateForUser(userId, Number(req.params.id), req.body ?? {});
  if (!meta) {
    res.status(404).json({ success: false, message: 'Meta no encontrada.' });
    return;
  }
  res.json({ success: true, data: meta });
}

export async function deleteMeta(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const deleted = await req.app.locals.metaRepo.removeForUser(userId, Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Meta no encontrada.' });
    return;
  }
  res.json({ success: true, message: 'Meta eliminada.' });
}

// ===== Categorías de presupuesto =====
export async function getCategorias(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  res.json({ success: true, data: await req.app.locals.categoriaRepo.findAllByUser(userId) });
}

export async function createCategoria(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const { nombre, spent, budget } = req.body ?? {};
  if (!nombre) {
    res.status(400).json({ success: false, message: 'El nombre de la categoría es obligatorio.' });
    return;
  }
  const categoria = await req.app.locals.categoriaRepo.createForUser(userId, {
    nombre,
    spent: Number(spent) || 0,
    budget: Number(budget) || 0,
  });
  res.status(201).json({ success: true, data: categoria });
}

export async function updateCategoria(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const categoria = await req.app.locals.categoriaRepo.updateForUser(userId, Number(req.params.id), req.body ?? {});
  if (!categoria) {
    res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    return;
  }
  res.json({ success: true, data: categoria });
}

export async function deleteCategoria(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const deleted = await req.app.locals.categoriaRepo.removeForUser(userId, Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Categoría no encontrada.' });
    return;
  }
  res.json({ success: true, message: 'Categoría eliminada.' });
}

// ===== Transacciones de ingreso =====
export async function getTransacciones(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  res.json({ success: true, data: await req.app.locals.transaccionRepo.findAllByUser(userId) });
}

export async function createTransaccion(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const { monto, nota, fecha } = req.body ?? {};
  if (monto === undefined) {
    res.status(400).json({ success: false, message: 'El monto es obligatorio.' });
    return;
  }
  const transaccion = await req.app.locals.transaccionRepo.createForUser(userId, {
    monto: Number(monto),
    nota: nota ?? null,
    fecha: fecha ?? new Date().toISOString().slice(0, 10),
  });
  res.status(201).json({ success: true, data: transaccion });
}

export async function deleteTransaccion(req: Request, res: Response): Promise<void> {
  const userId = requireUser(req);
  if (userId === null) {
    res.status(401).json({ success: false, message: 'No autenticado.' });
    return;
  }
  const deleted = await req.app.locals.transaccionRepo.removeForUser(userId, Number(req.params.id));
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Transacción no encontrada.' });
    return;
  }
  res.json({ success: true, message: 'Transacción eliminada.' });
}