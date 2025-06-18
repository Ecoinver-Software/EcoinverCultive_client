import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ValidationTokenService {
  private apiHub_url = 'https://localhost:7028/api';

  constructor(private http: HttpClient) { }

  // Obtener token de App A desde localStorage
  getToken(): string | null {
    //alert('TOKEN: ' + localStorage.getItem('jwt'));
    return localStorage.getItem('jwt'); // Misma clave que usa App A
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Hacer requests a App B con el token de App A
  callAppB(endpoint: string) {
    const token = this.getToken();
    if (!token) throw new Error('No authenticated');

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.apiHub_url}${endpoint}`, { headers });
  }
}
