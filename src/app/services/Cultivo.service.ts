// cultivo.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { Cultive } from '../types/Cultive';

@Injectable({
  providedIn: 'root',
})
export class CultivoService {
  private baseUrl = environment.baseUrl + '/cultives';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Cultive[]> {
    return this.http.get<Cultive[]>(this.baseUrl);
  }

  getById(id: number | string): Observable<Cultive> {
    return this.http.get<Cultive>(`${this.baseUrl}/${id}`);
  }

 
  updateCultivo(
    id: number | string,
    cambios: Partial<Pick<Cultive, 'idCultivePlanning'>>
  ): Observable<Cultive> {
    return this.http.patch<Cultive>(`${this.baseUrl}/${id}`, cambios);
  }

  patch(id:number,kilos:number){
    return this.http.patch(this.baseUrl+'/'+id+'/prod',kilos);
  }
}