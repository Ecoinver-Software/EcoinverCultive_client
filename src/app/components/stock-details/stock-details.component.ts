import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerComponent, ZXingScannerModule } from '@zxing/ngx-scanner';
import { StockDto } from '../../types/StockDto';

// Interface para almacenar los resultados del escaneo
interface ScannedResult {
  value: string;
  timestamp: Date;
  bulksQuantity: number;
}

@Component({
  selector: 'app-stock-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule],
  templateUrl: './stock-details.component.html',
  styleUrl: './stock-details.component.css'
})
export class StockDetailsComponent implements OnInit {
  @ViewChild('scanner') scanner!: ZXingScannerComponent;
  activeTab: 'Analisis de Stock' | 'Lectura de Stock' = 'Analisis de Stock';
  stock: StockDto | null = null;
  loading = true;
  error: string | null = null;

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

  constructor() {
    this.screenWidth = window.innerWidth;
  }

  // Detectar cambios en el tamaño de la ventana
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
  }

  ngOnInit(): void { 
    // Cargar datos iniciales del stock
    this.loadStockData();
    
    // Cargar resultados previos del localStorage si existen
    this.loadSavedResults();
    
    // Detectar modo oscuro inicial
    this.checkDarkMode();
    
    // Solicitar permiso de cámara explícitamente al iniciar
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        console.log('Permiso de cámara concedido');
        // Detener el stream después de obtener el permiso
        stream.getTracks().forEach(track => track.stop());
      })
      .catch(err => {
        console.error('Error al solicitar permiso de cámara:', err);
        this.error = 'No se pudo acceder a la cámara. Verifica los permisos.';
      });
  }

  // Método para cargar datos del stock (simulado)
  private loadStockData(): void {
    // Simular carga de datos (reemplazar con tu llamada real a API)
    this.loading = true;
    setTimeout(() => {
      this.stock = {
        id: 455,
        fecha: new Date(),
        itemCount: 128,
        // otros campos según tu modelo
      };
      this.loading = false;
    }, 800);
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
          timestamp: new Date(item.timestamp),
          bulksQuantity: item.bulksQuantity || 1
        }));
      } catch (e) {
        console.error('Error al cargar resultados guardados:', e);
      }
    }
  }

  // Cambiar la pestaña activa
  setActiveTab(tab: 'Analisis de Stock' | 'Lectura de Stock'): void {
    this.activeTab = tab;
    // Cerrar el escáner si cambiamos a otra pestaña
    if (tab !== 'Lectura de Stock') {
      this.closeScanner();
    }
  }

  // Método para exportar a PDF
  exportToPdf(): void { 
    // Implementar la lógica de exportación a PDF
    console.log('Exportando a PDF...');
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
    // Añadir el resultado con la cantidad de bultos
    this.scannedResults.unshift({
      value: this.pendingQrResult,
      timestamp: new Date(),
      bulksQuantity: this.bulksQuantity
    });
    
    // Guardar en localStorage
    this.saveResults();
    
    // Cerrar el modal de bultos
    this.showBulkQuantityModal = false;
    this.pendingQrResult = '';
    
    console.log('QR guardado con', this.bulksQuantity, 'bultos:', this.pendingQrResult);
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
    // Detener la propagación para evitar activar el escáner
    if (event) {
      event.stopPropagation();
    }
    
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
    
    // Asegurar un mínimo de ancho del 100%
    return `max(100%, ${totalWidth}px)`;
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
}