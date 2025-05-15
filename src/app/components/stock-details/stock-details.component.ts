import { Component, OnInit, HostListener, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerComponent, ZXingScannerModule } from '@zxing/ngx-scanner';
import { StockDto } from '../../types/StockDto';
import { ControlStockDetailsService } from '../../services/stock-details.service';
import { ActivatedRoute } from '@angular/router';
import { StockService } from '../../services/stock.service';
import { GenderService } from '../../services/Gender.service';
import { Gender } from '../../types/gender';

// Interface para almacenar los resultados del escaneo
interface ScannedResult {
  value: string;
  timestamp: Date;
  bulksQuantity: number;
  saved?: boolean;
}

// Interface para los datos de categoría
interface CategoriaData {
  name: string;
  count: number;
}

// Interface para los datos de género agrupados
interface GeneroAgrupado {
  idGenero: number;
  nombreGenero: string;
  count: number;
}

// Interface para los datos de categoría agrupados
interface CategoriaAgrupada {
  categoria: string;
  count: number;
  porcentaje: number;
}

@Component({
  selector: 'app-stock-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule],
  templateUrl: './stock-details.component.html',
  styleUrl: './stock-details.component.css'
})
export class StockDetailsComponent implements OnInit, AfterViewInit {
  @ViewChild('scanner') scanner!: ZXingScannerComponent;

  activeTab: 'Analisis de Stock' | 'Lectura de Stock' = 'Analisis de Stock';
  stock: StockDto | null = null;
  loading = true;
  error: string | null = null;

  // ID de control obtenido de la URL
  idControl: number | null = null;

  // PARA EL ESCÁNER
  scannerEnabled = false;
  qrResult: string | null = null;

  // Para el modal de cantidad de bultos
  showBulkQuantityModal = false;
  pendingQrResult: string = '';
  bulksQuantity: number = 1;

  // Para la linterna
  torchEnabled = false;
  torchAvailable = false;
  scanActive = false;

  // Tema oscuro
  isDarkMode = false;

  // Historial de resultados de escaneo (el más reciente primero)
  scannedResults: ScannedResult[] = [];

  // DISPOSITIVOS DE CÁMARA
  availableDevices: MediaDeviceInfo[] = [];
  selectedDevice: MediaDeviceInfo | undefined;

  // Variables para responsive
  screenWidth: number = 0;
  baseCardSize: number = 160; // Tamaño base en píxeles

  // Variables para la sección de análisis y edición
  searchTerm: string = '';
  showSaveSuccess: boolean = false;
  showEditBulkModal: boolean = false;
  currentEditScan: ScannedResult | null = null;
  currentEditIndex: number = -1;
  editBulksQuantity: number = 1;

  // Datos para el análisis (se llenarán desde la API)
  stockDetails: any[] = []; // Datos crudos de la API
  generoData: Gender[] = [];
  categoriaData: CategoriaData[] = [];
  generos: Gender[] = [];
  generosUnicos: GeneroAgrupado[] = [];
  categoriasAgrupadas: CategoriaAgrupada[] = [];

  constructor(
    private stockService: StockService,
    private stockDetailsService: ControlStockDetailsService,
    private route: ActivatedRoute, 
    private generoService: GenderService
  ) {
    this.screenWidth = window.innerWidth;
  }

  // Detectar cambios en el tamaño de la ventana
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  // Cerrar los menús al hacer clic fuera de ellos
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Cerrar menú de agrupación si se hace clic fuera
    if (!target.closest('#group-menu') && !target.closest('[aria-labelledby="group-menu"]')) {
      //this.showGroupMenu = false;
    }
  }

  ngOnInit(): void {
    // Get the ID from the URL
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id && !isNaN(parseInt(id))) {
        this.idControl = parseInt(id);
        console.log('ID de control obtenido de la URL:', this.idControl);

        // Load main stock data
        this.loadStock();

        // Load stock details associated with this ID
        this.loadStockDetails();
      } else {
        this.error = 'ID de control no válido en la URL';
        this.loading = false;
      }
    });

    // Nos traemos los géneros
    this.generoService.get().subscribe(
      (data) => {
        this.generoData = data;
        console.log('Géneros cargados:', this.generoData);
      },
      (error) => {
        console.log('Error al cargar géneros:', error);
      }
    );
    
    // Nos treamos los datos de los detalles del stockDetails
    this.stockDetailsService.getAll().subscribe(
      (data) => {
        this.stockDetails = data;
        console.log('Stock details cargados:', this.stockDetails);
        // Procesar los datos para análisis
        this.processGeneroData();
        this.processCategoriaData();
      },
      (error) => {
        console.log('Error al cargar stock details:', error);
      }
    );
    
    // Detect initial dark mode
    this.checkDarkMode();

    // Request camera permission explicitly when starting
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        console.log('Permiso de cámara concedido');
        // Stop the stream after getting permission
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => {
        console.error('Error al solicitar permiso de cámara:', err);
        this.error = 'No se pudo acceder a la cámara. Verifica los permisos.';
      });
  }

  ngAfterViewInit(): void {
    // No necesitamos inicializar gráficos en esta versión simplificada
  }

  // Helper method to adjust dates to local timezone
  private adjustDateToLocalTimezone(date: Date | string): Date {
    let adjustedDate: Date;

    if (typeof date === 'string') {
      adjustedDate = new Date(date);
    } else {
      adjustedDate = new Date(date);
    }

    // Adjust for the timezone offset
    const userTimezoneOffset = 120; // 2 hours in minutes for your timezone (GMT+2)
    adjustedDate.setMinutes(adjustedDate.getMinutes() + userTimezoneOffset);

    return adjustedDate;
  }

  // Cargar la información del Stock principal usando el ID
  private loadStock(): void {
    if (!this.idControl) return;

    this.loading = true;
    // Buscar el stock específico por ID
    this.stockService.getStock().subscribe({
      next: (stocks) => {
        // Encontrar el stock con el ID correspondiente
        const matchingStock = stocks.find(s => s.id === this.idControl);
        if (matchingStock) {
          this.stock = matchingStock;
        } else {
          this.error = `No se encontró ningún stock con ID: ${this.idControl}`;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar el stock:', err);
        this.error = 'Error al cargar la información del stock.';
        this.loading = false;
      }
    });
  }

  // Método para cargar los detalles del stock asociados al idControl
  private loadStockDetails(): void {
    if (!this.idControl) return;

    this.loading = true;
    // Obtener detalles del stock filtrados por idControl
    this.stockDetailsService.getAll().subscribe({
      next: (datos: any[]) => {
        // Filtrar solo los detalles que corresponden a este idControl
        this.stockDetails = datos.filter(d => d.idControl === this.idControl);
        console.log('Datos filtrados:', this.stockDetails);

        // Mapear a ScannedResult para la pestaña de lectura
        this.scannedResults = this.stockDetails.map(d => ({
          value: d.codigoPartida,
          timestamp: this.adjustDateToLocalTimezone(d.fechaCreacion),
          bulksQuantity: d.numBultos,
          saved: true // Los datos cargados desde la DB ya están guardados
        }));

        // Procesar los datos para el análisis
        this.processGeneroData();
        this.processCategoriaData();

        this.loading = false;
      },
      error: err => {
        console.error('Error al cargar detalles desde API', err);
        this.error = 'Error al cargar los detalles del stock.';
        this.loading = false;
        // Fallback a localStorage si quieres
        this.loadSavedResults();
      }
    });
  }

  // Procesar datos para géneros
  processGeneroData(): number {
    // Inicializar arrays
    this.generos = [];
    this.generosUnicos = [];
    
    if (!this.stockDetails || this.stockDetails.length === 0) {
      return 0;
    }
    
    // Agrupar los datos de género
    const generosMap = new Map<number, GeneroAgrupado>();
    
    // Primero, procesar cada detalle del stock
    for (let i = 0; i < this.stockDetails.length; i++) {
      const idGenero = this.stockDetails[i].idGenero;
      
      // Buscar el género en los datos cargados
      const genero = this.generoData.find(g => g.idGenero === idGenero);
      
      if (genero) {
        // Añadir a la lista de géneros para mostrar
        this.generos.push(genero);
        
        // Agregar o actualizar en el mapa de géneros agrupados
        if (generosMap.has(idGenero)) {
          const existente = generosMap.get(idGenero);
          if (existente) {
            existente.count += this.stockDetails[i].numBultos;
          }
        } else {
          generosMap.set(idGenero, {
            idGenero: idGenero,
            nombreGenero: genero.nombreGenero || 'Desconocido',
            count: this.stockDetails[i].numBultos
          });
        }
      } else {
        // Si no encontramos el género, lo añadimos como desconocido
        this.generos.push({
          idGenero: idGenero,
          nombreGenero: 'Desconocido',
          nombreFamilia: 'Desconocido',
          idFamilia: '0'
        });
      }
    }
    
    // Convertir el mapa a array para mostrar en la UI
    this.generosUnicos = Array.from(generosMap.values());
    
    console.log('Géneros procesados:', this.generosUnicos);
    
    return this.generos.length;
  }

  // Procesar datos para categorías
  processCategoriaData(): void {
    // Agrupar por categoría y contar
    const categoriaMap = new Map<string, number>();
    let totalBultos = 0;

    this.stockDetails.forEach(item => {
      // Usar la categoría de los datos o un valor por defecto si está vacío
      const categoriaName = item.categoria || "Sin categoría";
      const numBultos = item.numBultos || 0;
      
      totalBultos += numBultos;
      
      const currentCount = categoriaMap.get(categoriaName) || 0;
      categoriaMap.set(categoriaName, currentCount + numBultos);
    });

    // Convertir el mapa a un array para las tablas y gráficos
    this.categoriaData = Array.from(categoriaMap.entries()).map(([name, count]) => ({
      name,
      count
    }));
    
    // Calcular porcentajes para cada categoría
    this.categoriasAgrupadas = Array.from(categoriaMap.entries()).map(([categoria, count]) => ({
      categoria,
      count,
      porcentaje: totalBultos > 0 ? Math.round((count / totalBultos) * 100) : 0
    }));

    // Si no hay datos, crear algunos por defecto
    if (this.categoriaData.length === 0) {
      this.categoriaData = [
        { name: "Sin datos", count: 0 }
      ];
      
      this.categoriasAgrupadas = [
        { categoria: "Sin datos", count: 0, porcentaje: 0 }
      ];
    }
    
    console.log('Categorías procesadas:', this.categoriasAgrupadas);
  }

  // Obtener el nombre del género a partir del ID
  getGeneroName(idGenero: number): string {
    // Buscar en generoData el género correspondiente
    const genero = this.generoData.find(g => g.idGenero === idGenero);
    if (genero && genero.nombreGenero) {
      return genero.nombreGenero;
    }
    
    // Si no se encuentra en el servicio, devolver un valor genérico
    return `Género ${idGenero}`;
  }

  // Método para cargar resultados guardados
  private loadSavedResults(): void {
    const savedResults = localStorage.getItem('scannedQrResults');
    if (savedResults) {
      try {
        // Convertir las cadenas de fecha a objetos Date
        const parsed = JSON.parse(savedResults);
        this.scannedResults = parsed.map((item: any) => ({
          value: item.value,
          timestamp: this.adjustDateToLocalTimezone(item.timestamp),
          bulksQuantity: item.bulksQuantity || 1,
          saved: item.saved || false
        }));

        // Crear datos de análisis a partir de los resultados guardados
        this.processDataFromScannedResults();
      } catch (e) {
        console.error('Error al cargar resultados guardados:', e);
      }
    }
  }

  // Procesar datos de análisis a partir de los resultados escaneados
  private processDataFromScannedResults(): void {
    // Convertir los resultados escaneados a un formato similar al de la API
    this.stockDetails = this.scannedResults.map(scan => {
      // Extraer el código numérico del QR
      const match = scan.value.match(/\.([0-9]+)\*?$/);
      const codigoNum = match ? parseInt(match[1], 10) : 0;

      return {
        codigoPartida: scan.value,
        numBultos: scan.bulksQuantity,
        idGenero: 0, // Valor por defecto si no hay info de género
        categoria: "", // Valor por defecto si no hay categoría
        idControl: this.idControl
      };
    });

    // Una vez convertidos, procesamos para análisis
    this.processGeneroData();
    this.processCategoriaData();
  }

  // Cambiar la pestaña activa
  setActiveTab(tab: 'Analisis de Stock' | 'Lectura de Stock'): void {
    this.activeTab = tab;
    // Cerrar el escáner si cambiamos a otra pestaña
    if (tab !== 'Lectura de Stock') {
      this.closeScanner();
    }

    // Actualizar los datos si cambiamos a la pestaña de análisis
    if (tab === 'Analisis de Stock') {
      // Actualizar los datos de análisis
      this.processGeneroData();
      this.processCategoriaData();
    }
  }

  // Método para exportar a PDF
  exportToPdf(): void {
    // Implementar la lógica de exportación a PDF
    console.log('Exportando a PDF...');
    alert('Exportando a PDF...');
  }

  // Método mejorado para activar/desactivar el escáner
  toggleScanner(): void {
    this.scannerEnabled = !this.scannerEnabled;

    if (this.scannerEnabled) {
      // Esperamos un tick para que Angular inserte el <zxing-scanner> en el DOM
      setTimeout(() => {
        // Si el componente del scanner está disponible, pedimos permiso
        if (this.scanner) {
          this.scanner.askForPermission();
        }
      }, 0);
    } else {
      this.closeScanner();
    }
  }

  // Método seguro para cerrar el escáner
  closeScanner(): void {
    this.scannerEnabled = false;
    this.torchEnabled = false;
    this.scanActive = false;
    this.error = null;
  }

  // Método para alternar la linterna (flash)
  toggleTorch(): void {
    this.torchEnabled = !this.torchEnabled;
  }

  // Método para manejar cambios en la selección del dispositivo
  onDeviceSelectChange(): void {
    // Resetear error al cambiar de dispositivo
    this.error = null;

    // Verificar si el nuevo dispositivo seleccionado tiene flash
    this.checkTorchAvailability();
  }

  // Método para comprobar si la linterna está disponible
  checkTorchAvailability(): void {
    if (this.selectedDevice && this.selectedDevice.label) {
      // La mayoría de las cámaras traseras tienen flash
      this.torchAvailable = this.selectedDevice.label.toLowerCase().includes('back') ||
        this.selectedDevice.label.toLowerCase().includes('trasera') ||
        this.selectedDevice.label.toLowerCase().includes('rear');
    } else {
      this.torchAvailable = false;
    }
  }

  // Método para manejar el resultado del escaneo QR
  onQrCodeDetected(resultString: string): void {
    // Pausar el escáner
    this.scannerEnabled = false;

    // Almacenar el resultado temporalmente
    this.pendingQrResult = resultString;

    // Mostrar el modal para ingresar la cantidad de bultos
    this.bulksQuantity = 1; // Resetear a valor por defecto
    this.showBulkQuantityModal = true;

    // Reproducir sonido de éxito (opcional)
    this.playSuccessSound();
  }

  // Para mantener compatibilidad con el código anterior
  onCodeResult(resultString: string): void {
    this.onQrCodeDetected(resultString);
  }

  // Incrementar la cantidad de bultos
  incrementBulks(): void {
    this.bulksQuantity++;
  }

  // Decrementar la cantidad de bultos (mínimo 1)
  decrementBulks(): void {
    if (this.bulksQuantity > 1) {
      this.bulksQuantity--;
    }
  }

  // Cancelar la entrada de bultos
  cancelBulkEntry(): void {
    this.showBulkQuantityModal = false;
    this.pendingQrResult = '';
    this.bulksQuantity = 1;
  }

  // Guardar la cantidad de bultos y el resultado del escaneo
  saveBulkQuantity(): void {
    if (!this.idControl) {
      this.error = 'ID de control inválido';
      return;
    }

    // Extraemos sólo los dígitos tras el último punto y sin '*'
    const match = this.pendingQrResult.match(/\.([0-9]+)\*?$/);
    const codigoNum = match ? parseInt(match[1], 10) : NaN;
    if (isNaN(codigoNum)) {
      this.error = 'QR con formato incorrecto';
      this.showBulkQuantityModal = false;
      return;
    }

    // Crear objeto con fecha actual explícita en formato ISO
    const fechaActual = new Date();

    const crearStock = {
      NumBultos: this.bulksQuantity,
      CodigoPartida: codigoNum,
      IdGenero: 0,
      Categoria: '',
      idControl: this.idControl,
      FechaCreacion: fechaActual.toISOString() // Añadir la fecha actual en formato ISO
    };

    console.log('Enviando fecha de creación:', fechaActual, fechaActual.toISOString());

    this.stockDetailsService.create(crearStock).subscribe(
      (data: any) => {
        console.log('Se ha creado correctamente', data);
        this.updatePartidaFromQr(codigoNum);
      },
      (error: any) => {
        console.error('Error al crear stock:', error);
        // Aún así, actualizamos la UI para no bloquear al usuario
        this.scannedResults.unshift({
          value: this.pendingQrResult,
          timestamp: fechaActual, // Usamos la misma fecha que enviamos al servidor
          bulksQuantity: this.bulksQuantity,
          saved: false // Marcado como no guardado
        });
        this.showBulkQuantityModal = false;
        this.pendingQrResult = '';
        // Mostrar mensaje de error
        this.error = 'Error al guardar en la base de datos';

        // Actualizar los datos de análisis
        this.processDataFromScannedResults();
      }
    );
  }

  // Método secundario que hace el PUT a ERP usando el número del QR
  private updatePartidaFromQr(codigoNum: number): void {
    const fechaActual = new Date();

    this.stockDetailsService
      .updatePartidaErp(codigoNum, {
        idPartida: codigoNum,
      })
      .subscribe({
        next: () => {
          // Todo OK: actualizamos la UI
          this.scannedResults.unshift({
            value: this.pendingQrResult,
            timestamp: fechaActual, // Usamos la misma fecha que enviamos al servidor
            bulksQuantity: this.bulksQuantity,
            saved: true // Marcado como guardado
          });
          this.showBulkQuantityModal = false;
          this.pendingQrResult = '';
          this.showSaveSuccess = true;
          // Ocultar mensaje después de 3 segundos
          setTimeout(() => {
            this.showSaveSuccess = false;
          }, 3000);
          // Recargar todos los datos
          this.loadStockDetails();
        },
        error: () => {
          this.error = 'Fallo al actualizar ERP';
          this.showBulkQuantityModal = false;
          // Aún así, actualizamos la UI para no bloquear al usuario
          this.scannedResults.unshift({
            value: this.pendingQrResult,
            timestamp: fechaActual, // Usamos la misma fecha que enviamos al servidor
            bulksQuantity: this.bulksQuantity,
            saved: false // Marcado como no guardado
          });

          // Actualizar los datos de análisis
          this.processDataFromScannedResults();
        }
      });
  }

  // Método para reproducir un sonido de éxito (opcional)
  playSuccessSound(): void {
    try {
      const audio = new Audio('assets/sounds/beep-success.mp3');
      audio.play();
    } catch (e) {
      console.log('No se pudo reproducir el sonido');
    }
  }

  // Eliminar un resultado del historial
  removeResult(index: number, event?: Event): void {
    // Stop propagation to avoid triggering the scanner
    if (event) {
      event.stopPropagation();
    }

    const itemToRemove = this.scannedResults[index];

    // Find the corresponding ID in the database to delete it
    this.stockDetailsService.getAll().subscribe({
      next: (datos: any[]) => {
        // Find the element that matches the scanned one (by partition code and quantity)
        const matchingItem = datos.find(d =>
          d.codigoPartida === itemToRemove.value &&
          d.numBultos === itemToRemove.bulksQuantity &&
          d.idControl === this.idControl
        );

        if (matchingItem) {
          // Delete from the database
          this.stockDetailsService.delete(matchingItem.id).subscribe({
            next: () => {
              console.log('Elemento eliminado de la base de datos');
              // Only remove locally AFTER successful API deletion
              this.performLocalRemove(index);

              // Actualizar los datos de análisis
              this.loadStockDetails();
            },
            error: (err: any) => {
              console.error('Error al eliminar de la base de datos:', err);
              this.error = 'No se pudo eliminar el elemento del servidor. Inténtalo de nuevo.';
              // Do NOT remove from local view if API delete fails
            }
          });
        } else {
          console.warn('No se encontró el elemento en la base de datos');
          this.error = 'Este elemento no existe en el servidor. Actualiza la página.';
          // Consider refreshing from API here
          this.loadStockDetails();
        }
      },
      error: (err: any) => {
        console.error('Error al buscar el elemento a eliminar:', err);
        this.error = 'Error de comunicación con el servidor.';
      }
    });
  }

  // Función auxiliar para eliminar visualmente con animación
  private performLocalRemove(index: number): void {
    // Añadir clase de animación antes de eliminar
    const cardElement = document.querySelectorAll('.qr-result-card')[index] as HTMLElement;
    if (cardElement) {
      cardElement.classList.add('removing');

      // Esperar a que termine la animación
      setTimeout(() => {
        this.scannedResults.splice(index, 1);
        // Actualizar localStorage
        this.saveResults();
      }, 300);
    } else {
      // Si no encuentra el elemento, eliminar directamente
      this.scannedResults.splice(index, 1);
      this.saveResults();
    }
  }

  // Guardar resultados en localStorage
  private saveResults(): void {
    localStorage.setItem('scannedQrResults', JSON.stringify(this.scannedResults));
  }

  // Métodos para el tamaño dinámico de las tarjetas
  getAddCardWidth(): string {
    // La tarjeta de añadir (+) crece con la cantidad de resultados
    const baseWidth = this.getBaseCardWidth();
    const growFactor = Math.min(this.scannedResults.length * 0.05, 0.5); // Crecer hasta un 50% más

    return `${baseWidth + (baseWidth * growFactor)}px`;
  }

  getResultCardWidth(): string {
    return `${this.getBaseCardWidth()}px`;
  }

  getCardHeight(): string {
    // Altura responsiva basada en el ancho de la pantalla
    const heightFactor = this.screenWidth < 640 ? 1.2 : 1.4;
    return `${this.getBaseCardWidth() * heightFactor}px`;
  }

  private getBaseCardWidth(): number {
    // Ajustar el tamaño base dependiendo del ancho de la pantalla
    if (this.screenWidth < 640) {
      return this.baseCardSize * 0.8; // Más pequeño en móviles
    } else if (this.screenWidth < 1024) {
      return this.baseCardSize * 0.9; // Tamaño medio en tablets
    } else {
      return this.baseCardSize; // Tamaño completo en desktop
    }
  }

  getCardWrapperWidth(): string {
    // Asegurar que el contenedor sea lo suficientemente ancho
    const totalCards = this.scannedResults.length + 1; // +1 por la tarjeta de añadir
    const gap = 16; // 4rem de gap entre tarjetas

    const addCardWidth = parseFloat(this.getAddCardWidth());
    const resultCardWidth = parseFloat(this.getResultCardWidth());

    const totalWidth = addCardWidth + (resultCardWidth * this.scannedResults.length) + (gap * (totalCards - 1));

    return `${totalWidth}px`;
  }

  // Eventos del escáner QR mejorados
  onPermissionResponse(hasPermission: boolean): void {
    console.log('¿Permiso para usar la cámara?', hasPermission);
    if (!hasPermission) {
      this.error = 'Necesito permiso para usar la cámara.';
    }
  }

  onScanError(err: any): void {
    console.error('Error al escanear:', err);

    // Mensaje más amigable para el usuario
    if (err.name === 'NotAllowedError') {
      this.error = 'Necesito permiso para usar la cámara.';
    } else if (err.name === 'NotFoundError') {
      this.error = 'No se pudo encontrar una cámara en tu dispositivo.';
    } else if (err.name === 'NotReadableError') {
      this.error = 'La cámara está siendo utilizada por otra aplicación.';
    } else {
      this.error = 'Error al acceder a la cámara: ' + (err.message || 'Verifica los permisos');
    }
  }

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    console.log('Cámaras detectadas:', devices);
    this.availableDevices = devices;

    if (!this.selectedDevice && devices.length > 0) {
      // Intentar seleccionar la cámara trasera por defecto (mejor para QR)
      const rearCamera = devices.find(d =>
        d.label.toLowerCase().includes('back') ||
        d.label.toLowerCase().includes('trasera') ||
        d.label.toLowerCase().includes('rear')
      );
      this.selectedDevice = rearCamera || devices[0];

      // Verificar disponibilidad de linterna
      this.checkTorchAvailability();
    }
  }

  onCamerasNotFound(): void {
    console.warn('No se detectó ninguna cámara');
    this.availableDevices = [];
    this.error = 'No se detectó ninguna cámara en el dispositivo.';
  }

  // Método mejorado para reintentar el escaneo
  retryScanner(): void {
    this.error = null;

    // Reiniciar el escáner con una pequeña pausa
    setTimeout(() => {
      this.scannerEnabled = false;

      setTimeout(() => {
        this.scannerEnabled = true;

        // Volver a pedir permiso
        if (this.scanner) {
          this.scanner.askForPermission();
        }
      }, 100);
    }, 300);
  }

  // Método para detectar tema oscuro/claro
  checkDarkMode(): void {
    // Puedes adaptar esto según cómo manejes los temas en tu aplicación
    this.isDarkMode = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // MÉTODOS PARA EL ANÁLISIS DE STOCK

  // Obtener el total de bultos
  getTotalBulks(): number {
    return this.stockDetails.reduce((total, item) => total + (item.numBultos || 0), 0);
  }

  // Filtrar resultados para la búsqueda
  get filteredResults(): ScannedResult[] {
    if (!this.searchTerm.trim()) {
      return [...this.scannedResults];
    }

    const term = this.searchTerm.toLowerCase().trim();
    return this.scannedResults.filter(scan =>
      scan.value.toLowerCase().includes(term)
    );
  }

  // Editar cantidad de bultos
  editBulkQuantity(scan: ScannedResult, index: number): void {
    this.currentEditScan = scan;
    this.currentEditIndex = index;
    this.editBulksQuantity = scan.bulksQuantity || 1;
    this.showEditBulkModal = true;
  }

  // Cancelar edición de bultos
  cancelEditBulk(): void {
    this.showEditBulkModal = false;
    this.currentEditScan = null;
    this.currentEditIndex = -1;
  }

  // Incrementar bultos en edición
  incrementEditBulks(): void {
    this.editBulksQuantity++;
  }

  // Decrementar bultos en edición
  decrementEditBulks(): void {
    if (this.editBulksQuantity > 1) {
      this.editBulksQuantity--;
    }
  }

  // Actualizar la cantidad de bultos
  updateBulkQuantity(): void {
    if (!this.currentEditScan || this.currentEditIndex < 0) {
      return;
    }

    // Obtener el elemento original
    const originalScan = this.scannedResults[this.currentEditIndex];

    // Actualizar en la API solo si el elemento está guardado
    if (originalScan.saved) {
      this.stockDetailsService.getAll().subscribe({
        next: (datos: any[]) => {
          // Encontrar el elemento correspondiente
          const matchingItem = datos.find(d =>
            d.codigoPartida === originalScan.value &&
            d.numBultos === originalScan.bulksQuantity &&
            d.idControl === this.idControl
          );

          if (matchingItem) {
            // Actualizar en la base de datos
            const updateData = {
              ...matchingItem,
              numBultos: this.editBulksQuantity
            };

            this.stockDetailsService.update(matchingItem.id, updateData).subscribe({
              next: () => {
                // Actualizar localmente
                this.scannedResults[this.currentEditIndex].bulksQuantity = this.editBulksQuantity;
                this.showEditBulkModal = false;
                this.showSaveSuccess = true;

                // Ocultar mensaje después de 3 segundos
                setTimeout(() => {
                  this.showSaveSuccess = false;
                }, 3000);

                // Actualizar los datos de análisis
                this.loadStockDetails();
              },
              error: (err: any) => {
                console.error('Error al actualizar en la base de datos:', err);
                this.error = 'No se pudo actualizar la cantidad en el servidor.';
                this.showEditBulkModal = false;
              }
            });
          } else {
            console.warn('No se encontró el elemento en la base de datos');
            this.error = 'Este elemento no existe en el servidor.';
            this.showEditBulkModal = false;
          }
        },
        error: (err: any) => {
          console.error('Error al buscar el elemento a actualizar:', err);
          this.error = 'Error de comunicación con el servidor.';
          this.showEditBulkModal = false;
        }
      });
    } else {
      // Si no está guardado, solo actualizamos localmente
      this.scannedResults[this.currentEditIndex].bulksQuantity = this.editBulksQuantity;
      this.showEditBulkModal = false;

      // Guardar en localStorage
      this.saveResults();

      // Actualizar los datos de análisis
      this.processDataFromScannedResults();
    }
  }
  // Calcular el porcentaje del total para la tabla
  calculatePercentage(type: string, item: any): string {
    const totalBultos = this.getTotalBulks();
    if (totalBultos === 0) return '0';
    
    let itemCount = 0;
    
    if (type === 'genero') {
      // Para géneros, buscar todos los items que tengan ese idGenero
      itemCount = this.stockDetails
        .filter(d => d.idGenero === item.idGenero)
        .reduce((total, d) => total + (d.numBultos || 0), 0);
    } 
    else if (type === 'categoria') {
      // Para categorías, buscar todos los items que tengan esa categoría
      const categoria = item.categoria || 'Sin categoría';
      itemCount = this.stockDetails
        .filter(d => (d.categoria || 'Sin categoría') === categoria)
        .reduce((total, d) => total + (d.numBultos || 0), 0);
    }
    
    const percentage = (itemCount / totalBultos) * 100;
    return percentage.toFixed(1); // Redondear a 1 decimal
  }
}