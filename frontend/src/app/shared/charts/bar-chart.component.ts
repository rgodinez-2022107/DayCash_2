import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BarDatum {
  label: string;
  income: number;
  expense: number;
}

/**
 * Gráfica de barras agrupadas en SVG puro: compara ingresos (verde)
 * contra egresos (naranja) por periodo.
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bar-chart" [class.empty]="!data.length">
      <svg *ngIf="data.length" viewBox="0 0 640 260" preserveAspectRatio="xMidYMid meet" class="chart-svg">
        <defs>
          <linearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2ee59d" />
            <stop offset="100%" stop-color="#27ae60" />
          </linearGradient>
          <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f5b041" />
            <stop offset="100%" stop-color="#f39c12" />
          </linearGradient>
        </defs>

        <!-- Líneas de guía e Y -->
        <g class="gridlines">
          <line *ngFor="let g of gridLines" [attr.y1]="g.y" [attr.y2]="g.y" x1="46" x2="620" />
          <text *ngFor="let g of gridLines" [attr.y]="g.y + 4" x="42" text-anchor="end" class="axis-label">
            {{ shortNumber(g.value) }}
          </text>
        </g>

        <!-- Barras -->
        <g class="bars" *ngFor="let b of bars; let i = index">
          <g class="bar-pair" [attr.transform]="'translate(' + b.x + ', 0)'">
            <rect
              class="bar bar-income"
              [attr.x]="b.pad"
              [attr.y]="b.yIncome"
              [attr.width]="b.barW"
              [attr.height]="b.hIncome"
              rx="4"
              fill="url(#barIncome)"
            >
              <title>{{ b.label }} · Ingresos: {{ format(b.income) }}</title>
            </rect>
            <rect
              class="bar bar-expense"
              [attr.x]="b.pad + b.barW + b.gap"
              [attr.y]="b.yExpense"
              [attr.width]="b.barW"
              [attr.height]="b.hExpense"
              rx="4"
              fill="url(#barExpense)"
            >
              <title>{{ b.label }} · Egresos: {{ format(b.expense) }}</title>
            </rect>
            <text *ngIf="b.income > 0 || b.expense > 0" [attr.y]="b.textY" text-anchor="middle" class="value-label">
              {{ shortNumber(b.income + b.expense) }}
            </text>
            <text [attr.y]="228" text-anchor="middle" class="x-label">{{ b.label }}</text>
          </g>
        </g>
      </svg>

      <div class="chart-empty" *ngIf="!data.length">
        <span class="empty-icon">📊</span>
        <p>Registra movimientos para visualizar el comparativo.</p>
      </div>

      <div class="chart-legend">
        <span class="legend-item income"><i></i> Ingresos</span>
        <span class="legend-item expense"><i></i> Egresos</span>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .chart-svg { width: 100%; height: 260px; }
      .gridlines line { stroke: rgba(255, 255, 255, 0.08); stroke-dasharray: 3 4; }
      .axis-label, .x-label, .value-label { fill: var(--text-secondary, #8a9ba8); font-family: Inter, sans-serif; }
      .axis-label, .value-label { font-size: 10px; }
      .x-label { font-size: 11px; font-weight: 600; }
      .bar { cursor: pointer; transition: opacity 0.15s; }
      .bar:hover { opacity: 0.85; }
      .chart-legend { display: flex; gap: 18px; justify-content: center; margin-top: 10px; font-size: 12px; color: var(--text-secondary, #8a9ba8); }
      .legend-item { display: inline-flex; align-items: center; gap: 7px; }
      .legend-item i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
      .legend-item.income i { background: #27ae60; }
      .legend-item.expense i { background: #f39c12; }
      .chart-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px 0; color: var(--text-secondary, #8a9ba8); }
      .chart-empty .empty-icon { font-size: 30px; opacity: 0.6; }
      .chart-empty p { margin: 0; font-size: 13px; }
      .bar-chart.empty { min-height: 180px; }
    `,
  ],
})
export class BarChartComponent {
  @Input() data: BarDatum[] = [];
  @Input() format: (value: number) => string = (v) => String(v);

  static readonly CHART_HEIGHT = 180;
  static readonly CHART_TOP = 30;
  static readonly CHART_LEFT = 46;
  static readonly CHART_RIGHT = 14;
  static readonly BOTTOM = 200;

  get maxValue(): number {
    if (!this.data.length) return 0;
    return Math.max(...this.data.flatMap((d) => [d.income, d.expense]), 1);
  }

  get chartHeight(): number {
    return BarChartComponent.BOTTOM - BarChartComponent.CHART_TOP;
  }

  get gridLines(): { y: number; value: number }[] {
    const lines: { y: number; value: number }[] = [];
    for (let i = 0; i <= 4; i++) {
      const value = (this.maxValue * i) / 4;
      const y = BarChartComponent.BOTTOM - (this.chartHeight * i) / 4;
      lines.push({ y, value });
    }
    return lines;
  }

  get bars(): { x: number; barW: number; gap: number; pad: number; yIncome: number; hIncome: number; yExpense: number; hExpense: number; textY: number; label: string; income: number; expense: number }[] {
    const n = this.data.length;
    const plotWidth = 640 - BarChartComponent.CHART_LEFT - BarChartComponent.CHART_RIGHT;
    const slot = plotWidth / n;
    const barW = Math.min(34, slot * 0.32);
    const gap = Math.max(3, barW * 0.28);
    const pad = (slot - barW * 2 - gap) / 2;

    return this.data.map((d, i) => {
      const hIncome = (d.income / this.maxValue) * this.chartHeight;
      const hExpense = (d.expense / this.maxValue) * this.chartHeight;
      const textY = Math.min(
        BarChartComponent.BOTTOM - Math.max(hIncome, hExpense) - 6,
        BarChartComponent.BOTTOM - 6
      );
      return {
        x: BarChartComponent.CHART_LEFT + slot * i,
        barW,
        gap,
        pad: i === 0 ? pad + 2 : pad,
        yIncome: Math.max(BarChartComponent.BOTTOM - hIncome, 4),
        hIncome: Math.max(hIncome, 2),
        yExpense: Math.max(BarChartComponent.BOTTOM - hExpense, 4),
        hExpense: Math.max(hExpense, 2),
        textY,
        label: d.label,
        income: d.income,
        expense: d.expense,
      };
    });
  }

  /** Convierte montos grandes a notación compacta (ej. 1.5k, 12.4k). */
  shortNumber(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return String(Math.round(value));
  }
}