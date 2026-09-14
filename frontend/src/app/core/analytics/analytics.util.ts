import { AppTransaction, categoryLabel, parseDate } from '../income/transaction.model';

/**
 * Utilidades puras de analítica financiera.
 * Reciben la lista unificada de transacciones y producen las
 * agregaciones que alimentan la sección de Estadísticas.
 */
export type PeriodKey = 'semanal' | 'mensual' | 'anual';

export interface MetricSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
}

export interface Bucket {
  label: string;
  income: number;
  expense: number;
}

export interface CategoryShare {
  key: string;
  label: string;
  amount: number;
  percent: number;
}

export interface PeriodWindow {
  from: Date;
  to: Date;
}

const MS_DAY = 86_400_000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_DAY);
}

function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7; // 0 = lunes
  return addDays(startOfDay(date), -day);
}

/**
 * Ventana de fechas (de + a) según el periodo seleccionado.
 * - semanal: semana actual y las 4 anteriores (5 semanas)
 * - mensual: últimos 6 meses
 * - anual: últimos 12 meses
 */
export function computeWindow(period: PeriodKey, now: Date = new Date()): PeriodWindow {
  const today = startOfDay(now);
  switch (period) {
    case 'semanal':
      return { from: addDays(startOfWeek(today), -28), to: today };
    case 'mensual':
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 5, 1),
        to: today,
      };
    case 'anual':
      return {
        from: new Date(today.getFullYear(), today.getMonth() - 11, 1),
        to: today,
      };
  }
}

/** Filtra las transacciones dentro de un rango inclusivo [from, to]. */
export function filterByWindow(
  txns: AppTransaction[],
  window: PeriodWindow
): AppTransaction[] {
  const fromKey = toKey(window.from);
  const toKeyEnd = toKey(window.to);
  return txns.filter((t) => t.date >= fromKey && t.date <= toKeyEnd);
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function keyToLabel(key: string, shortMonth: boolean): string {
  const date = parseDate(key);
  const month = date.toLocaleDateString('es-GT', { month: shortMonth ? 'short' : 'long' });
  if (shortMonth) return normalizeMonth(month);
  return `${month} ${date.getFullYear()}`;
}

function normalizeMonth(month: string): string {
  const map: Record<string, string> = { ene: 'Ene', feb: 'Feb', mar: 'Mar', abr: 'Abr', may: 'May', jun: 'Jun', jul: 'Jul', ago: 'Ago', sep: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dic' };
  const short = month.slice(0, 3);
  return map[short] ?? short;
}

/** Agrupa ingresos y egresos por periodo de tiempo (barras de comparativa). */
export function aggregateByPeriod(
  txns: AppTransaction[],
  period: PeriodKey,
  now: Date = new Date()
): Bucket[] {
  const window = computeWindow(period, now);
  const buckets: Bucket[] = [];

  if (period === 'semanal') {
    const today = startOfDay(now);
    const weekStart = startOfWeek(today);
    for (let i = 4; i >= 0; i--) {
      const start = addDays(weekStart, -7 * i);
      const label = `${String(start.getDate()).padStart(2, '0')}/${String(
        start.getMonth() + 1
      ).padStart(2, '0')}`;
      buckets.push({ label, income: 0, expense: 0 });
    }
  } else {
    const months = period === 'mensual' ? 6 : 12;
    const today = startOfDay(now);
    let startCursor = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
    for (let i = 0; i < months; i++) {
      const monthYear = `${startCursor.getFullYear()}-${String(
        startCursor.getMonth() + 1
      ).padStart(2, '0')}`;
      const dateKey = `${monthYear}-01`;
      buckets.push({ label: keyToLabel(dateKey, period === 'mensual'), income: 0, expense: 0 });
      startCursor = new Date(startCursor.getFullYear(), startCursor.getMonth() + 1, 1);
    }
  }

  const fromKey = toKey(window.from);
  toKey(window.to);
  for (const t of txns) {
    if (t.date < fromKey) continue;
    const idx = indexOfBucket(buckets, t, period);
    if (idx === -1) continue;
    if (t.type === 'ingreso') buckets[idx].income += t.amount;
    else buckets[idx].expense += t.amount;
  }

  return buckets;
}

function indexOfBucket(buckets: Bucket[], t: AppTransaction, period: PeriodKey): number {
  const date = parseDate(t.date);
  if (period === 'semanal') {
    const bucketStart = startOfWeek(date);
    const label = `${String(bucketStart.getDate()).padStart(2, '0')}/${String(
      bucketStart.getMonth() + 1
    ).padStart(2, '0')}`;
    return buckets.findIndex((b) => b.label === label);
  }
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  const expected = keyToLabel(monthKey, period === 'mensual');
  return buckets.findIndex((b) => b.label === expected);
}

/** Resumen de métricas: ingresos, egresos, balance neto y tasa de ahorro. */
export function computeSummary(txns: AppTransaction[]): MetricSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  for (const t of txns) {
    if (t.type === 'ingreso') totalIncome += t.amount;
    else totalExpense += t.amount;
  }
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((balance / totalIncome) * 100) : 0;
  return { totalIncome, totalExpense, balance, savingsRate };
}

/** Distribución porcentual de egresos por categoría (donut + barras horizontales). */
export function sumByCategory(txns: AppTransaction[]): CategoryShare[] {
  const totals = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== 'egreso') continue;
    const key = t.category?.trim() || 'sin-categoria';
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }

  const total = Array.from(totals.values()).reduce((a, b) => a + b, 0);
  if (total <= 0) return [];

  return Array.from(totals.entries())
    .map(([key, amount]) => ({
      key,
      label: categoryLabel(key),
      amount,
      percent: Math.round((amount / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}