import { IncomeTransaction, ExpenseTransaction } from './income.service';

/**
 * Modelo unificado de transacción de la aplicación.
 * Cada movimiento (ingreso o egreso) se representa con esta forma
 * para alimentar Historial, Estadísticas y exportaciones.
 */
export type TransactionType = 'ingreso' | 'egreso';

export interface AppTransaction {
  id?: number;
  type: TransactionType;
  amount: number;
  date: string; // 'YYYY-MM-DD'
  category?: string;
  paymentMethod?: string;
  label?: string;
  note?: string;
}

/** Catálogo de categorías de egreso (valores que persiste el backend). */
export const EXPENSE_CATEGORIES = [
  'transporte',
  'alimentacion',
  'servicios',
  'entretenimiento',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  transporte: 'Transporte',
  alimentacion: 'Alimentación',
  servicios: 'Servicios Básicos',
  entretenimiento: 'Entretenimiento',
};

export const PAYMENT_METHODS = [
  'efectivo',
  'debito',
  'credito',
  'transferencia',
] as const;

export const PAYMENT_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Tarjeta de Débito',
  credito: 'Tarjeta de Crédito',
  transferencia: 'Transferencia Bancaria',
};

export const TX_LABELS = ['personal', 'urgente', 'trabajo', 'hogar'] as const;

export const LABEL_LABELS: Record<string, string> = {
  personal: 'Personal',
  urgente: 'Urgente',
  trabajo: 'Trabajo',
  hogar: 'Hogar',
};

export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key] ?? key;
}

export function paymentLabel(key: string): string {
  return PAYMENT_LABELS[key] ?? key;
}

export function txLabel(key: string): string {
  return LABEL_LABELS[key] ?? key;
}

/** Interpreta la fecha de un movimiento como objeto Date local (sin zona horaria). */
export function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

/** Fecha actual en formato YYYY-MM-DD (hora local). */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

/**
 * Fusiona el historial de ingresos y egresos en una sola lista,
 * más recientes primero, con la forma unificada AppTransaction.
 */
export function buildTransactions(
  income: IncomeTransaction[],
  expenses: ExpenseTransaction[]
): AppTransaction[] {
  const incomeTxns: AppTransaction[] = income.map((t) => ({
    id: t.id,
    type: 'ingreso',
    amount: t.amount,
    date: t.date,
    note: t.note,
  }));

  const expenseTxns: AppTransaction[] = expenses.map((e) => ({
    id: e.id,
    type: 'egreso',
    amount: e.amount,
    date: e.date,
    category: e.category,
    paymentMethod: e.paymentMethod,
    label: e.label,
    note: e.note,
  }));

  return [...incomeTxns, ...expenseTxns].sort((a, b) =>
    a.date === b.date ? (a.id ?? 0) - (b.id ?? 0) : b.date.localeCompare(a.date)
  );
}