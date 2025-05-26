import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  // Variables para controlar el estado de cada dropdown
  administracionOpen = false;
  comercialOpen = false;
  campoOpen = false;

  constructor(public router: Router) {}

  ngAfterViewInit(): void {
    // Esperar a que Angular complete su ciclo de renderizado
    setTimeout(() => {
      this.initializeDropdowns();
    }, 100);

    // También inicializar después de cada navegación
    this.router.events.subscribe(() => {
      setTimeout(() => this.initializeDropdowns(), 100);
    });
  }

  private initializeDropdowns(): void {
    // Sidebar toggle
    const sidebarButton = document.querySelector('[data-drawer-toggle="logo-sidebar"]');
    const sidebar = document.getElementById('logo-sidebar');

    if (sidebarButton && sidebar) {
      sidebarButton.addEventListener('click', (e) => {
        e.preventDefault();
        sidebar.classList.toggle('-translate-x-full');
      });
    }

    // User dropdown toggle
    const userDropdownButton = document.querySelector('[data-dropdown-toggle="dropdown-user"]');
    const userDropdown = document.getElementById('dropdown-user');

    if (userDropdownButton && userDropdown && userDropdownButton.parentNode) {
      // Limpiar listeners antiguos si existen
      const newButton = userDropdownButton.cloneNode(true);
      userDropdownButton.parentNode.replaceChild(newButton, userDropdownButton);

      newButton.addEventListener('click', (e) => {
        e.preventDefault();
        userDropdown.classList.toggle('hidden');
      });
    }
  }

  toggleAdministracion(): void {
    this.administracionOpen = !this.administracionOpen;
  }

  toggleComercial(): void {
    this.comercialOpen = !this.comercialOpen;
  }

  toggleCampo(): void {
    this.campoOpen = !this.campoOpen;
  }

  isActive(routes: string[]): boolean {
    return routes.some(route => {
      // Verificar coincidencia exacta o que sea el inicio de la ruta seguido por un slash o el final de la URL
      const currentUrl = this.router.url;
      return currentUrl === route ||
             currentUrl.startsWith(route + '/') ||
             (route !== '/' && currentUrl === route);
    });
  }

  // Método para verificar si alguna ruta del menú Campo está activa
  isCampoMenuActive(): boolean {
    const campoRoutes = ['/cultivos', '/fincas', '/agricultores', '/variables-globales'];
    return this.isActive(campoRoutes);
  }
}