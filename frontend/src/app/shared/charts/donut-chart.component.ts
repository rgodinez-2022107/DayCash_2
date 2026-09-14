import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutSegment {
  label: string;
  value: number;
  percent: number;
}

export const DONUT_COLORS = [
  '#f39c12',
  '#27ae60',
  '#3498db',
  '#e74c3c',
  '#9b59b6',
  '#1abc9c',
  '#e67e22',
  '#95a5a6',
];

/**
 * Gráfica de dona en SVG puro: distribución porcentual de egresos
 * por categoría. Muestra el total en el centro y leyenda interactiva.
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="donut-chart" [class.empty]="!segments.length">
      <svg *ngIf="segments.length" viewBox="0 0 200 200" class="donut-svg">
        <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="26" />
        <circle
          *ngFor="let seg of arcs"
          cx="100"
          cy="100"
          r="70"
          fill="none"
          [attr.stroke]="seg.color"
          stroke-width="26"
          [attr.stroke-dasharray]="seg.dash"
          [attr.stroke-dashoffset]="seg.offset"
          transform="rotate(-90 100 100)"
          stroke-linecap="round"
        >
          <title>{{ seg.label }}: {{ format(seg.value) }} ({{ seg.percent }}%)</title>
        </circle>
        <text x="100" y="95" text-anchor="middle" class="donut-total">{{ format(total) }}</text>
        <text x="100" y="115" text-anchor="middle" class="donut-caption">Egresos</text>
      </svg>

      <div class="chart-empty" *ngIf="!segments.length">
        <span class="empty-icon">🥧</span>
        <p>Sin egresos en el periodo seleccionado.</p>
      </div>

      <ul class="donut-legend" *ngIf="segments.length">
        <li *ngFor="let seg of segments; let i = index">
          <i [style.background]="segColor(i)"></i>
          <span class="legend-label">{{ seg.label }}</span>
          <span class="legend-value">{{ format(seg.value) }}</span>
          <span class="legend-percent">{{ seg.percent }}%</span>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .donut-chart { display: flex; flex-direction: column; align-items: center; gap: 18px; }
      .donut-svg { width: 200px; height: 200px; }
      .donut-total { font-size: 22px; font-weight: 700; fill: var(--text-primary, #fff); font-family: Inter, sans-serif; }
      .donut-caption { font-size: 11px; fill: var(--text-secondary, #8a9ba8); font-family: Inter, sans-serif; }
      .donut-legend { list-style: none; margin: 0; padding: 0; width: 100%; display: flex; flex-direction: column; gap: 8px; }
      .donut-legend li { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-primary, #fff); }
      .donut-legend i { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
      .legend-label { flex: 1; color: var(--text-secondary, #8a9ba8); }
      .legend-value { font-weight: 600; }
      .legend-percent { color: #f39c12; font-weight: 700; min-width: 40px; text-align: right; }
      .chart-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 26px 0; color: var(--text-secondary, #8a9ba8); }
      .chart-empty .empty-icon { font-size: 28px; opacity: 0.6; }
      .chart-empty p { margin: 0; font-size: 13px; }
    `,
  ],
})
export class DonutChartComponent {
  @Input() segments: DonutSegment[] = [];
  @Input() format: (value: number) => string = (v) => String(v);

  get total(): number {
    return this.segments.reduce((a, s) => a + s.value, 0);
  }

  get arcs(): { label: string; value: number; percent: number; color: string; dash: string; offset: number }[] {
    const circumference = 2 * Math.PI * 70;
    let accumulated = 0;
    return this.segments.map((seg, i) => {
      const fraction = seg.value / Math.max(this.total, 1);
      const len = fraction * circumference;
      const arc = {
        label: seg.label,
        value: seg.value,
        percent: seg.percent,
        color: segColorOf(i),
        dash: `${Math.max(len - 2, 0.5)} ${circumference}`,
        offset: -accumulated,
      };
      accumulated += len;
      return arc;
    });
  }

  segColor(index: number): string {
    return segColorOf(index);
  }
}

export function segColorOf(index: number): string {
  return DONUT_COLORS[index % DONUT_COLORS.length];
}