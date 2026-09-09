import { pool } from '../db/pool';

export interface MetaRow {
  id: number;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  contribution: string;
  target: string;
}

/** Devuelve todas las metas de un usuario (fondo de ahorro, emergencia y personalizadas). */
export async function findAllByUser(usuarioId: number): Promise<MetaRow[]> {
  const { rows } = await pool.query<MetaRow>(
    'SELECT id, tipo, titulo, descripcion, contribution, target FROM metas WHERE usuario_id = $1 ORDER BY id',
    [usuarioId]
  );
  return rows;
}

/** Crea una meta y devuelve la fila creada. */
export async function createForUser(
  usuarioId: number,
  data: { tipo: string; titulo: string; descripcion?: string; contribution: number; target: number }
): Promise<MetaRow> {
  const { rows } = await pool.query<MetaRow>(
    `INSERT INTO metas (usuario_id, tipo, titulo, descripcion, contribution, target)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, tipo, titulo, descripcion, contribution, target`,
    [usuarioId, data.tipo, data.titulo, data.descripcion ?? null, data.contribution, data.target]
  );
  return rows[0];
}

/** Actualiza una meta que pertenezca al usuario. Devuelve null si no existe. */
export async function updateForUser(
  usuarioId: number,
  metaId: number,
  data: { titulo?: string; descripcion?: string; contribution?: number; target?: number }
): Promise<MetaRow | null> {
  const { rows } = await pool.query<MetaRow>(
    `UPDATE metas SET
       titulo = COALESCE($3, titulo),
       descripcion = COALESCE($4, descripcion),
       contribution = COALESCE($5, contribution),
       target = COALESCE($6, target)
     WHERE id = $2 AND usuario_id = $1
     RETURNING id, tipo, titulo, descripcion, contribution, target`,
    [usuarioId, metaId, data.titulo, data.descripcion, data.contribution, data.target]
  );
  return rows[0] ?? null;
}

/** Elimina una meta que pertenezca al usuario. Devuelve true si se eliminó algo. */
export async function removeForUser(usuarioId: number, metaId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM metas WHERE id = $2 AND usuario_id = $1',
    [usuarioId, metaId]
  );
  return (rowCount ?? 0) > 0;
}