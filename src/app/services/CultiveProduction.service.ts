// src/app/services/cultive-production.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import {
  CultiveProductionDto,
  CreateCultiveProductionDto,
  UpdateCultiveProductionDto
} from '../types/CultiveProductionTypes';

@Injectable({
  providedIn: 'root'
})
export class CultiveProductionService {
  private baseUrl = `${environment.baseUrl}/cultiveProductions`;

  constructor(private http: HttpClient) { }

  /** GET: retrieve all productions */
  getAllCultiveProductions(): Observable<CultiveProductionDto[]> {
    return this.http.get<CultiveProductionDto[]>(this.baseUrl);
  }

  /** GET: retrieve a production by id */
  getByIdCultiveProduction(id: number | string): Observable<CultiveProductionDto> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.get<CultiveProductionDto>(url);
  }

  /** POST: create a new production */
  createCultiveProduction(dto: CreateCultiveProductionDto): Observable<CultiveProductionDto> {
    return this.http.post<CultiveProductionDto>(this.baseUrl, dto);
  }

  /** PUT: update an existing production */
  updateCultiveProduction(id: number | string, dto: UpdateCultiveProductionDto): Observable<CultiveProductionDto> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.put<CultiveProductionDto>(url, dto);
  }
  updatePatch(id: number, kilos: number) {
   
    return this.http.patch(`${this.baseUrl}/${id}/${kilos}`, null);
}
  /** DELETE: remove a production */
  deleteCultiveProduction(id: number | string): Observable<void> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.delete<void>(url);
  }
}
