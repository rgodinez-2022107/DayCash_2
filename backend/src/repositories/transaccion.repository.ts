import { pool } from '../db/pool';

export interface TransaccionRow {
  id: number;
  monto: string;
  nota: string | null;
  fecha: string;
}

/** Devuelve el historial de transacciones de un usuario (más recientes primero). */
export async function findAllByUser(usuarioId: number): Promise<TransaccionRow[]> {
  const { rows } = await pool.query<TransaccionRow>(
    'SELECT id, monto, nota, fecha FROM transacciones WHERE usuario_id = $1 ORDER BY fecha DESC, id DESC',
    [usuarioId]
  );
  return rows;
}

/** Crea una transacción de ingreso y devuelve la fila creada. */
export async function createForUser(
  usuarioId: number,
  data: { monto: number; nota?: string; fecha: string }
): Promise<TransaccionRow> {
  const { rows } = await pool.query<TransaccionRow>(
    `INSERT INTO transacciones (usuario_id, monto, nota, fecha)
     VALUES ($1, $2, $3, $4::date)
     RETURNING id, monto, nota, fecha`,
    [usuarioId, data.monto, data.nota ?? null, data.fecha]
  );
  return rows[0];
}

/** Elimina una transacción del usuario. Devuelve true si se eliminó algo. */
export async function removeForUser(usuarioId: number, transaccionId: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    'DELETE FROM transacciones WHERE id = $2 AND usuario_id = $1',
    [usuarioId, transaccionId]
  );
  return (rowCount ?? 0) > 0;
}