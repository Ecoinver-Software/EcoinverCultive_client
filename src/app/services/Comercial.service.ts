import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment/environment';
import { CreateComercial } from '../types/createComercial';
import { Client } from '../types/Client';


export interface Comercial {
  id: number;
  clientCode: number;
  clientName: string;
  startDate: Date;
  endDate: Date;
  idGenero:number;
  nombreGenero:string;
  kgs: number;
  nombreUsuario:string;
}


@Injectable({
  providedIn: 'root'
})

export class ComercialServiceService {
  private url = environment.baseUrl + '/commercialneeds';
  constructor(private http: HttpClient) { }

  getComercial(): Observable<Comercial[]> {

    return this.http.get<Comercial[]>(this.url);
  }
  deleteComercial(id: number): Observable<Comercial[]> {

    return this.http.delete<Comercial[]>(this.url + '/' + id);
  }
  
  createComercial(clientData: CreateComercial): Observable<Comercial[]> {
    return this.http.post<Comercial[]>(this.url, clientData);
  }

  editComercial(id: number, clientData: CreateComercial): Observable<Comercial[]> {

    return this.http.put<Comercial[]>(this.url + '/' + id, clientData);
  }

  getClienteErp() {
    const url = environment.baseUrl + '/Erp/clients';
    return this.http.get(url);
  }

  getCliente(): Observable<Client[]> {
    const url = environment.baseUrl + '/clients';
    return this.http.get<Client[]>(url);
  }
}
