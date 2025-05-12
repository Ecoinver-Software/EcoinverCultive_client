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
  styleUrls: ['./stock.component.css']
})
export class StockComponent implements OnInit, AfterViewInit {
  // Datos de ejemplo
  stockRecords: StockRecord[] = [
    { 
      id: 1, 
      date: new Date('2025-05-11T14:30:00'), 
      itemCount: 12,
      lastUpdated: new Date('2025-05-11T16:45:00') 
    },
    { 
      id: 2, 
      date: new Date('2025-05-09T09:15:00'), 
      itemCount: 8 
    },
    { 
      id: 3, 
      date: new Date('2025-05-05T11:20:00'), 
      itemCount: 15 
    },
    { 
      id: 4, 
      date: new Date('2025-04-30T16:45:00'), 
      itemCount: 6 
    }
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
    notes: ''
  };
  isSaving: boolean = false;
  showAddedToast: boolean = false;

  // Variables para interactividad
  isScrolled: boolean = false;
  isPulling: boolean = false;
  touchStartX: number = 0;
  lastTouchY: number = 0;

  constructor() { }

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

  // Métodos de formato de fecha para reemplazar el pipe date
  formatDay(date: Date): string {
    if (!date) return '';
    return date.getDate().toString().padStart(2, '0');
  }

  formatDate(date: Date): string {
    if (!date) return '';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  formatTime(date: Date): string {
    if (!date) return '';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  formatWeekday(date: Date): string {
    if (!date) return '';
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return days[date.getDay()];
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

  // Método para abrir el modal de añadir registro
  openAddRecordModal(): void {
    // Resetear el formulario con valores por defecto
    this.newRecord = {
      date: this.getTodayISOString(),
      time: this.getCurrentTimeString(),
      itemCount: 1,
      notes: ''
    };
    this.showAddModal = true;
    this.isSaving = false;
  }

  // Método para cerrar el modal de añadir
  closeAddModal(event: Event): void {
    event.stopPropagation();
    this.showAddModal = false;
  }

  // Validar formulario
  isFormValid(): boolean {
    return !!this.newRecord.date && 
           !!this.newRecord.time && 
           this.newRecord.itemCount > 0;
  }

  // Guardar nuevo registro
  saveNewRecord(): void {
    if (!this.isFormValid()) {
      return;
    }
    
    // Iniciar animación de carga
    this.isSaving = true;
    
    // Simular tiempo de procesamiento (en una app real, aquí iría la llamada al servicio)
    setTimeout(() => {
      // Crear nuevo registro
      const dateTimeString = `${this.newRecord.date}T${this.newRecord.time}:00`;
      const newDate = new Date(dateTimeString);
      
      // Generar ID único (en una app real, esto vendría del backend)
      const newId = Math.max(...this.stockRecords.map(r => r.id), 0) + 1;
      
      // Crear nuevo objeto de registro
      const newStockRecord: StockRecord = {
        id: newId,
        date: newDate,
        itemCount: this.newRecord.itemCount,
        notes: this.newRecord.notes,
        lastUpdated: new Date()
      };
      
      // Añadir al principio de la lista
      this.stockRecords = [newStockRecord, ...this.stockRecords];
      
      // Cerrar el modal
      this.showAddModal = false;
      
      // Mostrar notificación
      this.showAddedToast = true;
      
      // Ocultar la notificación después de 4 segundos
      setTimeout(() => {
        this.showAddedToast = false;
      }, 4000);
      
      // Limpiar variables
      this.isSaving = false;
      
      // Actualizar la animación del contador
      setTimeout(() => {
        this.initCountUpAnimation();
      }, 300);
    }, 800); // Tiempo suficiente para ver la animación de la barra de progreso
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
    const recordToDelete = this.stockRecords.find(record => record.id === recordId);
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
      this.stockRecords = this.stockRecords.filter(record => record.id !== this.recordToDeleteId);
      
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
  isRecent(date: Date): boolean {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 24;
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
  onTouchStart(event: TouchEvent): void {
    this.lastTouchY = event.touches[0].clientY;
  }

  onTouchMove(event: TouchEvent): void {
    const currentY = event.touches[0].clientY;
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    
    // Si estamos en la parte superior y arrastramos hacia abajo
    if (scrollTop === 0 && currentY > this.lastTouchY + 70) {
      this.isPulling = true;
      event.preventDefault();
    }
  }

  onTouchEnd(): void {
    if (this.isPulling) {
      this.refreshData();
    }
  }

  // Método para actualizar los datos
  refreshData(): void {
    // Mostrar animación de carga
    this.isPulling = true;
    
    // Simular carga (en una app real, aquí iría la llamada al servicio)
    setTimeout(() => {
      // Actualizar datos (en este ejemplo, simplemente simulamos que no hay cambios)
      console.log('Datos actualizados');
      this.isPulling = false;
    }, 1500);
  }

  // Animación para el contador
  initCountUpAnimation(): void {
    setTimeout(() => {
      const countElement = document.querySelector('.animate-countUp');
      if (countElement) {
        const targetCount = parseInt(countElement.getAttribute('data-count') || '0', 10);
        let currentCount = 0;
        const duration = 1000; // ms
        const step = Math.max(1, Math.floor(targetCount / 20));
        const interval = duration / (targetCount / step);
        
        const timer = setInterval(() => {
          currentCount += step;
          if (currentCount >= targetCount) {
            currentCount = targetCount;
            clearInterval(timer);
          }
          countElement.textContent = currentCount.toString();
        }, interval);
      }
    }, 500); // Pequeño retraso para asegurar que el DOM está listo
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