import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { StockDto } from '../../types/StockDto';

@Component({
  selector: 'app-stock-details',
  standalone: true,
  imports: [CommonModule, FormsModule, ZXingScannerModule],
  templateUrl: './stock-details.component.html',
  styleUrl: './stock-details.component.css'
})
export class StockDetailsComponent implements OnInit {
  activeTab: 'Analisis de Stock' | 'Lectura de Stock' = 'Analisis de Stock';
  stock: StockDto | null = null;
  loading = true;
  error: string | null = null;

  // PARA EL ESCÁNER
  scannerEnabled = false;
  qrResult: string | null = null;

  // ** NUEVAS PROPIEDADES **
  availableDevices: MediaDeviceInfo[] = [];
  selectedDevice: MediaDeviceInfo | undefined;

  constructor() { }

  ngOnInit(): void { /*…*/ }

  setActiveTab(tab: 'Analisis de Stock' | 'Lectura de Stock'): void {
    this.activeTab = tab;
  }

  exportToPdf(): void { /*…*/ }

  onCodeResult(resultString: string) {
    this.qrResult = resultString;
    this.scannerEnabled = false;
    console.log('QR leído:', resultString);
  }

  onPermissionResponse(has: boolean) {
    console.log('¿Permiso concedido?', has);
    if (!has) {
      this.error = 'Necesito permiso para usar la cámara.';
    }
  }

  onScanError(err: any) {
    console.error('Error al escanear:', err);
    this.error = 'Error al acceder a la cámara: ' + err.name;
  }

  onCamerasFound(devices: MediaDeviceInfo[]) {
    console.log('Cámaras detectadas:', devices);
    this.availableDevices = devices;
    if (!this.selectedDevice && devices.length > 0) {
      this.selectedDevice = devices[0];
    }
  }

  onCamerasNotFound() {
    console.warn('No se detectó ninguna cámara');
    this.availableDevices = [];
    this.error = 'No se detectó ninguna cámara en el sistema.';
  }
}
