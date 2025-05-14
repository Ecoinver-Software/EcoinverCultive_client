// control-stock-details.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ControlStockDetailsDto, CreateStockDetailsDto, PutIdPartidaDto } from './../types/ControlStockDetailsTypes';
import { environment } from '../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ControlStockDetailsService {
  apiUrl=environment.baseUrl;

  constructor(private http: HttpClient) {}

  /** Obtiene todos los registros */
  getAll(): Observable<ControlStockDetailsDto[]> {
    return this.http.get<ControlStockDetailsDto[]>(`${this.apiUrl}/ControlStockDetails`);
  }

  /** Obtiene un registro por su id */
  getById(id: number): Observable<ControlStockDetailsDto> {
    return this.http.get<ControlStockDetailsDto>(`${this.apiUrl}/ControlStockDetails/${id}`);
  }

  /** Crea un nuevo registro */
  create(dto: CreateStockDetailsDto): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/ControlStockDetails`, dto);
  }

  /** Actualiza un registro existente */
  update(id: number, dto: CreateStockDetailsDto): Observable<string> {
    return this.http.put<string>(`${this.apiUrl}/ControlStockDetails/${id}`, dto);
  }

  /** Elimina un registro */
  delete(id: number): Observable<string> {
    return this.http.delete<string>(`${this.apiUrl}/ControlStockDetails/${id}`);
  }

  updatePartidaErp(id: number, dto: PutIdPartidaDto): Observable<string> {
    return this.http.put<string>(`${this.apiUrl}/Erp/palets/partida/${id}`, dto);
  }
}
