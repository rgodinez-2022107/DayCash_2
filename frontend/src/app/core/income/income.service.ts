import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IncomeCategory {
  id?: number;
  name: string;
  spent: number;
  budget: number;
}

export interface Goal {
  id?: number;
  type?: string;
  title: string;
  description: string;
  contribution: number;
  target: number;
}

export interface IncomeTransaction {
  id?: number;
  amount: number;
  note: string;
  date: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface MetaApi {
  id: number;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  contribution: string;
  target: string;
}

interface CategoriaApi {
  id: number;
  nombre: string;
  spent: string;
  budget: string;
}

interface TransaccionApi {
  id: number;
  monto: string;
  nota: string | null;
  fecha: string;
}

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly apiUrl = `${environment.apiUrl}/data`;

  // Ingreso fijo mensual
  readonly fixedIncome = signal<number>(15000);

  // Ingreso variable
  readonly variableHours = signal<number>(0);
  readonly variableRate = signal<number>(100);

  // Comentario/nota del registro de ingreso (opcional)
  readonly incomeNote = signal<string>('');

  // Subtotal variable (horas * tarifa), calculado
  get variableSubtotal(): number {
    return this.variableHours() * this.variableRate();
  }

  // Ingreso mensual total = fijo + variable
  get monthlyTotal(): number {
    return this.fixedIncome() + this.variableSubtotal;
  }

  // Metas y fondos: cada meta tiene título, descripción, aporte y total
  readonly savingsGoal = signal<Goal>({
    title: 'Fondo de Ahorro para Metas',
    description: 'Ahorro orientado a tus objetivos',
    contribution: 0,
    target: 0,
  });

  readonly budgetCategories = signal<IncomeCategory[]>([
    { name: 'Groceries', spent: 0, budget: 0 },
    { name: 'Transport', spent: 0, budget: 0 },
    { name: 'Dining', spent: 0, budget: 0 },
  ]);

  readonly emergencyGoal = signal<Goal>({
    title: 'Fondo de Emergencia',
    description: 'Colchón de seguridad financiera',
    contribution: 0,
    target: 0,
  });

  // Metas personalizadas creadas por el usuario
  readonly customGoals = signal<Goal[]>([]);

  // Historial de transacciones de ingresos registradas (con comentario opcional)
  readonly incomeTransactions = signal<IncomeTransaction[]>([]);

  // Evita crear dos metas de ahorro/emergencia si se escribe rápido antes del response
  private creatingGoal: 'savingsGoal' | 'emergencyGoal' | null = null;

  constructor(private http: HttpClient) {}

  // ===== Carga inicial desde PostgreSQL (vía la API) =====
  async loadFromApi(): Promise<void> {
    try {
      const [metas, categorias, transacciones, usuario] = await Promise.all([
        lastValueFrom(this.http.get<ApiResponse<MetaApi[]>>(`${this.apiUrl}/metas`)),
        lastValueFrom(this.http.get<ApiResponse<CategoriaApi[]>>(`${this.apiUrl}/categorias`)),
        lastValueFrom(this.http.get<ApiResponse<TransaccionApi[]>>(`${this.apiUrl}/transacciones`)),
        lastValueFrom(this.http.get<ApiResponse<{ fixedIncome: number; variableHours: number; variableRate: number }>>(`${this.apiUrl}/usuario`)),
      ]);

      // Metas: separar por tipo
      const savings = metas.data.find((m) => m.tipo === 'ahorro');
      const emergency = metas.data.find((m) => m.tipo === 'emergencia');
      const custom = metas.data.filter((m) => m.tipo === 'personalizada');

      if (savings) {
        this.savingsGoal.set({
          id: savings.id,
          title: savings.titulo,
          description: savings.descripcion ?? '',
          contribution: Number(savings.contribution),
          target: Number(savings.target),
        });
      }
      if (emergency) {
        this.emergencyGoal.set({
          id: emergency.id,
          title: emergency.titulo,
          description: emergency.descripcion ?? '',
          contribution: Number(emergency.contribution),
          target: Number(emergency.target),
        });
      }
      if (custom.length > 0) {
        this.customGoals.set(
          custom.map((m) => ({
            id: m.id,
            title: m.titulo,
            description: m.descripcion ?? '',
            contribution: Number(m.contribution),
            target: Number(m.target),
          }))
        );
      }

      // Categorías
      if (categorias.data.length > 0) {
        this.budgetCategories.set(
          categorias.data.map((c) => ({
            id: c.id,
            name: c.nombre,
            spent: Number(c.spent),
            budget: Number(c.budget),
          }))
        );
      }

      // Transacciones
      this.incomeTransactions.set(
        transacciones.data.map((t) => ({
          id: t.id,
          amount: Number(t.monto),
          note: t.nota ?? '',
          date: t.fecha,
        }))
      );

      // Config de ingresos del usuario
      this.fixedIncome.set(usuario.data.fixedIncome);
      this.variableHours.set(usuario.data.variableHours);
      this.variableRate.set(usuario.data.variableRate);
    } catch (error) {
      console.error('No se pudo cargar los datos desde el backend:', error);
    }
  }

  // ===== Persistencia del usuario (ingresos) =====
  async saveUserConfig(): Promise<void> {
    try {
      await lastValueFrom(
        this.http.put<ApiResponse<{ fixedIncome: number; variableHours: number; variableRate: number }>>(
          `${this.apiUrl}/usuario`,
          {
            fixedIncome: this.fixedIncome(),
            variableHours: this.variableHours(),
            variableRate: this.variableRate(),
          }
        )
      );
    } catch (error) {
      console.error('No se pudo guardar la configuración de ingresos:', error);
    }
  }

  // Progresos derivados
  goalProgress(contribution: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(100, Math.round((contribution / target) * 100));
  }

  get savingsProgress(): number {
    return this.goalProgress(this.savingsGoal().contribution, this.savingsGoal().target);
  }

  get emergencyProgress(): number {
    return this.goalProgress(this.emergencyGoal().contribution, this.emergencyGoal().target);
  }

  categoryProgress(category: IncomeCategory): number {
    return this.goalProgress(category.spent, category.budget);
  }

  private async saveGoal(goal: Goal, tipo: string): Promise<number | undefined> {
    const payload = {
      tipo,
      titulo: goal.title,
      descripcion: goal.description,
      contribution: goal.contribution,
      target: goal.target,
    };
    try {
      if (goal.id) {
        const res = await lastValueFrom(
          this.http.put<ApiResponse<MetaApi>>(`${this.apiUrl}/metas/${goal.id}`, payload)
        );
        return res.data.id;
      }
      const res = await lastValueFrom(
        this.http.post<ApiResponse<MetaApi>>(`${this.apiUrl}/metas`, payload)
      );
      return res.data.id;
    } catch (error) {
      console.error('No se pudo guardar la meta:', error);
      return undefined;
    }
  }

  // Redefinir una meta completa (título, descripción, aporte y total)
  updateGoal(signalName: 'savingsGoal' | 'emergencyGoal', patch: Partial<Goal>): void {
    const tipo = signalName === 'savingsGoal' ? 'ahorro' : 'emergencia';
    const goal = signalName === 'savingsGoal'
      ? { ...this.savingsGoal(), ...patch }
      : { ...this.emergencyGoal(), ...patch };

    if (signalName === 'savingsGoal') {
      this.savingsGoal.set(goal);
    } else {
      this.emergencyGoal.set(goal);
    }

    if (goal.id) {
      // Ya existe en la BD → actualización
      void this.saveGoal(goal, tipo).catch(() => undefined);
      return;
    }

    // Aún no existe → crear una sola vez; si ya hay una creación en vuelo, solo refrescar la señal
    if (this.creatingGoal === signalName) return;
    this.creatingGoal = signalName;
    void this.saveGoal(goal, tipo).then((id) => {
      this.creatingGoal = null;
      if (id !== undefined) {
        goal.id = id;
        if (signalName === 'savingsGoal') this.savingsGoal.set(goal);
        else this.emergencyGoal.set(goal);
      }
    });
  }

  // ===== Categorías de presupuesto dinámicas =====
  async addCategory(category: IncomeCategory): Promise<void> {
    this.budgetCategories.update((list) => [...list, category]);
    try {
      const res = await lastValueFrom(
        this.http.post<ApiResponse<CategoriaApi>>(`${this.apiUrl}/categorias`, {
          nombre: category.name,
          spent: category.spent,
          budget: category.budget,
        })
      );
      const c = res.data;
      category.id = c.id;
    } catch (error) {
      console.error('No se pudo agregar la categoría:', error);
    }
  }

  async updateCategory(index: number, patch: Partial<IncomeCategory>): Promise<void> {
    const list = this.budgetCategories();
    const current = list[index];
    if (!current) return;
    this.budgetCategories.update((arr) => arr.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    if (current.id === undefined) return;
    try {
      await lastValueFrom(
        this.http.put<ApiResponse<CategoriaApi>>(`${this.apiUrl}/categorias/${current.id}`, {
          nombre: patch.name,
          spent: patch.spent,
          budget: patch.budget,
        })
      );
    } catch (error) {
      console.error('No se pudo actualizar la categoría:', error);
    }
  }

  async removeCategory(index: number): Promise<void> {
    const current = this.budgetCategories()[index];
    this.budgetCategories.update((list) => list.filter((_, i) => i !== index));
    if (!current?.id) return;
    try {
      await lastValueFrom(this.http.delete(`${this.apiUrl}/categorias/${current.id}`));
    } catch (error) {
      console.error('No se pudo eliminar la categoría:', error);
    }
  }

  // ===== Metas personalizadas dinámicas =====
  async addCustomGoal(goal: Goal): Promise<void> {
    try {
      const res = await lastValueFrom(
        this.http.post<ApiResponse<MetaApi>>(`${this.apiUrl}/metas`, {
          tipo: 'personalizada',
          titulo: goal.title,
          descripcion: goal.description,
          contribution: goal.contribution,
          target: goal.target,
        })
      );
      const m = res.data;
      this.customGoals.update((list) => [...list, { ...goal, id: m.id }]);
    } catch (error) {
      console.error('No se pudo agregar la meta:', error);
      this.customGoals.update((list) => [...list, goal]);
    }
  }

  async updateCustomGoal(index: number, patch: Partial<Goal>): Promise<void> {
    const list = this.customGoals();
    const current = list[index];
    if (!current) return;
    this.customGoals.update((arr) => arr.map((g, i) => (i === index ? { ...g, ...patch } : g)));
    if (current.id === undefined) return;
    try {
      await lastValueFrom(
        this.http.put<ApiResponse<MetaApi>>(`${this.apiUrl}/metas/${current.id}`, {
          titulo: patch.title,
          descripcion: patch.description,
          contribution: patch.contribution,
          target: patch.target,
        })
      );
    } catch (error) {
      console.error('No se pudo actualizar la meta:', error);
    }
  }

  async removeCustomGoal(index: number): Promise<void> {
    const current = this.customGoals()[index];
    this.customGoals.update((list) => list.filter((_, i) => i !== index));
    if (!current?.id) return;
    try {
      await lastValueFrom(this.http.delete(`${this.apiUrl}/metas/${current.id}`));
    } catch (error) {
      console.error('No se pudo eliminar la meta:', error);
    }
  }

  // Progreso de una meta personalizada
  customGoalProgress(goal: Goal): number {
    return this.goalProgress(goal.contribution, goal.target);
  }

  // Registrar un ingreso y agregarlo al historial con su comentario
  async addIncomeTransaction(amount: number, note: string): Promise<void> {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const transaction: IncomeTransaction = { amount, note, date };
    this.incomeTransactions.update((list) => [transaction, ...list]);
    this.incomeNote.set('');
    this.saveUserConfig();
    try {
      const res = await lastValueFrom(
        this.http.post<ApiResponse<TransaccionApi>>(`${this.apiUrl}/transacciones`, {
          monto: amount,
          nota: note,
          fecha: date,
        })
      );
      const t = res.data;
      this.incomeTransactions.update((list) =>
        list.map((item) => (item === transaction ? { ...item, id: t.id } : item))
      );
    } catch (error) {
      console.error('No se pudo guardar la transacción:', error);
    }
  }

  // Utilidad de formato moneda (Quetzales guatemaltecos)
  formatMoney(value: number): string {
    return value.toLocaleString('es-GT', {
      style: 'currency',
      currency: 'GTQ',
      minimumFractionDigits: 2,
    });
  }
}