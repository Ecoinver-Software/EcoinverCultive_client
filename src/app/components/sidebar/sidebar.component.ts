import { Component, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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

  constructor(public router: Router, private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    // Esperar a que Angular complete su ciclo de renderizado
    setTimeout(() => {
      this.initializeDropdowns();
    }, 100);

    // También inicializar después de cada navegación
    this.router.events.subscribe(() => {
      setTimeout(() => this.initializeDropdowns(), 100);
    });

    // Suscribirse a los eventos de navegación para cerrar el sidebar
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.closeSidebarOnNavigation();
      });
  }

  // Escuchar clics en el documento
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const sidebar = document.getElementById('logo-sidebar');
    const sidebarButton = document.querySelector('[data-drawer-toggle="logo-sidebar"]');
    const userDropdown = document.getElementById('dropdown-user');
    const userDropdownButton = document.querySelector('[data-dropdown-toggle="dropdown-user"]');
    
    // Verificar si el sidebar está abierto (visible en móvil)
    if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
      const target = event.target as Element;
      
      // Si el clic no fue en el sidebar ni en el botón del sidebar, cerrar el sidebar
      if (!sidebar.contains(target) && !sidebarButton?.contains(target)) {
        sidebar.classList.add('-translate-x-full');
      }
    }

    // Manejar cierre del dropdown de usuario
    if (userDropdown && !userDropdown.classList.contains('hidden')) {
      const target = event.target as Element;
      
      // Si el clic no fue en el dropdown ni en el botón del dropdown, cerrar el dropdown
      if (!userDropdown.contains(target) && !userDropdownButton?.contains(target)) {
        userDropdown.classList.add('hidden');
      }
    }
  }

  // Escuchar la tecla Escape para cerrar
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    const sidebar = document.getElementById('logo-sidebar');
    const userDropdown = document.getElementById('dropdown-user');
    
    // Cerrar sidebar si está abierto
    if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
      sidebar.classList.add('-translate-x-full');
    }
    
    // Cerrar dropdown de usuario si está abierto
    if (userDropdown && !userDropdown.classList.contains('hidden')) {
      userDropdown.classList.add('hidden');
    }
  }

  // Cerrar sidebar cuando se navega a una nueva ruta
  private closeSidebarOnNavigation(): void {
    const sidebar = document.getElementById('logo-sidebar');
    
    // Solo cerrar en dispositivos móviles (cuando el sidebar puede estar superpuesto)
    if (sidebar && window.innerWidth < 640) { // 640px es el breakpoint 'sm' de Tailwind
      sidebar.classList.add('-translate-x-full');
    }
  }

  private initializeDropdowns(): void {
    // Sidebar toggle
    const sidebarButton = document.querySelector('[data-drawer-toggle="logo-sidebar"]');
    const sidebar = document.getElementById('logo-sidebar');

    if (sidebarButton && sidebar) {
      // Limpiar listeners antiguos
      const newButton = sidebarButton.cloneNode(true);
      sidebarButton.parentNode?.replaceChild(newButton, sidebarButton);
      
      newButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Evitar que se propague y active el cierre inmediato
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
        e.stopPropagation(); // Evitar que se propague y active el cierre inmediato
        userDropdown.classList.toggle('hidden');
      });
    }
  }

  // Método para cerrar sidebar manualmente (útil para casos especiales)
  closeSidebar(): void {
    const sidebar = document.getElementById('logo-sidebar');
    if (sidebar) {
      sidebar.classList.add('-translate-x-full');
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