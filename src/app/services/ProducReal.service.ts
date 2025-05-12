import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { Observable } from 'rxjs';
import { ProducReal } from '../types/Producreal';

@Injectable({
  providedIn: 'root'
})
export class ProducRealService {
  url=environment.baseUrl+'/Erp/production-time';
  constructor(private http:HttpClient) { }

  get(fecha:string,idGenero:number):Observable<ProducReal[]>{
    return this.http.get<ProducReal[]>(`${this.url}?fechaInicio=${fecha}&idGenero=${idGenero}`);
  }
}
