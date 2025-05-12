import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import type { StockDto } from "../types/StockDto";

@Injectable({
  providedIn: "root",
})
export class StockService {
  private mockRecords: StockDto[] = [
    { id: 1, date: new Date(2025, 4, 10, 9, 30), itemCount: 42, description: "Inventario inicial" },
    { id: 2, date: new Date(2025, 4, 9, 14, 15), itemCount: 37, description: "Actualización después de ventas" },
    { id: 3, date: new Date(2025, 4, 8, 11, 0),  itemCount: 45, description: "Reposición de stock" },
    { id: 4, date: new Date(2025, 4, 7, 16, 45), itemCount: 30, description: "Inventario semanal" },
  ];

  constructor() {}

  getStockRecords(): Observable<StockDto[]> {
    return of(this.mockRecords);
  }

  addStockRecord(record: Omit<StockDto, "id">): Observable<StockDto> {
    const newRecord: StockDto = {
      ...record,
      id: this.mockRecords.length + 1
    };
    this.mockRecords.unshift(newRecord);
    return of(newRecord);
  }

  /** Elimina un registro por su id */
  deleteStockRecord(id: number): Observable<void> {
    this.mockRecords = this.mockRecords.filter(r => r.id !== id);
    return of(undefined);
  }
}
