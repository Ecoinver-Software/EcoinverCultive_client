// INICIO DEL ARCHIVO
import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StockService } from '../../services/stock.service';
import { StockDto } from '../../types/StockDto';
import { Router } from '@angular/router';
import { ControlStockDetailsService } from '../../services/stock-details.service';
import { ControlStockDetailsDto } from '../../types/ControlStockDetailsTypes';

export interface StockRecord {
  fecha: Date;
  time: Date;
  itemCount: number;
  notes: string;
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
  stockRecords: StockDto[] = [];
  stockDetails:ControlStockDetailsDto[]=[];
  // Variables para el modal de eliminación
  showDeleteModal: boolean = false;
  recordToDeleteId: number | null = null;
  recordToDeleteDate: Date | null = null;
  isDeleteConfirmed: boolean = false;
  isDeleting: boolean = false;
  showDeletedToast: boolean = false;

  // Variables para el modal de añadir
  showAddModal: boolean = false;

  isSaving: boolean = false;
  showAddedToast: boolean = false;

  // Variables para interactividad
  isScrolled: boolean = false;
  isPulling: boolean = false;
  touchStartX: number = 0;
  lastTouchY: number = 0;

  constructor(private stockService: StockService, private router:Router, private stockDetailsService:ControlStockDetailsService ) { }

  ngOnInit(): void {
    // Detectar scroll para mostrar/ocultar el botón flotante
    window.addEventListener('scroll', () => {
      this.isScrolled = window.scrollY > 300;
    });

    //Traerse los datos del stock de la Base de datos
    this.stockService.getStock().subscribe(
      (data) => {
        this.stockRecords = data;
        console.log(this.stockRecords);
        this.rellenarItems();
      },
      (error) => {
        console.log(error);
      }
    );
  
   
  }

  ngAfterViewInit(): void {
    // Inicializar animación del contador
    this.initCountUpAnimation();
  }

  /** Añade un registro instantáneo con 0 items */
  addQuickRecord(): void {
    const now = new Date();
    const newId = Math.max(...this.stockRecords.map((r) => r.id), 0) + 1;
    this.stockRecords.push({
      id: newId,
      fecha: now,

      itemCount: 0

    });
    const adjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const postStock = {
      fecha: adjusted,

    };
    this.stockService.postStock(postStock).subscribe(
      (data) => {
        console.log(data);

      },
      (error) => {
        console.log(error);
      }
    )
    setTimeout(() => this.initCountUpAnimation(), 300);
  }
  // Métodos de formato de fecha para reemplazar el pipe date
  formatDay(d: Date) {
    d = new Date(d);
    return d.getDate().toString().padStart(2, '0');
  }
  formatDate(d: Date) {
    d = new Date(d);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()}`;
  }
  formatTime(d: Date) {
    d = new Date(d);
    return `${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }
  formatWeekday(d: Date) {
    d = new Date(d);
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
    this.router.navigate(['/stock-details',recordId]);
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
      this.recordToDeleteDate = recordToDelete.fecha;
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
    
    this.stockService.deleteStock(this.recordToDeleteId).subscribe(
      
      (data) => {
        console.log(data);
      },
      (error)=>{
        console.log(error);
      }
    )
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
  // isRecent(d: Date): boolean {
  // return (Date.now() - d.getTime()) / 36e5 < 24;
  //}

  // Verificar si un registro tiene actividad reciente
  hasRecentActivity(record: StockRecord): boolean {
    // Si tiene lastUpdated, usar esa fecha, si no, usar la fecha del registro
    const dateToCheck = new Date(record.fecha);

    const now = new Date();
    const diffMs = now.getTime() - dateToCheck.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 12; // Actividad en las últimas 12 horas
  }

  // Método para iniciar el arrastre en móviles
  startDragging(record: StockRecord, event: TouchEvent): void {
    event.stopPropagation();
    this.touchStartX = event.touches[0].clientX;

  }

  // Variables adicionales que deberías añadir a la clase
  swipeThreshold: number = 100; // Umbral en píxeles para considerar un swipe
  swipedRecordId: number | null = null; // ID del registro actualmente abierto por swipe

  // Método para finalizar el arrastre
  endDragging(record: StockDto, event?: TouchEvent): void {
    if (!event) return;

    const currentX = event.changedTouches[0].clientX;
    const diffX = this.touchStartX - currentX;

    // Si el deslizamiento supera el umbral, mostrar opciones
    if (Math.abs(diffX) > this.swipeThreshold) {
      // Si se desliza hacia la izquierda (diffX positivo), mostrar opciones
      if (diffX > 0) {
        // Si hay un registro previamente abierto que no es este, cerrarlo primero
        if (this.swipedRecordId !== null && this.swipedRecordId !== record.id) {
          this.closeSwipedOptions();
        }

        // Establecer este registro como el actualmente abierto
        this.swipedRecordId = record.id;

        // Aquí puedes manipular el DOM para mostrar las opciones
        // O usar una propiedad en el objeto record para marcarlo como "abierto"

        // Ejemplo con manipulación de DOM:
        const element = document.getElementById(`record-${record.id}`);
        if (element) {
          element.classList.add('swiped-open');
        }
      } else {
        // Si se desliza hacia la derecha, cerrar las opciones
        this.closeSwipedOptions();
      }
    } else {
      // Si no supera el umbral, mantener el estado actual
    }
  }

  // Método para cerrar cualquier opción abierta
  closeSwipedOptions(): void {
    if (this.swipedRecordId !== null) {
      const element = document.getElementById(`record-${this.swipedRecordId}`);
      if (element) {
        element.classList.remove('swiped-open');
      }
      this.swipedRecordId = null;
    }
  }

  // También deberás actualizar el método continueDragging para que muestre
  // visualmente el arrastre mientras ocurre:
  continueDragging(record: StockDto, event: TouchEvent): void {
    event.stopPropagation();
    const currentX = event.touches[0].clientX;
    const diffX = this.touchStartX - currentX;

    // Si es un deslizamiento significativo, aplicar la transformación
    if (Math.abs(diffX) > 10) {
      const element = document.getElementById(`record-${record.id}`);
      if (element) {
        // Limitar el deslizamiento a un máximo (por ejemplo, 150px)
        const maxSwipe = 150;
        const swipeAmount = Math.min(Math.abs(diffX), maxSwipe);

        // Si es hacia la izquierda (diffX positivo)
        if (diffX > 0) {
          element.style.transform = `translateX(-${swipeAmount}px)`;
        } else {
          // Si es hacia la derecha y ya está abierto, permitir cerrar
          if (this.swipedRecordId === record.id) {
            element.style.transform = `translateX(${maxSwipe - swipeAmount}px)`;
          }
        }
      }
    }
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

  isRecent(d: Date): boolean {
    const date = new Date(d);
    return (Date.now() - date.getTime()) / 36e5 < 24; // Comprueba si la fecha es menos de 24 horas atrás
  }

  rellenarItems(){
//Traerse los datos de los detalles del stock 
    this.stockDetailsService.getAll().subscribe(
      (data)=>{
        this.stockDetails=data;
       for(let i=0;i<this.stockRecords.length;i++){
    const encontrado=this.stockDetails.filter(item=>item.idControl==this.stockRecords[i].id)
      if(encontrado!==undefined){
        this.stockRecords[i].itemCount=encontrado.length;
      }
   }
      },
      (error)=>{
        console.log(error);
      }
    );
  }
}
// FIN DEL ARCHIVO
