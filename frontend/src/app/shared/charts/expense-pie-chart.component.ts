import {
  AfterViewInit,
  Component,
  ElementRef,
  EffectRef,
  ViewChild,
  effect,
  inject,
  input,
  Injector,
  OnDestroy,
} from '@angular/core';
import { Chart, ChartOptions } from 'chart.js';
import 'chart.js/auto';
import { IncomeService } from '../../core/income/income.service';

/** Rebanada de la gráfica de pastel: nombre, color y valor. */
export interface ExpenseSlice {
  name: string;
  color: string;
  value: number;
}

/**
 * Gráfica de pastel (donut) de la distribución de gastos por categoría.
 * Se actualiza en vivo cuando la entrada [data] cambia.
 */
@Component({
  selector: 'app-expense-pie-chart',
  standalone: true,
  template: `
    <div class="pie-wrap">
      @if (total() === 0) {
        <div class="pie-empty">Sin gastos registrados este mes</div>
      }
      <canvas #pieChart></canvas>
    </div>
  `,
  styles: [
    `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .pie-wrap {
      position: relative;
      width: 100%;
      height: 100%;
    }
    .pie-empty {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #8a9ba8;
      font-size: 13px;
      z-index: 2;
      pointer-events: none;
    }
    `,
  ],
})
export class ExpensePieChartComponent implements AfterViewInit, OnDestroy {
  readonly data = input<ExpenseSlice[]>([]);

  @ViewChild('pieChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private injector = inject(Injector);
  private income = inject(IncomeService);
  private chart: Chart | null = null;
  private chartEffect: EffectRef | null = null;

  total(): number {
    return this.data().reduce((sum, d) => sum + d.value, 0);
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'doughnut',
      data: { labels: [], datasets: [] },
      options: this.chartOptions,
    });
    this.updateChart(this.data());
    this.chartEffect = effect(() => {
      this.updateChart(this.data());
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.chartEffect?.destroy();
    this.chart?.destroy();
    this.chart = null;
  }

  private get chartOptions(): ChartOptions<'doughnut'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#cbd5e0',
            usePointStyle: true,
            pointStyle: 'rectRounded',
            boxWidth: 10,
            boxHeight: 10,
            padding: 14,
            font: { family: 'Inter, sans-serif', size: 12, weight: 500 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(17, 34, 64, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#ff9800',
          borderWidth: 1,
          callbacks: {
            label: (item) => {
              const value = typeof item.raw === 'number' ? item.raw : 0;
              return `${item.label}: ${this.income.formatMoney(value)}`;
            },
          },
        },
      },
    };
  }

  private updateChart(slices: ExpenseSlice[]): void {
    if (!this.chart) return;
    this.chart.data.labels = slices.map((s) => s.name);
    this.chart.data.datasets = [
      {
        data: slices.map((s) => s.value),
        backgroundColor: slices.map((s) => s.color),
        borderColor: 'rgba(17, 34, 64, 0.9)',
        borderWidth: 2,
        hoverOffset: 8,
      },
    ];
    this.chart.update();
  }
}