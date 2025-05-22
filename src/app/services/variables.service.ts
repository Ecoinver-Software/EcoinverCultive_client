import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { HttpClient } from '@angular/common/http';
import { Variables } from '../types/variables';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VariablesService {
  url=environment.baseUrl+'/Variable';
  constructor(private http:HttpClient) { }

  get():Observable<Variables[]>{
    return this.http.get<Variables[]>(this.url);
  }

  post(variable:Variables):Observable<Variables>{
    const body={
      name:variable.name,
      idCultivo:variable.idCultivo,
      fechaRegistro:variable.fechaRegistro,
      valor:variable.valor
    }
    return this.http.post<Variables>(this.url,body);
  }

  delete(id:number){
    return this.http.delete(this.url+'/'+id);
  }
}
