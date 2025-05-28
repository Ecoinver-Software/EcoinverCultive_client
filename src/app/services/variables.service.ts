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
      valor:variable.valor,
      categoria:variable.categoria
    }
    return this.http.post<Variables>(this.url,body);
  }
  put(id:number,variable:Variables){
    const body={
      name:variable.name,
      idCultivo:variable.idCultivo,
      fechaRegistro:variable.fechaRegistro,
      valor:variable.valor,
      categoria:variable.categoria
    }
    return this.http.put(this.url+'/'+id,body);
  }

  delete(id:number):Observable<Variables>{
    return this.http.delete<Variables>(this.url+'/'+id);
  }
}
