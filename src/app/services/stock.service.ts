import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import type { StockDto } from "../types/StockDto";
import { environment } from "../environment/environment";
import { HttpClient } from "@angular/common/http";
export interface postStock{
  fecha:Date;
  
}
@Injectable({
  providedIn: "root",
})
export class StockService {
  url=environment.baseUrl;

  constructor(private http:HttpClient) {}

  getStock():Observable<StockDto[]>{
    return this.http.get<StockDto[]>(this.url+'/ControlStock');
  }
  postStock(anadirStock:postStock){
    return this.http.post(this.url+'/ControlStock',anadirStock)
  }

  deleteStock(id:number){
    return this.http.delete(this.url+'/ControlStock/'+id);
  }
}
