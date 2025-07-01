import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { Observable } from 'rxjs';
import { ComercialPlanning } from '../types/ComercialPlanning';
import { HttpClient } from '@angular/common/http';
import { ComercialPlanningPost } from '../types/ComercialPlanningPost';


@Injectable({
  providedIn: 'root'
})
export class ComercialPlanningService {
   private baseUrl = environment.baseUrl + '/CommercialNeedsPlanning';
 
  constructor(private http:HttpClient) { }

  get():Observable<ComercialPlanning[]>{
    return this.http.get<ComercialPlanning[]>(this.baseUrl);
  }
  post(planning:ComercialPlanningPost):Observable<{message:string,entity:ComercialPlanning}>{
    
    return this.http.post<{ message: string, entity: ComercialPlanning }>(this.baseUrl,planning);
  }
}
