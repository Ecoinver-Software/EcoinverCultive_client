// INICIO DEL ARCHIVO
import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface StockRecord {
  id: number;
  date: Date;
  itemCount: number;
  isBeingDragged?: boolean;
  lastUpdated?: Date;
  notes?: string;
}

interface NewStockRecord {
  date: string;
  time: string;
  itemCount: number;
  notes?: string;
}

@Component({
  selector: 'app-registros-stock',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css'],
})
export class StockComponent implements OnInit, AfterViewInit {
  // Datos de ejemplo
  stockRecords: StockRecord[] = [
    {
      id: 1,
      date: new Date('2025-05-11T14:30:00'),
      itemCount: 12,
      lastUpdated: new Date('2025-05-11T16:45:00'),
    },
    {
      id: 2,
      date: new Date('2025-05-09T09:15:00'),
      itemCount: 8,
    },
    {
      id: 3,
      date: new Date('2025-05-05T11:20:00'),
      itemCount: 15,
    },
    {
      id: 4,
      date: new Date('2025-04-30T16:45:00'),
      itemCount: 6,
    },
  ];

  // Variables para el modal de eliminación
  showDeleteModal: boolean = false;
  recordToDeleteId: number | null = null;
  recordToDeleteDate: Date | null = null;
  isDeleteConfirmed: boolean = false;
  isDeleting: boolean = false;
  showDeletedToast: boolean = false;

  // Variables para el modal de añadir
  showAddModal: boolean = false;
  newRecord: NewStockRecord = {
    date: this.getTodayISOString(),
    time: this.getCurrentTimeString(),
    itemCount: 1,
    notes: '',
  };
  isSaving: boolean = false;
  showAddedToast: boolean = false;

  // Variables para interactividad
  isScrolled: boolean = false;
  isPulling: boolean = false;
  touchStartX: number = 0;
  lastTouchY: number = 0;

  constructor() {}

  ngOnInit(): void {
    // Detectar scroll para mostrar/ocultar el botón flotante
    window.addEventListener('scroll', () => {
      this.isScrolled = window.scrollY > 300;
    });
  }

  ngAfterViewInit(): void {
    // Inicializar animación del contador
    this.initCountUpAnimation();
  }

  /** Añade un registro instantáneo con 0 items */
  addQuickRecord(): void {
    const now = new Date();
    const newId = Math.max(...this.stockRecords.map((r) => r.id), 0) + 1;
    this.stockRecords = [
      { id: newId, date: now, itemCount: 0, lastUpdated: now },
      ...this.stockRecords,
    ];
    setTimeout(() => this.initCountUpAnimation(), 300);
  }
  // Métodos de formato de fecha para reemplazar el pipe date
  formatDay(d: Date) {
    return d.getDate().toString().padStart(2, '0');
  }
  formatDate(d: Date) {
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}`;
  }
  formatTime(d: Date) {
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  formatWeekday(d: Date) {
    const days = [
      'domingo',
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
    ];
    return days[d.getDay()];
  }

  formatFullDate(date: Date | null): string {
    if (!date) return '';
    return this.formatDate(date);
  }

  // Método para obtener la fecha actual en formato ISO (YYYY-MM-DD)
  getTodayISOString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Método para obtener la hora actual (HH:MM)
  getCurrentTimeString(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Método para ver detalles del registro
  viewRecordDetails(recordId: number): void {
    console.log(`Viendo detalles del registro ${recordId}`);
    // Aquí iría la lógica para ver los detalles
  }

  // Método para abrir el modal de confirmación de eliminación
  openDeleteModal(recordId: number, event: Event): void {
    event.stopPropagation(); // Prevenir que se active el click del item
    this.recordToDeleteId = recordId;

    // Encontrar el registro para mostrar la fecha
    const recordToDelete = this.stockRecords.find(
      (record) => record.id === recordId
    );
    if (recordToDelete) {
      this.recordToDeleteDate = recordToDelete.date;
    }

    this.isDeleteConfirmed = false;
    this.showDeleteModal = true;
    this.isDeleting = false;
  }

  // Método para cerrar el modal de eliminación
  closeDeleteModal(event: Event): void {
    event.stopPropagation();
    this.showDeleteModal = false;
    this.recordToDeleteId = null;
    this.isDeleteConfirmed = false;
    this.isDeleting = false;
  }

  // Alternar la confirmación del checkbox
  toggleConfirmDelete(): void {
    this.isDeleteConfirmed = !this.isDeleteConfirmed;
  }

  // Método para confirmar la eliminación
  confirmDelete(): void {
    if (!this.isDeleteConfirmed || this.recordToDeleteId === null) {
      return;
    }

    // Iniciar animación de carga
    this.isDeleting = true;

    // Simular tiempo de procesamiento (en una app real, aquí iría la llamada al servicio)
    setTimeout(() => {
      // Eliminar el registro
      this.stockRecords = this.stockRecords.filter(
        (record) => record.id !== this.recordToDeleteId
      );

      // Cerrar el modal
      this.showDeleteModal = false;

      // Mostrar notificación
      this.showDeletedToast = true;

      // Ocultar la notificación después de 4 segundos
      setTimeout(() => {
        this.showDeletedToast = false;
      }, 4000);

      // Limpiar variables
      this.recordToDeleteId = null;
      this.recordToDeleteDate = null;
      this.isDeleteConfirmed = false;
      this.isDeleting = false;

      // Actualizar la animación del contador
      setTimeout(() => {
        this.initCountUpAnimation();
      }, 300);
    }, 800); // Tiempo suficiente para ver la animación de la barra de progreso
  }

  // Verificar si un registro es reciente (menos de 24 horas)
  isRecent(d: Date): boolean {
    return (Date.now() - d.getTime()) / 36e5 < 24;
  }

  // Verificar si un registro tiene actividad reciente
  hasRecentActivity(record: StockRecord): boolean {
    // Si tiene lastUpdated, usar esa fecha, si no, usar la fecha del registro
    const dateToCheck = record.lastUpdated || record.date;

    const now = new Date();
    const diffMs = now.getTime() - dateToCheck.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 12; // Actividad en las últimas 12 horas
  }

  // Método para iniciar el arrastre en móviles
  startDragging(record: StockRecord, event: TouchEvent): void {
    event.stopPropagation();
    this.touchStartX = event.touches[0].clientX;
    record.isBeingDragged = false;
  }

  // Método para continuar el arrastre
  continueDragging(record: StockRecord, event: TouchEvent): void {
    event.stopPropagation();
    const currentX = event.touches[0].clientX;
    const diffX = this.touchStartX - currentX;

    // Si se arrastra más de 50px a la izquierda, mostrar el botón de eliminar
    if (diffX > 50) {
      record.isBeingDragged = true;
    } else {
      record.isBeingDragged = false;
    }
  }

  // Método para finalizar el arrastre
  endDragging(record: StockRecord): void {
    // Mantener el estado actual (abierto o cerrado)
  }

  // Método para hacer scroll al inicio
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Métodos para el pull-to-refresh
  onTouchStart(e: TouchEvent) {
    this.lastTouchY = e.touches[0].clientY;
  }

  onTouchMove(e: TouchEvent) {
    const currentY = e.touches[0].clientY;
    const scrollTop =
      document.documentElement.scrollTop || document.body.scrollTop;
    if (scrollTop === 0 && currentY > this.lastTouchY + 70) {
      this.isPulling = true;
      e.preventDefault();
    }
  }
  onTouchEnd() {
    if (this.isPulling) this.refreshData();
  }

  // Método para actualizar los datos
  refreshData() {
    this.isPulling = true;
    setTimeout(() => (this.isPulling = false), 1500);
  }

  // Animación para el contador
  private initCountUpAnimation() {
    setTimeout(() => {
      const el = document.querySelector('.animate-countUp');
      if (!el) return;
      const target = +el.getAttribute('data-count')!;
      let count = 0;
      const step = Math.max(1, Math.floor(target / 20));
      const interval = 1000 / (target / step);
      const timer = setInterval(() => {
        count += step;
        if (count >= target) {
          count = target;
          clearInterval(timer);
        }
        el.textContent = count.toString();
      }, interval);
    }, 500);
  }

  // Prevenir el comportamiento de arrastre predeterminado en móviles
  @HostListener('touchmove', ['$event'])
  onTouchMovePrevent(event: TouchEvent): void {
    // Si estamos en el estado de "pull to refresh", prevenir el comportamiento predeterminado
    if (this.isPulling) {
      event.preventDefault();
    }
  }
}
// FIN DEL ARCHIVO
