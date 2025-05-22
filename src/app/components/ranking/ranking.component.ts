import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Agricult } from '../../types/Agricult';
import { Cultive } from '../../types/Cultive';
import { Gender } from '../../types/Gender';
import { GenderService } from '../../services/Gender.service';
import { CultivoService } from '../../services/Cultivo.service';
import { RealProduction } from '../../types/RealProduction';
import { RealProductionService } from '../../services/RealProduction.service';

@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './ranking.component.html',
  styleUrl: './ranking.component.css'
})
export class RankingComponent implements OnInit {
  // Variables
  agricultores: Agricult[] = [];
  cultivos: Cultive[] = [];
  genero: Gender[] = [];
  generoCargado: boolean = false;
  cultivoCargado: boolean = false;
  sumaArea: number = 0;
  produccionTotal: number = 0;
  media: number = 0;

  // Variables para el filtrado y selección
  searchGeneroTerm: string = '';
  filteredGenderOptions: Gender[] = [];
  selectedGeneroId: number | null = null;
  selectedCultivosIds: number[] = [];
  selectedFamilia: string = 'todas';
  familias: string[] = [];
  producReal: RealProduction[] = [];
  opcion: string = '1';

  constructor(
    private genderService: GenderService,
    private cultivoService: CultivoService, private pReal: RealProductionService
  ) { }

  ngOnInit(): void {
    // Cargamos los géneros
    this.genderService.get().subscribe(
      (data) => {
        this.genero = data;
        this.genero.sort((a, b) => a.nombreGenero.localeCompare(b.nombreGenero));
        this.filteredGenderOptions = [...this.genero]; // Inicializamos lista filtrada
        this.generoCargado = true;

        // Extraemos las familias únicas para el filtro
        this.extractFamilias();

        this.checkDatos();
      },
      (error) => {
        console.log(error);
      }
    );

    // Cargamos los cultivos
    this.cultivoService.getAll().subscribe(
      (data) => {
        this.cultivos = data;
        this.cultivoCargado = true;
        this.checkDatos();
      },
      (error) => {
        console.log(error);
      }
    );
    //Nos treamos la producción real.
    this.pReal.get().subscribe(
      (data) => {
        this.producReal = data;

      },
      (error) => {
        console.log(error);
      }

    );
  }

  // Extraer las familias únicas de los géneros cargados
  extractFamilias() {
    const familiasSet = new Set<string>();
    this.genero.forEach(g => {
      if (g.nombreFamilia) {
        familiasSet.add(g.nombreFamilia);
      }
    });
    this.familias = Array.from(familiasSet).sort();
  }

  // Verificar si los datos están cargados
  checkDatos() {
    if (!this.cultivoCargado || !this.generoCargado) {
      return;
    } else {
      this.tabla();
    }
  }

  // Maneja el cambio de búsqueda de géneros
  onSearchGenero() {
    this.applyFilters();
  }

  // Maneja el cambio de familia seleccionada
  onFamilyChange() {
    this.applyFilters();
  }

  // Aplicar filtros de búsqueda y familia
  applyFilters() {
    let filtered = [...this.genero];

    // Filtrar por término de búsqueda
    if (this.searchGeneroTerm && this.searchGeneroTerm.trim() !== '') {
      const searchTerm = this.searchGeneroTerm.toLowerCase().trim();
      filtered = filtered.filter(g =>
        g.nombreGenero.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por familia seleccionada
    if (this.selectedFamilia !== 'todas') {
      filtered = filtered.filter(g => g.nombreFamilia === this.selectedFamilia);
    }

    this.filteredGenderOptions = filtered;
  }

  // Maneja la selección de un género
  selectGenero(generoId: number) {
    this.selectedGeneroId = generoId;
    this.selectedCultivosIds = [];
    // Si no está en la lista de seleccionados, añadirlo
    if (!this.selectedCultivosIds.includes(generoId)) {
      this.selectedCultivosIds.push(generoId);
    }

    // Actualizar la tabla con el género seleccionado
    this.tabla();
  }

  // Limpiar filtros
  limpiarFiltros() {
    this.searchGeneroTerm = '';
    this.selectedFamilia = 'todas';
    this.filteredGenderOptions = [...this.genero];
  }

  // Métodos para la interfaz de usuario
  toggleView(view: 'todos' | 'seleccionados') {
    // Implementar cambio de vista entre todos los géneros y solo los seleccionados
    if (view === 'seleccionados') {
      this.filteredGenderOptions = this.genero.filter(g =>
        this.selectedCultivosIds.includes(g.idGenero)
      );
    } else {
      // Volver a aplicar los filtros actuales
      this.applyFilters();
    }
  }

  // Muestra sólo los generos seleccionados
  // Esta función se llama cuando se hace clic en el botón "Seleccionados"
  mostrarSeleccionados() {
    this.toggleView('seleccionados');
  }

  // Muestra todos los géneros aplicando los filtros actuales
  // Esta función se llama cuando se hace clic en el botón "Todos"
  mostrarTodos() {
    this.toggleView('todos');
  }

  // Genera la tabla con los datos filtrados - mantenida para compatibilidad
  tabla() {
    // Limpiamos la lista de agricultores
    this.agricultores = [];
    let j = 1;
    let agri: Cultive = {
      id: 0,
      idCultivo: 0,
      nombreAgricultor: '',
      nombreFinca: '',
      nombreNave: '',
      idGenero: 0,
      nombreGenero: '',
      nombreVariedad: '',
      superficie: 0,
      idCultivePlanning: null,
      tecnico: '',
      provincia: ''
    };



    // Filtrar cultivos por el género seleccionado
    const cultivosFiltrados = this.cultivos.filter(
      c => c.idGenero === this.selectedGeneroId
    );
    let variab: boolean = false;
    let index: number = 0;
    for (let i = 0; i < this.producReal.length; i++) {
      for (let k = 0; k < this.agricultores.length; k++) {
        if (cultivosFiltrados.find(item => item.idCultivo == this.producReal[i].idCultivo)) {
          if (this.producReal[i].nombreAgricultor === this.agricultores[k].nombre) {
            variab = true;
            index = k;
          }
        }


      }
      if (cultivosFiltrados.find(item => item.idCultivo == this.producReal[i].idCultivo)) {
        if (variab) {
          agri = cultivosFiltrados.find(item => item.idCultivo == this.producReal[i].idCultivo)!;
          this.agricultores[index] = {
            pos: index + 1,
            nombre: this.producReal[i].nombreAgricultor,
            provincia: agri.provincia,
            nombreCultivo: agri.nombreGenero,
            superficie: agri.superficie + this.agricultores[index].superficie,
            producc: this.producReal[i].kilosNetos + (this.agricultores[index].producc ?? 0),
            kgm2: this.producReal[i].kilosM2
          }

          variab = false;
        }
        else {
          agri = cultivosFiltrados.find(item => item.idCultivo == this.producReal[i].idCultivo)!;
          this.agricultores.push({
            pos: j,
            nombre: this.producReal[i].nombreAgricultor,
            provincia: agri.provincia,
            nombreCultivo: agri.nombreGenero,
            superficie: agri.superficie,
            producc: this.producReal[i].kilosNetos,
            kgm2: this.producReal[i].kilosM2
          });

          j++;
        }

      }
    }
    let longitudCorrecta: number = 0;
    this.sumaArea = this.agricultores.reduce((a, b) => a + b.superficie, 0);
    this.produccionTotal = this.agricultores.reduce((a, b) => a + (b.producc ?? 0), 0);
    for (let i = 0; i < this.agricultores.length; i++) {
      if (this.agricultores[i].kgm2) {
        longitudCorrecta++;
      }
    }
    this.agricultores.sort((a, b) => b.kgm2 - a.kgm2);
    for(let i=0;i<this.agricultores.length;i++){
      this.agricultores[i].pos=i+1;
    }
    this.media = this.agricultores.reduce((a, b) => a + (b.kgm2 ?? 0), 0) / longitudCorrecta || 0;
    const factor = Math.pow(10, 2);
    this.media = Math.trunc(this.media * factor) / factor;


  }

  cambiarFiltro() {
    switch (this.opcion) {
      case '1':
        this.agricultores.sort((a, b) => b.kgm2 - a.kgm2);
        for(let i=0;i<this.agricultores.length;i++){
          this.agricultores[i].pos=i+1;
        }
        break;
      case '2':
        this.agricultores.sort((a, b) => (b.producc ?? 0) - (a.producc ?? 0));
        for(let i=0;i<this.agricultores.length;i++){
          this.agricultores[i].pos=i+1;
        }
        break;
      case '3':
        this.agricultores.sort((a, b) => b.superficie - a.superficie);
        for(let i=0;i<this.agricultores.length;i++){
          this.agricultores[i].pos=i+1;
        }
    }

  }

}