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

/** Barra de la gráfica: nombre, color y valor (una barra por categoría). */
export interface CategoryBar {
  name: string;
  color: string;
  value: number;
}

/**
 * Gráfica de barras por categoría de gasto (Chart.js), usada en
 * Estadísticas. Cada categoría tiene su propia barra con su color.
 * Se actualiza en vivo cuando la entrada [items] cambia.
 */
@Component({
  selector: 'app-monthly-flow-chart',
  standalone: true,
  template: `<div class="monthly-flow-chart">
    @if (items().length > 0) {
      <div class="legend">
        @for (it of items(); track it.name) {
          <span class="legend-item" [attr.title]="it.name">
            <i class="dot" [style.background]="it.color"></i>
            <span class="legend-name">{{ it.name }}</span>
          </span>
        }
      </div>
    }
    <div class="chart-area">
      @if (total() === 0) {
        <div class="chart-empty">Sin gastos registrados este mes</div>
      }
      <canvas #flowChart></canvas>
    </div>
  </div>`,
  styles: [
    `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .monthly-flow-chart {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      height: 100%;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      align-items: center;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #cbd5e0;
      font-weight: 500;
      white-space: nowrap;
    }
    .legend-item .dot {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      display: inline-block;
      flex-shrink: 0;
    }
    .chart-area {
      position: relative;
      flex: 1 1 auto;
      min-height: 240px;
    }
    .chart-empty {
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
export class MonthlyFlowChartComponent implements AfterViewInit, OnDestroy {
  /** Una barra por categoría: nombre, color y valor. */
  readonly items = input<CategoryBar[]>([]);

  @ViewChild('flowChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private injector = inject(Injector);
  private income = inject(IncomeService);
  private chart: Chart | null = null;
  private chartEffect: EffectRef | null = null;

  total(): number {
    return this.items().reduce((sum, it) => sum + it.value, 0);
  }

  ngAfterViewInit(): void {
    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: this.chartOptions,
    });
    this.updateChart(this.items());
    this.chartEffect = effect(() => {
      this.updateChart(this.items());
    }, { injector: this.injector });
  }

  ngOnDestroy(): void {
    this.chartEffect?.destroy();
    this.chart?.destroy();
    this.chart = null;
  }

  private get chartOptions(): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 34, 64, 0.95)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#ff9800',
          borderWidth: 1,
          callbacks: {
            label: (item) => {
              const value = typeof item.raw === 'number' ? item.raw : 0;
              return `${item.dataset.label}: ${this.income.formatMoney(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#8a9ba8',
            font: { family: 'Inter, sans-serif', size: 12, weight: 600 },
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.06)' },
          border: { display: false },
          ticks: {
            color: '#8a9ba8',
            callback: (value) => this.income.formatMoney(Number(value)),
          },
        },
      },
    };
  }

  private updateChart(items: CategoryBar[]): void {
    if (!this.chart) return;
    this.chart.data.labels = items.map((it) => it.name);
    this.chart.data.datasets = [
      {
        label: 'Gasto',
        data: items.map((it) => it.value),
        backgroundColor: items.map((it) => it.color),
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 56,
      },
    ];
    this.chart.update();
  }
}