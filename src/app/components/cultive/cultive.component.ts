import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environment/environment';

interface Cultivo {
  id: number;
  idCultivo: number;
  idAgricultor: number;
  nombreAgricultor: string;
  idFinca: number;
  nombreFinca: string;
  idNave: number;
  nombreNave: string;
  idGenero: number;
  nombreGenero: string;
  nombreVariedad: string;
  superficie: number;
  produccionEstimada: number;
  fechaSiembra: Date;
  fechaFin: Date;
}

type CultivoKey = keyof Cultivo;

@Component({
  selector: 'app-cultive',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cultive.component.html',
})
export class CultiveComponent implements OnInit {
  Math = Math;
  data: Cultivo[] = [];

  searchQuery: string = '';
  itemsPerPage: number = 5;
  currentPage: number = 1;

  filteredData: Cultivo[] = [];
  paginatedData: Cultivo[] = [];
  selectedCultivo: Cultivo | null = null;

  allColumns: Array<{ name: CultivoKey; label: string; isDate: boolean }> = [
    { name: 'idCultivo', label: 'ID Cultivo', isDate: false },
    { name: 'idAgricultor', label: 'ID Agricultor', isDate: false },
    { name: 'nombreAgricultor', label: 'Agricultor', isDate: false },
    { name: 'nombreFinca', label: 'Finca', isDate: false },
    { name: 'nombreNave', label: 'Nave', isDate: false },
    { name: 'idGenero', label: 'ID Género', isDate: false },
    { name: 'nombreGenero', label: 'Género', isDate: false },
    { name: 'nombreVariedad', label: 'Variedad', isDate: false },
    { name: 'superficie', label: 'Superficie', isDate: false },
    { name: 'produccionEstimada', label: 'Producción Estimada', isDate: false },
    { name: 'fechaSiembra', label: 'Fecha Siembra', isDate: true },
    { name: 'fechaFin', label: 'Fecha Fin', isDate: true },
  ];

  selectedColumns: string[] = this.allColumns.map(col => col.name as string);
  showColumnSelector: boolean = false;

  constructor(private http: HttpClient) { }

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.itemsPerPage);
  }

  ngOnInit(): void {
    this.loadCultivos();
  }

  loadCultivos(): void {
    // Ahora apunta a /cultives
    const url = `${environment.baseUrl}/cultives`;
    this.http.get<any>(url).subscribe({
      next: (response) => {
        // Si la respuesta es un array directamente, no se utiliza "response.cultives"
        this.data = response.map((cultivo: any) => ({
          ...cultivo,
          fechaSiembra: cultivo.fechaSiembra ? new Date(cultivo.fechaSiembra) : null,
          fechaFin: cultivo.fechaFin ? new Date(cultivo.fechaFin) : null
        }));
        this.filterData();
      },
      error: (error) => {
        console.error('Error al cargar cultivos:', error);
      }
    });
  }

  toggleColumnSelector(): void {
    this.showColumnSelector = !this.showColumnSelector;
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement) {
    const clickedInside = target.closest('.relative');
    if (!clickedInside) {
      this.showColumnSelector = false;
    }
  }

  filterData(): void {
  const q = this.searchQuery.toLowerCase().trim();

  this.filteredData = q
    ? this.data.filter(item => {
        return [
          (item.idCultivo       ?? '').toString(),
          (item.idAgricultor    ?? '').toString(),
          (item.idFinca         ?? '').toString(),
          (item.idNave          ?? '').toString(),
          (item.idGenero        ?? '').toString(),
          (item.superficie      ?? '').toString(),
          (item.produccionEstimada ?? '').toString(),
          (item.nombreAgricultor ?? '').toLowerCase(),
          (item.nombreFinca      ?? '').toLowerCase(),
          (item.nombreNave       ?? '').toLowerCase(),
          (item.nombreGenero     ?? '').toLowerCase(),
          (item.nombreVariedad   ?? '').toLowerCase(),
          item.fechaSiembra
            ? item.fechaSiembra.toLocaleDateString().toLowerCase()
            : '',
          item.fechaFin
            ? item.fechaFin.toLocaleDateString().toLowerCase()
            : ''
        ].some(field => field.includes(q));
      })
    : [...this.data];

  this.currentPage = 1;
  this.selectedCultivo = null;
  this.updatePagination();
}


  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedData = this.filteredData.slice(startIndex, endIndex);
  }

  selectRow(item: Cultivo): void {
    this.selectedCultivo = item;
  
    // Abre la información detallada en una nueva pestaña o ventana
    const url = `/cultive/${item.id}`;
    window.open(url, '_blank');
  }
  
  //crud
  create(): void {
    console.log('Crear cultivo');
  }

  edit(): void {
    if (this.selectedCultivo) {
      console.log('Editar cultivo', this.selectedCultivo);
    }
  }

  delete(): void {
    if (this.selectedCultivo) {
      console.log('Borrar cultivo', this.selectedCultivo);
    }
  }

  //paginacion
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  toggleColumn(columnName: string): void {
    const index = this.selectedColumns.indexOf(columnName);
    if (index === -1) {
      this.selectedColumns.push(columnName);
    } else {
      this.selectedColumns.splice(index, 1);
    }
  }

  onItemsPerPageChange(value: string): void {
    this.itemsPerPage = Number(value);
    this.currentPage = 1;
    this.updatePagination();
  }
}
