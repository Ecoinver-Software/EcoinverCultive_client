import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Stock {
  id: number;
  nombreProducto: string;
  tipoStock: string;
  cantidad: number;
  unidad: string;
  fechaActualizacion: Date;
  ubicacion: string;
  // Otros campos que puedas necesitar
}

@Component({
  selector: 'app-stock-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-details.component.html',
  styleUrl: './stock-details.component.css'
})
export class StockDetailsComponent implements OnInit {
  // Control de pestañas
  activeTab: 'Datos de stock' | 'Ubicacion' | 'Historico' | 'Movimientos' = 'Datos de stock';
  
  // Datos del stock
  stock: Stock | null = null;
  loading: boolean = true;
  error: string | null = null;

  constructor() { }

  ngOnInit(): void {
    // Simular carga de datos
    this.loading = true;
    // Aquí cargarías los datos reales desde un servicio
    setTimeout(() => {
      this.stock = {
        id: 1,
        nombreProducto: 'Fertilizante NPK',
        tipoStock: 'Insumo',
        cantidad: 250,
        unidad: 'kg',
        fechaActualizacion: new Date(),
        ubicacion: 'Almacén principal'
      };
      this.loading = false;
    }, 1000);
  }

  setActiveTab(tab: 'Datos de stock' | 'Ubicacion' | 'Historico' | 'Movimientos'): void {
    this.activeTab = tab;
  }

  exportToPdf(): void {
    console.log('Exportando a PDF...');
    // Aquí implementarías la funcionalidad de exportación a PDF
    // Similar a la que existe en el componente cultive-details
  }
}