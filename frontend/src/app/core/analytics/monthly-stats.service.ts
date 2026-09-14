import { Injectable, computed } from '@angular/core';
import { IncomeService } from '../income/income.service';
import {
  AppTransaction,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  buildTransactions,
  categoryLabel,
  parseDate,
  paymentLabel,
} from '../income/transaction.model';

/** Colores por categoría de gasto (y 'otro' para categorías fuera del catálogo). */
export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  transporte: '#4FC3F7',
  alimentacion: '#81C784',
  servicios: '#BA68C8',
  entretenimiento: '#FFB74D',
  otro: '#9E9E9E',
};

/** Colores por método de pago (y 'otro' para métodos fuera del catálogo). */
export const PAYMENT_METHOD_COLORS: Record<string, string> = {
  efectivo: '#4FC3F7',
  debito: '#9575CD',
  credito: '#FFB74D',
  transferencia: '#81C784',
  otro: '#9E9E9E',
};

/** El backend entrega fecha como ISO timestamp (ej. 2026-09-08T00:00:00.000Z);
 *  aquí solo importa el día en formato local YYYY-MM-DD. */
function toDate(value: string): Date {
  return parseDate(value.slice(0, 10));
}

/**
 * Estadísticas del mes en curso calculadas a partir de las transacciones
 * (fuente única compartida entre el Dashboard y Estadísticas).
 * Al ser señales computadas, cualquier cambio en ingresos/egresos se
 * refleja en ambas vistas de forma reactiva.
 */
@Injectable({ providedIn: 'root' })
export class MonthlyStatsService {
  constructor(private income: IncomeService) {}

  /** Todas las transacciones del sistema (ingresos + egresos). */
  readonly allTxns = computed<AppTransaction[]>(() =>
    buildTransactions(
      this.income.incomeTransactions(),
      this.income.expenseTransactions()
    )
  );

  /** Transacciones del mes en curso. */
  readonly monthlyTxns = computed(() => {
    const now = new Date();
    return this.allTxns().filter((t) => {
      const d = toDate(t.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  });

  /** Flujo (ingresos − egresos) de cada semana del mes actual. */
  readonly monthlyFlow = computed(() => {
    const buckets = [0, 0, 0, 0];
    for (const t of this.monthlyTxns()) {
      const day = toDate(t.date).getDate();
      const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
      buckets[idx] += t.type === 'ingreso' ? t.amount : -t.amount;
    }
    return buckets.map((v) => Math.round(v * 100) / 100);
  });

  /** Dinero restante del mes = ingresos − egresos. */
  readonly monthlyRestante = computed(() =>
    this.monthlyFlow().reduce((acc, v) => acc + v, 0)
  );

  /** Total gastado en el mes (egresos). */
  readonly monthlyGastado = computed(() =>
    this.monthlyTxns()
      .filter((t) => t.type === 'egreso')
      .reduce((acc, t) => acc + t.amount, 0)
  );

  /**
   * Total gastado por categoría en el mes (para la gráfica de barras).
   * Devuelve una barra por categoría (nombre, color y valor).
   */
  readonly expenseByCategory = computed(() => {
    const categories = [...EXPENSE_CATEGORIES, 'otro'];
    const totals = categories.map(() => 0);

    for (const t of this.monthlyTxns()) {
      if (t.type !== 'egreso') continue;
      const catIdx = (EXPENSE_CATEGORIES as readonly string[]).indexOf(
        t.category ?? ''
      );
      const idx = catIdx === -1 ? categories.length - 1 : catIdx;
      totals[idx] += t.amount;
    }

    return categories.map((name, i) => ({
      name: categoryLabel(name),
      color: EXPENSE_CATEGORY_COLORS[name] ?? EXPENSE_CATEGORY_COLORS['otro'],
      value: Math.round(totals[i] * 100) / 100,
    }));
  });

  /**
   * Total gastado por método de pago en el mes (para la gráfica de pastel).
   * Devuelve rebanadas con nombre, color y valor.
   */
  readonly expenseByPaymentMethod = computed(() => {
    const methods = [...PAYMENT_METHODS, 'otro'];
    const totals = methods.map(() => 0);

    for (const t of this.monthlyTxns()) {
      if (t.type !== 'egreso') continue;
      const idx = (PAYMENT_METHODS as readonly string[]).indexOf(
        t.paymentMethod ?? ''
      );
      const i = idx === -1 ? methods.length - 1 : idx;
      totals[i] += t.amount;
    }

    return methods.map((name, i) => ({
      name: paymentLabel(name),
      color: PAYMENT_METHOD_COLORS[name] ?? PAYMENT_METHOD_COLORS['otro'],
      value: Math.round(totals[i] * 100) / 100,
    }));
  });
}