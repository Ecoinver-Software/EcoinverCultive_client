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

interface GenreItem { 
  id: number; 
  nombre: string; 
}

interface FamilyItem { 
  familia: string; 
  nombreGenero: GenreItem[]; 
}

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
  // ===== PROPIEDADES DE FILTRO =====
  texto = '';
  familiaSeleccionada = 'todas';

  // ===== DATOS =====
  genders: { idGenero: number; nombreFamilia: string; nombreGenero: string }[] = [];
  family: FamilyItem[] = [];
  cultivos: Cultive[] = [];
  superficieTotal = 0;

  // ===== CONFIGURACIÓN DE VISTA =====
  view: 'pie' | 'tree' = 'pie';
  optionsPie: EChartsOption = {};
  optionsTree: EChartsOption = {};

  // ===== ESTADOS DE SELECCIÓN =====
  selectedGeneroId: number | null = null;
  selectedGeneroName = '';
  groupBy: 'variedad' | 'agricultor' | 'individual' | 'tecnico' | 'provincia' = 'variedad';

  constructor(
    private generoServicio: GenderService,
    private cultivoService: CultivoService
  ) { }

  ngOnInit() {
    // Cargar géneros con orden alfabético
    this.generoServicio.get().subscribe(data => {
      // Ordenar los géneros alfabéticamente al cargarlos
      this.genders = data.sort((a, b) => 
        a.nombreGenero.localeCompare(b.nombreGenero, 'es', { sensitivity: 'base' })
      );
      this.buildFamilyList();
    });

    // Cargar cultivos
    this.cultivoService.getAll().subscribe(data => {
      this.cultivos = data;
    });
  }

  /**
   * Construye la lista de familias con géneros ordenados alfabéticamente
   */
  private buildFamilyList() {
    this.family = [];
    
    // Crear un mapa temporal para agrupar por familia
    const familyMap = new Map<string, GenreItem[]>();
    
    for (const g of this.genders) {
      const genre: GenreItem = { id: g.idGenero, nombre: g.nombreGenero };
      
      if (!familyMap.has(g.nombreFamilia)) {
        familyMap.set(g.nombreFamilia, []);
      }
      
      // Evitar duplicados
      const existing = familyMap.get(g.nombreFamilia)!;
      if (!existing.some(x => x.id === genre.id)) {
        existing.push(genre);
      }
    }
    
    // Convertir el mapa a array y ordenar todo alfabéticamente
    this.family = Array.from(familyMap.entries())
      .map(([familia, nombreGenero]) => ({
        familia,
        // Ordenar géneros dentro de cada familia
        nombreGenero: nombreGenero.sort((a, b) => 
          a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
        )
      }))
      // Ordenar las familias
      .sort((a, b) => 
        a.familia.localeCompare(b.familia, 'es', { sensitivity: 'base' })
      );
  }

  /**
   * Getter que aplica filtros y mantiene orden alfabético
   */
  get busquedaFamilia(): FamilyItem[] {
    const term = this.texto.toLowerCase().trim();
    const famSel = this.familiaSeleccionada.toLowerCase();
    
    return this.family
      .filter(f => {
        // Filtrar por familia seleccionada
        const matchFam = famSel === 'todas' || f.familia.toLowerCase().includes(famSel);
        if (!matchFam) return false;
        
        // Filtrar por término de búsqueda
        if (term) {
          return (
            f.familia.toLowerCase().includes(term) ||
            f.nombreGenero.some(n => n.nombre.toLowerCase().includes(term))
          );
        }
        return true;
      })
      .map(f => ({
        ...f,
        // Filtrar géneros que coincidan con el término de búsqueda y mantener orden
        nombreGenero: f.nombreGenero
          .filter(g => !term || g.nombre.toLowerCase().includes(term))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
      }))
      // Mantener orden alfabético de familias después del filtrado
      .sort((a, b) => a.familia.localeCompare(b.familia, 'es', { sensitivity: 'base' }));
  }

  /**
   * Maneja la selección de un género
   */
  onGeneroSelect(idGenero: number) {
    this.selectedGeneroId = idGenero;
    const found = this.genders.find(x => x.idGenero === idGenero);
    this.selectedGeneroName = found ? found.nombreGenero : '';
    this.updateChart();
  }

  /**
   * Construye y refresca optionsPie y optionsTree según selectedGeneroId y groupBy
   */
  updateChart() {
    if (this.selectedGeneroId == null) return;

    // 1. Filtrar cultivos por género seleccionado
    const cultivosFiltrados = this.cultivos.filter(
      c => c.idGenero === this.selectedGeneroId
    );

    // 2. Calcular superficie total
    this.superficieTotal = cultivosFiltrados.reduce(
      (sum, c) => sum + (c.superficie || 0),
      0
    );
    const total = this.superficieTotal;

    // 3. Preparar datos según modo de agrupación
    let serie: Array<{ name: string; value: number; agricultores?: string[] }>;

    if (this.groupBy === 'individual') {
      // Cada cultivo individual
      serie = cultivosFiltrados
        .map(c => ({
          name: c.nombreVariedad || 'Sin variedad',
          value: c.superficie || 0,
          agricultores: [c.nombreAgricultor]
        }))
        // Ordenar alfabéticamente
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    } else {
      // Agrupación con normalización de claves
      interface Agg { value: number; agricultores: string[] }
      const agrupados: Record<string, Agg> = {};
      const displayName: Record<string, string> = {};

      for (const c of cultivosFiltrados) {
        // Obtener clave según modo de agrupación
        let rawKey = '';
        switch (this.groupBy) {
          case 'variedad':
            rawKey = c.nombreVariedad || 'Sin variedad';
            break;
          case 'agricultor':
            rawKey = c.nombreAgricultor || 'Sin agricultor';
            break;
          case 'tecnico':
            rawKey = c.tecnico || 'Sin técnico';
            break;
          case 'provincia':
            rawKey = c.provincia || 'Sin provincia';
            break;
        }

        // Normalizar clave: quitar acentos y convertir a minúsculas
        const normKey = rawKey
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();

        // Inicializar si no existe
        if (!agrupados[normKey]) {
          agrupados[normKey] = { value: 0, agricultores: [] };
          displayName[normKey] = rawKey; // Guardar nombre original para mostrar
        }

        // Sumar superficie
        agrupados[normKey].value += (c.superficie || 0);

        // Agregar agricultor si es agrupación por variedad
        if (this.groupBy === 'variedad') {
          const ag = c.nombreAgricultor;
          if (ag && !agrupados[normKey].agricultores.includes(ag)) {
            agrupados[normKey].agricultores.push(ag);
          }
        }
      }

      // Convertir a array y ordenar alfabéticamente
      serie = Object.entries(agrupados)
        .map(([norm, { value, agricultores }]) => ({
          name: displayName[norm],
          value,
          agricultores: agricultores.sort((a, b) => 
            a.localeCompare(b, 'es', { sensitivity: 'base' })
          )
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    }

    // 4. Configuración del Pie Chart
    this.optionsPie = {
      title: {
        text: `Superficie total: ${total} m²`,
        left: 'center',
        top: 10,
        padding: [0, 0, 50, 0],
        textStyle: { 
          fontSize: 14, 
          color: 'gray' 
        }
      },
      graphic: [{
        type: 'line',
        left: 'center',
        top: 40,
        shape: { x1: -150, y1: 0, x2: 150, y2: 0 },
        style: { stroke: 'gray', lineWidth: 1 }
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
          color: 'gray',
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
        textStyle: { 
          fontSize: 15, 
          color: 'Gray' 
        }
      },
      graphic: [{
        type: 'line',
        left: 'center',
        top: 45,
        shape: { x1: -150, y1: 0, x2: 150, y2: 0 },
        style: { stroke: 'gray', lineWidth: 1 }
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