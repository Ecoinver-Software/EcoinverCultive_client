// src/app/components/cultive-map/cultive-map.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { PieChart, TreemapChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import type { EChartsOption } from 'echarts';

import { GenderService } from '../../services/Gender.service';
import { CultivoService } from '../../services/Cultivo.service';
import { Cultive } from '../../types/Cultive';

interface GenreItem { id: number; nombre: string; }
interface FamilyItem { familia: string; nombreGenero: GenreItem[]; }

echarts.use([
  PieChart,
  TreemapChart,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  CanvasRenderer
]);

@Component({
  selector: 'app-cultive-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxEchartsDirective
  ],
  providers: [
    provideEchartsCore({ echarts })
  ],
  templateUrl: './cultive-map.component.html',
  styleUrls: ['./cultive-map.component.css']
})
export class CultiveMapComponent implements OnInit {
  texto = '';
  familiaSeleccionada = 'todas';

  genders: { idGenero: number; nombreFamilia: string; nombreGenero: string }[] = [];
  family: FamilyItem[] = [];

  cultivos: Cultive[] = [];
  superficieTotal = 0;

  view: 'pie' | 'tree' = 'pie';
  optionsPie: EChartsOption = {};
  optionsTree: EChartsOption = {};

  // --- Estados de selección ---
  selectedGeneroId: number | null = null;
  selectedGeneroName = '';
  groupBy: 'variedad' | 'agricultor' | 'individual' | 'tecnico' | 'provincia' = 'variedad';

  constructor(
    private generoServicio: GenderService,
    private cultivoService: CultivoService
  ) { }

  ngOnInit() {
    this.generoServicio.get().subscribe(data => {
      this.genders = data;
      this.buildFamilyList();
    });
    this.cultivoService.getAll().subscribe(data => {
      this.cultivos = data;
    });
  }

  private buildFamilyList() {
    this.family = [];
    for (const g of this.genders) {
      const genre: GenreItem = { id: g.idGenero, nombre: g.nombreGenero };
      const existing = this.family.find(f => f.familia === g.nombreFamilia);
      if (existing) {
        if (!existing.nombreGenero.some(x => x.id === genre.id)) {
          existing.nombreGenero.push(genre);
        }
      } else {
        this.family.push({
          familia: g.nombreFamilia,
          nombreGenero: [genre]
        });
      }
    }
  }

  get busquedaFamilia(): FamilyItem[] {
    const term = this.texto.toLowerCase().trim();
    const famSel = this.familiaSeleccionada.toLowerCase();
    return this.family.filter(f => {
      const matchFam = famSel === 'todas' || f.familia.toLowerCase().includes(famSel);
      if (!matchFam) return false;
      if (term) {
        return (
          f.familia.toLowerCase().includes(term) ||
          f.nombreGenero.some(n => n.nombre.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }

  onGeneroSelect(idGenero: number) {
    this.selectedGeneroId = idGenero;
    const found = this.genders.find(x => x.idGenero === idGenero);
    this.selectedGeneroName = found ? found.nombreGenero : '';
    this.updateChart();
  }

  /** Construye y refresca optionsPie y optionsTree según selectedGeneroId y groupBy */
  updateChart() {
    if (this.selectedGeneroId == null) return;

    // 1. Filtrar por género
    const cultivosFiltrados = this.cultivos.filter(
      c => c.idGenero === this.selectedGeneroId
    );

    // 2. Calcular superficie total
    this.superficieTotal = cultivosFiltrados.reduce(
      (sum, c) => sum + (c.superficie || 0),
      0
    );
    const total = this.superficieTotal;

    // 3. Armar la serie según modo de agrupación
    let serie: Array<{ name: string; value: number; agricultores?: string[] }>;

    if (this.groupBy === 'individual') {
      // Cada cultivo individual
      serie = cultivosFiltrados.map(c => ({
        name: c.nombreVariedad || 'Sin variedad',
        value: c.superficie || 0,
        agricultores: [c.nombreAgricultor]
      }));
    } else {
      // Agregado general con normalización de clave
      interface Agg { value: number; agricultores: string[] }
      const agrupados: Record<string, Agg> = {};
      const displayName: Record<string, string> = {};

      for (const c of cultivosFiltrados) {
        // Raw key según modo
        let rawKey = '';
        switch (this.groupBy) {
          case 'variedad':
            rawKey = c.nombreVariedad || 'Sin variedad';
            break;
          case 'agricultor':
            rawKey = c.nombreAgricultor || 'Sin agricultor';
            break;
          case 'tecnico':
            rawKey = c.tecnico       || 'Sin técnico';
            break;
          case 'provincia':
            rawKey = c.provincia     || 'Sin provincia';
            break;
        }

        // Normalizamos: quitamos acentos y bajamos a minúsculas
        const normKey = rawKey
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

        // Inicializar si no existe
        if (!agrupados[normKey]) {
          agrupados[normKey] = { value: 0, agricultores: [] };
          // Guardamos el primer rawKey para mostrar
          displayName[normKey] = rawKey;
        }

        // Sumar superficie
        agrupados[normKey].value += (c.superficie || 0);

        // Si agrupar por variedad, guardamos agricultores únicos
        if (this.groupBy === 'variedad') {
          const ag = c.nombreAgricultor;
          if (ag && !agrupados[normKey].agricultores.includes(ag)) {
            agrupados[normKey].agricultores.push(ag);
          }
        }
      }

      // Convertir a array para ECharts
      serie = Object.entries(agrupados).map(
        ([norm, { value, agricultores }]) => ({
          name: displayName[norm],
          value,
          agricultores
        })
      );
    }

    // 4. Configuración del Pie Chart
    this.optionsPie = {
      title: {
        text: `Superficie total: ${total} m²`,
        left: 'center',
        top: 10,
        padding: [0, 0, 50, 0],
        textStyle: { fontSize: 14, color: '#fff' }
      },
      graphic: [{
        type: 'line',
        left: 'center',
        top: 40,
        shape: { x1: -150, y1: 0, x2: 150, y2: 0 },
        style: { stroke: '#fff', lineWidth: 1 }
      }],
      tooltip: {
        trigger: 'item',
        confine: true,
        position: 'top',
        enterable: true,
        extraCssText: 'max-width: 200px; white-space: normal; max-height: 300px; overflow-y: auto;',
        formatter: (p: any) => {
          const val = p.value as number;
          const pct = p.percent;
          const agrisArr = (p.data.agricultores || []).filter((v: string) => !!v);
          if (agrisArr.length) {
            return `${p.name}: ${val} m² (${pct}%)<br/>Agricultor(es):<br/>${agrisArr.join('<br/>')}`;
          }
          return `${p.name}: ${val} m² (${pct}%)`;
        }
      },
      series: [{
        name: 'Cultivos',
        type: 'pie',
        radius: ['40%', '70%'],
        label: {
          formatter: '{b}: {c} m² ({d}%)',
          color: '#fff',
          textBorderWidth: 0,
          textBorderColor: 'transparent',
          textShadowBlur: 0,
          textShadowColor: 'transparent'
        },
        data: serie
      }]
    };

    // 5. Configuración del Treemap
    this.optionsTree = {
      title: {
        text: `Superficie total: ${total} m²`,
        left: 'center',
        top: 10,
        padding: [0, 0, 20, 0],
        textStyle: { fontSize: 15, color: '#fff' }
      },
      graphic: [{
        type: 'line',
        left: 'center',
        top: 45,
        shape: { x1: -150, y1: 0, x2: 150, y2: 0 },
        style: { stroke: '#fff', lineWidth: 1 }
      }],
      tooltip: {
        trigger: 'item',
        confine: true,
        position: 'top',
        enterable: true,
        extraCssText: 'max-width: 200px; white-space: normal; max-height: 300px; overflow-y: auto;',
        formatter: (p: any) => {
          const val = p.value as number;
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
          const agrisArr = (p.data.agricultores || []).filter((v: string) => !!v);
          if (agrisArr.length) {
            return `${p.name}: ${val} m² (${pct}%)<br/>Agricultor(es):<br/>${agrisArr.join('<br/>')}`;
          }
          return `${p.name}: ${val} m² (${pct}%)`;
        }
      },
      series: [{
        name: 'Cultivos',
        type: 'treemap',
        roam: false,
        nodeClick: false,
        label: {
          show: true,
          formatter: '{b}: {c} m²',
          textBorderWidth: 0,
          textBorderColor: 'transparent',
          textShadowBlur: 0
        },
        breadcrumb: { show: false },
        data: serie
      }]
    };
  }
}
