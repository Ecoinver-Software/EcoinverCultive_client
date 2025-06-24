// jwt-sync.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class JwtSyncService {

  constructor() {
    window.addEventListener('message', (event) => {
      if (event.data === 'REQUEST_JWT') {
        const jwt = localStorage.getItem('jwt');
        (event.source as any)?.postMessage({ jwt }, '*');
      }
      
      if (event.data?.jwt) {
        localStorage.setItem('jwt', event.data.jwt);
      }
    });
  }

  openApp(url:string): void {
    const app = window.open(url, '_blank');
    
    setTimeout(() => {
      const jwt = localStorage.getItem('jwt');
      app?.postMessage({ jwt }, '*');
    }, 1000);
  }

  requestJwt(): void {
    if (window.opener) {
      window.opener.postMessage('REQUEST_JWT', '*');
    }
  }
}