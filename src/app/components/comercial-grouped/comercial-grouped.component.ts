import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ComercialServiceService } from '../../services/Comercial.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Comercial } from '../../services/Comercial.service';


@Component({
  selector: 'app-comercial-grouped',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comercial-grouped.component.html',
  styleUrls: ['./comercial-grouped.component.css']
})
export class ComercialGroupedComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  rawData: Comercial[] = [];
  groupedData: GroupedData[] = [];
  loading = false;
  error: string | null = null;

  constructor(private comercialService: ComercialServiceService) { }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData() {
    this.loading = true;
    this.error = null;

    this.comercialService.getComercial()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.rawData = data;
          this.processData();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Error al cargar los datos: ' + error.message;
          this.loading = false;
        }
      });
  }

  processData() {
    const userMap = new Map<string, GroupedData>();

    this.rawData.forEach(item => {
      // Crear o obtener usuario
      if (!userMap.has(item.nombreUsuario)) {
        userMap.set(item.nombreUsuario, {
          usuario: item.nombreUsuario,
          expanded: false,
          clientes: [],
          totalKgs: 0
        });
      }

      const userData = userMap.get(item.nombreUsuario)!;

      // Buscar o crear cliente
      let clienteData = userData.clientes.find(c => c.clientCode === item.clientCode);
      if (!clienteData) {
        clienteData = {
          clientCode: item.clientCode,
          clientName: item.clientName,
          expanded: false,
          generos: [],
          totalKgs: 0
        };
        userData.clientes.push(clienteData);
      }

      // Buscar o crear género
      let generoData = clienteData.generos.find(g => g.idGenero === item.idGenero);
      if (!generoData) {
        generoData = {
          idGenero: item.idGenero,
          nombreGenero: item.nombreGenero,
          items: [],
          totalKgs: 0
        };
        clienteData.generos.push(generoData);
      }

      // Agregar item
      generoData.items.push(item);
      generoData.totalKgs += item.kgs;
      clienteData.totalKgs += item.kgs;
      userData.totalKgs += item.kgs;
    });

    // Ordenar los datos
    this.groupedData = Array.from(userMap.values());

    // Ordenar usuarios por nombre
    this.groupedData.sort((a, b) => a.usuario.localeCompare(b.usuario));

    // Ordenar clientes por nombre dentro de cada usuario
    this.groupedData.forEach(user => {
      user.clientes.sort((a, b) => a.clientName.localeCompare(b.clientName));

      // Ordenar géneros por nombre dentro de cada cliente
      user.clientes.forEach(client => {
        client.generos.sort((a, b) => a.nombreGenero.localeCompare(b.nombreGenero));
      });
    });
  }

  toggleUser(userData: GroupedData) {
    userData.expanded = !userData.expanded;
  }

  toggleClient(clienteData: any) {
    clienteData.expanded = !clienteData.expanded;
  }

  getTotalItems(): number {
    return this.rawData.length;
  }

  getTotalKgs(): number {
    return this.rawData.reduce((sum, item) => sum + item.kgs, 0);
  }

  // Método para refrescar los datos
  refreshData() {
    this.loadData();
  }

}


interface GroupedData {
  usuario: string;
  expanded: boolean;
  totalKgs: number;
  clientes: ClienteData[];
}

interface ClienteData {
  clientCode: number;
  clientName: string;
  expanded: boolean;
  totalKgs: number;
  generos: GeneroData[];
}

interface GeneroData {
  idGenero: number;
  nombreGenero: string;
  totalKgs: number;
  items: Comercial[];
}
