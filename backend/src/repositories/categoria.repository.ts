import { pool } from '../db/pool';

export interface CategoriaRow {
  id: number;
  nombre: string;
  spent: string;
  budget: string;
}

/** Devuelve todas las categorías de presupuesto de un usuario. */
export async function findAllByUser(usuarioId: number): Promise<CategoriaRow[]> {
  const { rows } = await pool.query<CategoriaRow>(
    'SELECT id, nombre, spent, budget FROM categorias WHERE usuario_id = $1 ORDER BY id',
    [usuarioId]
  );
  return rows;
}

/** Crea una categoría y devuelve la fila creada. */
export async function createForUser(
  usuarioId: number,
  data: { nombre: string; spent: number; budget: number }
): Promise<CategoriaRow> {
  const { rows } = await pool.query<CategoriaRow>(
    `INSERT INTO categorias (usuario_id, nombre, spent, budget)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nombre, spent, budget`,
    [usuarioId, data.nombre, data.spent, data.budget]
  );
  return rows[0];
}

/** Actualiza una categoría del usuario. Devuelve null si no existe. */
export async function updateForUser(
  usuarioId: number,
  categoriaId: number,
  data: { nombre?: string; spent?: number; budget?: number }
): Promise<CategoriaRow | null> {
  const { rows } = await pool.query<CategoriaRow>(
    `UPDATE categorias SET
       nombre = COALESCE($3, nombre),
       spent = COALESCE($4, spent),
       budget = COALESCE($5, budget)
     WHERE id = $2 AND usuario_id = $1
     RETURNING id, nombre, spent, budget`,
    [usuarioId, categoriaId, data.nombre, data.spent, data.budget]
  );
  return rows[0] ?? null;
}

/** Elimina una categoría del usuario. Devuelve true si se eliminó algo. */
export async function removeForUser(usuarioId: number, categoriaId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM categorias WHERE id = $2 AND usuario_id = $1',
    [usuarioId, categoriaId]
  );
  return (rowCount ?? 0) > 0;
}