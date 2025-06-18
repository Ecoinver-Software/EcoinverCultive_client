// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode'; //para poder decodificar el token

// por ejemplo, si está en "src/app/environment/environment.ts"
import { environment } from '../../app/environment/environment';
import { LoginResponse } from '../types/LoginResponse';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}

  login(usuario: string, password: string): Observable<LoginResponse> {
    const url = `${environment.baseUrl}/auth/login`;
    return this.http.post<LoginResponse>(url, {
      username: usuario,
      password: password,
    });
  }

  //metodo para obtener el usuario actual:
  // auth.service.ts
  getCurrentUser(): { id: string; role: string } | null {
    const token = localStorage.getItem('jwt');
    if (!token) return null;
  
    try {
      const decoded = jwtDecode<any>(token);
      console.log('Token decodificado completo:', decoded); // Para debug
  
      // Extraer ID de la claim correcta (ajusta según tu token real)
      const userId = localStorage.getItem('userId')|| "fallo2";
      
      // Extraer rol de la claim específica
      const userRole = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
  
      return {
        id: userId,
        role: userRole.toLowerCase() // Normalizar a minúsculas
      };
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }
}
