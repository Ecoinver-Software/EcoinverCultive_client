import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environment/environment';
import { Observable } from 'rxjs';
import { Gender } from '../types/Gender';
import { GenderTypes } from '../types/GenderTypes';
//gender.service.ts
@Injectable({
  providedIn: 'root'
})
export class GenderService {
 private url = environment.baseUrl + '/genders';
  constructor(private http:HttpClient) { }

  get():Observable<Gender[]>{
    return this.http.get<Gender[]>(this.url);
  }
  
  getWithId():Observable<GenderTypes[]>{
    return this.http.get<GenderTypes[]>(this.url);
  }
}
