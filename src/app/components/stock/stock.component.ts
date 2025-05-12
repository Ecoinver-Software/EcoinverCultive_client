import { Component, OnInit } from '@angular/core';
import { CommonModule }        from '@angular/common';
import { StockService }       from '../../services/stock.service';
import type { StockDto }      from '../../types/StockDto';

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css']
})
export class StockComponent implements OnInit {
  stockRecords: StockDto[] = [];

  constructor(private stockService: StockService) {}

  ngOnInit(): void {
    this.loadStockRecords();
  }

  private loadStockRecords(): void {
    this.stockService.getStockRecords()
      .subscribe(records => this.stockRecords = records);
  }

  openAddRecordModal(): void {
    const now = new Date();
    this.stockService.addStockRecord({
      date:        now,
      itemCount:   0,
      description: 'Nuevo registro'
    })
    .subscribe(() => {
      this.loadStockRecords();
    });
  }

  viewRecordDetails(id: number): void {
    console.log('Ver detalles del registro:', id);
    // tu lógica de routing / modal…
  }

  /**
   * Dispara la confirmación y, si acepta,
   * borra el registro
   */
  onDeleteRecord(recordId: number, event: MouseEvent): void {
    event.stopPropagation(); // evita el click en toda la fila
    const ok = confirm('¿Seguro que deseas eliminar este registro?');
    if (!ok) {
      return;
    }
    this.stockService.deleteStockRecord(recordId)
      .subscribe(() => {
        this.loadStockRecords();
      });
  }
}
