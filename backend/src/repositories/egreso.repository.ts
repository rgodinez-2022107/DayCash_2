import { pool } from '../db/pool';

export interface EgresoRow {
  id: number;
  monto: string;
  categoria: string;
  metodo_pago: string;
  etiqueta: string | null;
  nota: string | null;
  fecha: string;
}

export async function findAllByUser(usuarioId: number): Promise<EgresoRow[]> {
  const { rows } = await pool.query<EgresoRow>(
    'SELECT id, monto, categoria, metodo_pago, etiqueta, nota, fecha FROM egresos WHERE usuario_id = $1 ORDER BY fecha DESC, id DESC',
    [usuarioId]
  );
  return rows;
}

export async function createForUser(
  usuarioId: number,
  data: { monto: number; categoria: string; metodo_pago: string; etiqueta?: string; nota?: string; fecha: string }
): Promise<EgresoRow> {
  const { rows } = await pool.query<EgresoRow>(
    `INSERT INTO egresos (usuario_id, monto, categoria, metodo_pago, etiqueta, nota, fecha)
     VALUES ($1, $2, $3, $4, $5, $6, $7::date)
     RETURNING id, monto, categoria, metodo_pago, etiqueta, nota, fecha`,
    [usuarioId, data.monto, data.categoria, data.metodo_pago, data.etiqueta ?? null, data.nota ?? null, data.fecha]
  );
  return rows[0];
}

export async function removeForUser(usuarioId: number, egresoId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM egresos WHERE id = $2 AND usuario_id = $1',
    [usuarioId, egresoId]
  );
  return (rowCount ?? 0) > 0;
}
