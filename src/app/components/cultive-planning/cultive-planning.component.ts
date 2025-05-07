import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CultivoService } from '../../services/Cultivo.service';
import { Cultive } from '../../types/Cultive';
import { GenderTypes } from '../../types/GenderTypes';
import {
  CultivePlanningService,
  CultivePlanning,
} from '../../services/CultivePlanning.service';
import { CultivePlanningDetailsService } from '../../services/CultivePlanningDetails.service';
import { CultivePlanningDetails } from '../../types/CultivePlanningDetails';
import { CultiveProductionService } from '../../services/CultiveProduction.service';
import {
  CultiveProductionDto,
  CreateCultiveProductionDto,
  UpdateCultiveProductionDto,
} from '../../types/CultiveProductionTypes';
import {
  CreateCultivePlanningDto,
  UpdateCultivePlanningDto,
} from '../../types/CultivePlanningTypes';
import { GenderService } from '../../services/Gender.service';
import { forkJoin } from 'rxjs';

// Interface para quincenas
interface Quincena {
  id: string;
  nombre: string;
  fechaInicio: Date;
  fechaFin: Date;
}

// Interface para opciones del selector de quincenas
interface QuincenaOption {
  id: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
}

interface TramoCard {
  value: number | null;
  startDate: string | null;
  endDate: string | null;
}

interface Planificacion {
  id: string;
  nombre: string;
  tramos: TramoCard[];
  cultivos: string[];
  idGenero: number | null;
  fechaInicio?: Date;
  fechaFin?: Date;
}

@Component({
  selector: 'app-cultive-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './cultive-planning.component.html',
  providers: [
    CultivoService,
    CultivePlanningService,
    CultivePlanningDetailsService,
  ],
})
export class CultivePlanningComponent implements OnInit {
  // Quincenas disponibles (24 - 2 por mes)
  quincenas: Quincena[] = [];
  selectedQuincena: string = ''; // ID de la quincena seleccionada
  quincenaOptions: QuincenaOption[] = []; // Para el selector

  // Planificaciones (ahora representan quincenas)
  planificaciones: Planificacion[] = [];
  selectedPlanificacion: string = '';
  planificacionesOptions: { id: string; nombre: string }[] = [];

  // Detección de modo oscuro
  isDarkMode: boolean = false;
 // Limita el máximo de tramos
maxTramos = 12;
numTramosInput: number = 12;
numTramos: number = this.numTramosInput;

  

  cards: TramoCard[] = [];

  // Cultivos disponibles y seleccionados
  cultivos: string[] = [];
  selectedCultivos: string[] = [];
  tempSelectedCultivos: string[] = [];
  selectedCultivosIds: number[] = [];
  tempSelectedCultivosIds: number[] = [];
  cultivo: Cultive[] = [];

  // Modal control
  showCultivoModal: boolean = false;

  // Nombre de la quincena
  nuevaQuincenaNombre: string = '';

  // Estado de carga
  isLoadingCultivos: boolean = false;
  isLoadingQuincenas: boolean = false;
  loadError: string | null = null;

  // Mensaje de éxito
  successMessage: string | null = null;
  successTimeout: any = null;

  // Propiedades adicionales
  selectedGenre: string = '';
  generos: string[] = [];
  cultivosPorGenero: { [genero: string]: Cultive[] } = {};
  filteredCultivos: Cultive[] = [];
  details: CultivePlanningDetails[] = [];
  genderList: GenderTypes[] = [];
  //: (GenderTypes & { disabled: boolean })[] = [];
  idGnero: number | undefined = 0;
  selectedGeneroId: number | undefined = undefined;
  produccionesList: CultiveProductionDto[] = [];
  private produccionesMap = new Map<string, CultiveProductionDto>();
  private selectedCultivosIdsBefore: number[] = [];


  searchGeneroTerm: string = '';
  genderOptions: (GenderTypes & { disabled: boolean; nombreFamilia: string })[] = [];

  filteredGenderOptions: typeof this.genderOptions = [];

  familias: string[] = [];
  selectedFamilia: string = 'todas';

  constructor(
    private cultivoService: CultivoService,
    private cultivoPlanningService: CultivePlanningService,
    private cultivePlanningDetailsService: CultivePlanningDetailsService,
    private productionService: CultiveProductionService,
    private genderService: GenderService
  ) {}

  ngOnInit(): void {
    // Comprobar tema oscuro
    this.checkDarkMode();

    // Generar las 24 quincenas (2 por mes)
    this.generarQuincenas();

    // Cargar planificaciones desde la API
    this.cargarPlanificaciones();

    // Cargar los cultivos de la API
    this.cargarCultivos();

    // Cargar géneros
    this.genderService.getWithId().subscribe(
      (data) => {
        this.genderList = data;

        this.familias = Array.from(
          new Set(this.genderList.map(g => g.nombreFamilia))
        ).sort();
        
        this.updateGenderOptions();
        console.log('primer género:', this.genderList[0]);
        console.log('Generos get:', this.genderList);
      },
      (error) => {
        console.error('Error cargando géneros', error);
      }
    );


    this.filteredGenderOptions = [...this.genderOptions];
  }




  onNumTramosChange(): void {
    // Convertir a entero
    this.numTramosInput = Math.max(1, Math.floor(this.numTramosInput));
    this.numTramos = this.numTramosInput;
  
    // Si hay quincena, reinicializa tramos
    if (this.selectedQuincena) {
      const quincena = this.quincenas.find(q => q.id === this.selectedQuincena);
      if (quincena) {
        this.initializeTramosPorQuincena(quincena);
      }
    }
  }

  incrementTramos(): void {
    if (this.numTramosInput < this.maxTramos) {
      this.numTramosInput++;
      this.onNumTramosChange();
    }
  }
  
  decrementTramos(): void {
    if (this.numTramosInput > 1) {
      this.numTramosInput--;
      this.onNumTramosChange();
    }
  }





  /**
   * Función para asegurarse de que los cultivos tengan fechas de siembra
   * Si no tienen, les asigna fechas aleatorias dentro del año actual
   */
  asegurarFechasSiembra(): void {
    console.log('Verificando fechas de siembra de cultivos...');
    const year = new Date().getFullYear();
    let contadorActualizados = 0;
    
    // Verificar y asignar fechas de siembra a los cultivos que no las tengan
    this.cultivo.forEach(cultivo => {
      if (!cultivo.fechaSiembra) {
        // Generar una fecha aleatoria dentro del año actual
        const month = Math.floor(Math.random() * 12);
        const day = Math.floor(Math.random() * 28) + 1; // Evitar problemas con meses de 30/31 días
        
        cultivo.fechaSiembra = new Date(year, month, day);
        contadorActualizados++;
      }
    });
    
    console.log(`Se asignaron fechas de siembra a ${contadorActualizados} cultivos`);
  }

  
  /**
   * Genera las 24 quincenas del año actual (2 por mes)
   */
  generarQuincenas(): void {
    const year = new Date().getFullYear();
    this.quincenas = [];
    this.quincenaOptions = [];

    // Agregar opción para crear nueva
    this.quincenaOptions.push({
      id: '',
      nombre: 'Selecciona una quincena',
      fechaInicio: '',
      fechaFin: ''
    });

    // Generar 24 quincenas (2 por mes)
    for (let month = 0; month < 12; month++) {
      // Primera quincena (días 1-15)
      const fechaInicio1 = new Date(year, month, 1);
      const fechaFin1 = new Date(year, month, 15);
      
      const quincena1: Quincena = {
        id: `Q${month * 2 + 1}-${year}`,
        nombre: `${this.getNombreMes(month)} (1-15) ${year}`,
        fechaInicio: fechaInicio1,
        fechaFin: fechaFin1
      };
      
      this.quincenas.push(quincena1);
      this.quincenaOptions.push({
        id: quincena1.id,
        nombre: quincena1.nombre,
        fechaInicio: this.formatDate(fechaInicio1),
        fechaFin: this.formatDate(fechaFin1)
      });

      // Segunda quincena (día 16 hasta fin de mes)
      const fechaInicio2 = new Date(year, month, 16);
      // Último día del mes
      const fechaFin2 = new Date(year, month + 1, 0);
      
      const quincena2: Quincena = {
        id: `Q${month * 2 + 2}-${year}`,
        nombre: `${this.getNombreMes(month)} (16-${fechaFin2.getDate()}) ${year}`,
        fechaInicio: fechaInicio2,
        fechaFin: fechaFin2
      };
      
      this.quincenas.push(quincena2);
      this.quincenaOptions.push({
        id: quincena2.id,
        nombre: quincena2.nombre,
        fechaInicio: this.formatDate(fechaInicio2),
        fechaFin: this.formatDate(fechaFin2)
      });
    }

    console.log('Quincenas generadas:', this.quincenas);
  }

  /**
   * Obtiene el nombre del mes en español
   * @param month Número del mes (0-11)
   * @returns Nombre del mes en español
   */
  getNombreMes(month: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return meses[month];
  }

  /**
   * Maneja el cambio de quincena seleccionada
   * Inicializa los tramos con las fechas correspondientes a la quincena
   * y busca cultivos que comiencen dentro de la quincena
   */
  onQuincenaChange(): void {
    console.log('Quincena seleccionada:', this.selectedQuincena);

    // Si no hay selección, limpiar todo
    if (!this.selectedQuincena) {
      this.cards = [];
      this.selectedCultivos = [];
      this.selectedCultivosIds = [];
      return;
    }

    // Buscar la quincena seleccionada
    const quincena = this.quincenas.find(q => q.id === this.selectedQuincena);
    if (!quincena) {
      console.error('No se encontró la quincena seleccionada');
      return;
    }

    console.log('Quincena encontrada:', quincena);

    // Inicializar los tramos para la quincena seleccionada
    this.initializeTramosPorQuincena(quincena);
    
    // Buscar si existen datos guardados para esta quincena
    this.buscarDatosQuincena();
    
    // Buscar cultivos que comiencen dentro de esta quincena
    this.buscarCultivosEnQuincena(quincena);
  }

  /**
 * Busca cultivos cuya fecha de siembra (solo día y mes) cae dentro del rango de la quincena
 * @param quincena Quincena seleccionada
 */
buscarCultivosEnQuincena(quincena: Quincena): void {
  console.log('===== INICIO BÚSQUEDA DE CULTIVOS IGNORANDO AÑO =====');
  const yearQ = quincena.fechaInicio.getFullYear();
  const inicioMs = new Date(yearQ, quincena.fechaInicio.getMonth(), quincena.fechaInicio.getDate()).getTime();
  const finMs    = new Date(yearQ, quincena.fechaFin.getMonth(),    quincena.fechaFin.getDate()).getTime();

  // Filtrar cultivos por día y mes, ignorando año
  const cultivosEnQuincena = this.cultivo.filter(c => {
    if (!c.fechaSiembra) return false;
    const fs = new Date(c.fechaSiembra);
    // Normaliza la fecha al año de la quincena
    const fsNormMs = new Date(yearQ, fs.getMonth(), fs.getDate()).getTime();
    const enRango = fsNormMs >= inicioMs && fsNormMs <= finMs;
    if (enRango) {
      console.log(`✅ ${c.nombreGenero} - ${c.nombreVariedad} (siembra ${fs.toLocaleDateString()}) ➝ entra en quincena`);
    }
    return enRango;
  });

  console.log(`Se encontraron ${cultivosEnQuincena.length} cultivos en la quincena (día/mes)`);

  // Luego aplicas tu filtro por género si lo tienes activo…
  let cultivosFiltrados = cultivosEnQuincena;
  if (this.selectedGeneroId) {
    const nombreGen = this.genderList.find(g => g.idGenero === this.selectedGeneroId)?.nombreGenero;
    cultivosFiltrados = cultivosEnQuincena.filter(c => c.nombreGenero === nombreGen);
    console.log(`Después de filtro por género (${nombreGen}): ${cultivosFiltrados.length}`);
  }

  // Finalmente asignas a la UI
  this.selectedCultivosIds = cultivosFiltrados.map(c => c.id);
  this.selectedCultivos   = cultivosFiltrados.map(c =>
    `${c.nombreAgricultor} - ${c.nombreGenero} - ${c.nombreVariedad}`
  );
  console.log('===== FIN BÚSQUEDA =====');
}


  /**
   * Inicializa los tramos para una quincena específica con las fechas correspondientes
   * @param quincena Quincena para la que se inicializan los tramos
   */
  initializeTramosPorQuincena(quincena: Quincena): void {
    const fechaInicio = new Date(quincena.fechaInicio);
    const fechaFin = new Date(quincena.fechaFin);
    
    // Calcular duración en días
    const duracionQuincenaMs = fechaFin.getTime() - fechaInicio.getTime();
    const duracionQuincenaDias = Math.ceil(duracionQuincenaMs / (1000 * 60 * 60 * 24)) + 1;
    
    // Duración de cada tramo en días
    const duracionTramoDias = Math.floor(duracionQuincenaDias / this.numTramos);
    
    // Inicializar los tramos
    this.cards = [];
    
    for (let i = 0; i < this.numTramos; i++) {
      const tramoFechaInicio = new Date(fechaInicio);
      tramoFechaInicio.setDate(fechaInicio.getDate() + i * duracionTramoDias);
      
      const tramoFechaFin = new Date(tramoFechaInicio);
      
      // El último tramo termina en la fecha de fin de la quincena
      if (i === this.numTramos - 1) {
        tramoFechaFin.setTime(fechaFin.getTime());
      } else {
        tramoFechaFin.setDate(tramoFechaInicio.getDate() + duracionTramoDias - 1);
      }
      
      // Formatear fechas como YYYY-MM-DD para inputs de tipo date
      const startDateFormatted = this.formatDateForInput(tramoFechaInicio);
      const endDateFormatted = this.formatDateForInput(tramoFechaFin);
      
      this.cards.push({
        value: 0.1, // Valor por defecto para los kilos
        startDate: startDateFormatted,
        endDate: endDateFormatted
      });
    }
    
    console.log('Tramos inicializados para quincena:', this.cards);
  }
  
  /**
   * Formatea una fecha para usarla en inputs de tipo date (YYYY-MM-DD)
   * @param date Fecha a formatear
   * @returns Fecha formateada como YYYY-MM-DD
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Maneja los cambios en las fechas de un tramo
   * @param index Índice del tramo que cambió
   */
  onTramoFechaChange(index: number): void {
    const card = this.cards[index];
    
    console.log(`Cambio en fechas del tramo ${index + 1}:`, {
      startDate: card.startDate,
      endDate: card.endDate
    });
    
    // Validar que la fecha fin sea posterior a la fecha inicio
    if (card.startDate && card.endDate) {
      const fechaInicio = new Date(card.startDate);
      const fechaFin = new Date(card.endDate);
      
      if (fechaInicio > fechaFin) {
        // Si la fecha inicio es posterior a la fecha fin, ajustar la fecha fin
        alert('La fecha de fin debe ser posterior a la fecha de inicio. Se ajustará automáticamente.');
        card.endDate = card.startDate;
      }
    }
    
    // Si hay un detalle existente para este tramo, actualizar sus fechas
    if (this.details && this.details.length > 0) {
      const tramoNum = index + 1;
      const existingDetail = this.details.find(d => d.tramo === tramoNum);
      
      if (existingDetail) {
        // Actualizar fechas en el detalle
        if (card.startDate) {
          existingDetail.fechaInicio = new Date(card.startDate);
          
        }
        
        if (card.endDate) {
          existingDetail.fechaFin = new Date(card.endDate);
        }
      }
    }
    
    // Verificar si hay cultivos que caen dentro del nuevo rango de fechas
    this.actualizarCultivosAfectados();
  }
  
  /**
   * Actualiza los cultivos afectados cuando cambian las fechas de los tramos
   */
  actualizarCultivosAfectados(): void {
    // Si no hay quincena seleccionada, no hacer nada
    if (!this.selectedQuincena) {
      return;
    }
    
    // Buscar la quincena seleccionada
    const quincena = this.quincenas.find(q => q.id === this.selectedQuincena);
    if (!quincena) {
      console.error('No se encontró la quincena seleccionada');
      return;
    }
    
    // Obtener el nuevo rango de fechas de los tramos
    const fechaInicioTramos = this.cards.reduce((min, card) => {
      if (!card.startDate) return min;
      const fecha = new Date(card.startDate);
      return fecha < min ? fecha : min;
    }, new Date('9999-12-31'));
    
    const fechaFinTramos = this.cards.reduce((max, card) => {
      if (!card.endDate) return max;
      const fecha = new Date(card.endDate);
      return fecha > max ? fecha : max;
    }, new Date('0000-01-01'));
    
    console.log('Nuevo rango de fechas de tramos:', {
      inicio: this.formatDate(fechaInicioTramos),
      fin: this.formatDate(fechaFinTramos)
    });
    
    // Actualizar las fechas de la quincena
    quincena.fechaInicio = fechaInicioTramos;
    quincena.fechaFin = fechaFinTramos;
    
    // Buscar cultivos que caen dentro del nuevo rango
    this.buscarCultivosEnQuincena(quincena);
  }

  /**
   * Busca si existen datos guardados para la quincena seleccionada
   * y los carga si existen
   */
  /**
 * Busca si existen datos guardados para la quincena seleccionada
 * y los carga si existen. Además ajusta el número de tramos
 * al count real de detalles guardados.
 */
buscarDatosQuincena(): void {
  // El ID de la planificación coincide con el ID de la quincena
  const planificacionId = this.selectedQuincena;

  // Cargamos todas las planificaciones para encontrar la que coincide
  this.cultivoPlanningService.getAllCultivePlannings().subscribe(
    planificaciones => {
      const quincena = this.quincenas.find(q => q.id === planificacionId);
      if (!quincena) {
        console.error('No se encontró la quincena seleccionada');
        return;
      }

      // Encontrar planificación por nombre (incluye el género)
      const nombrePlan = `${quincena.nombre} ${this.selectedGenre}`;
      const planExist = planificaciones.find(p => p.nombre === nombrePlan);

      if (planExist && planExist.id) {
        // Si existe, cargamos sus detalles
        this.cultivePlanningDetailsService
          .getDetailsByPlanningId(planExist.id.toString())
          .subscribe(
            details => {
              if (!details || details.length === 0) {
                console.log('No hay detalles guardados para esta planificación');
                return;
              }

              // 1️⃣ Asignamos detalles al componente
              this.details = details;

              // 2️⃣ Ajustamos el número de tramos al tamaño real de los detalles
              this.numTramosInput = details.length;
              this.numTramos      = details.length;

              // 3️⃣ Re-generamos los cards con el nuevo número de tramos
              this.initializeTramosPorQuincena(quincena);

              // 4️⃣ Asignamos los valores de kilos de cada detail a su card
              details.forEach(detail => {
                const idx = detail.tramo - 1;
                if (this.cards[idx]) {
                  this.cards[idx].value = detail.kilos;
                }
              });

              // 5️⃣ Mensaje de éxito y carga de cultivos asociados
              this.mostrarMensajeExito('Datos de la quincena cargados correctamente');
              this.cargarCultivosAsociados(planExist.id);
            },
            error => {
              console.error('Error al cargar los detalles de la planificación:', error);
            }
          );
      } else {
        console.log(`No existe planificación para la quincena ${quincena.nombre}`);
      }
    },
    error => {
      console.error('Error al buscar planificaciones:', error);
    }
  );
}

  
  /**
   * Carga los cultivos asociados a una planificación
   * @param planificacionId ID de la planificación
   */
  cargarCultivosAsociados(planificacionId: number | string): void {
    // Convertir a número si es string
    const planificacionIdNumber = typeof planificacionId === 'string' 
      ? parseInt(planificacionId, 10) 
      : planificacionId;
      
    // Reiniciar selecciones
    this.selectedCultivosIds = [];
    this.selectedCultivos = [];
    
    // Cargar todos los cultivos
    this.cultivoService.getAll().subscribe(
      (cultivos) => {
        // Filtrar cultivos asociados a esta planificación
        const cultivosAsociados = cultivos.filter(c => c.idCultivePlanning === planificacionIdNumber);
        
        // Actualizar selecciones
        this.selectedCultivosIds = cultivosAsociados.map(c => c.id);
        this.selectedCultivos = cultivosAsociados.map(c => 
          `${c.nombreAgricultor} - ${c.nombreGenero} - ${c.nombreVariedad}`
        );
        
        console.log(`Cargados ${this.selectedCultivosIds.length} cultivos asociados a la planificación ${planificacionId}`);
      },
      (error) => {
        console.error('Error al cargar cultivos asociados:', error);
      }
    );
  }

  // Método para comprobar si está activo el tema oscuro
  checkDarkMode(): void {
    this.isDarkMode =
      document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Observer para detectar cambios en el tema
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          this.isDarkMode = document.documentElement.classList.contains('dark');
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
  }

  // Método cargarCultivos modificado para trabajar directamente con datos de la API
  cargarCultivos(): void {
    this.isLoadingCultivos = true;
    this.loadError = null;

    this.cultivoService.getAll().subscribe(
      (data: any) => {
        console.log('Respuesta del servicio de cultivos:', data);

        // Verificar si la respuesta existe
        if (data) {
          // Asegurarnos de que siempre trabajamos con un array
          if (!Array.isArray(data)) {
            console.warn(
              'La API no devolvió un array. Intentando convertir...'
            );

            // Intentar convertir a array si es un objeto
            if (typeof data === 'object') {
              this.cultivo = Object.values(data);
            } else {
              this.cultivo = [];
              this.loadError = 'Formato de datos inesperado desde la API.';
            }
          } else {
            // Guardar los datos directamente si ya es un array
            this.cultivo = data;
          }

          console.log('Datos de cultivos procesados:', this.cultivo);

          // Si tenemos cultivos, extraer géneros
          if (this.cultivo && this.cultivo.length > 0) {
            // Asegurarnos de que los cultivos tengan fechas de siembra
            this.asegurarFechasSiembra();
            
            this.extractGenresAndOrganizeCultivos();
            this.prepareDisplayNames(); // Preparar displayNames para NgSelect
          } else {
            console.warn('No se recibieron cultivos de la API');
            this.loadError = 'La API no devolvió cultivos.';
          }
        } else {
          console.warn('La API devolvió una respuesta vacía o nula');
          this.loadError = 'La API no devolvió datos de cultivos.';
          this.cultivo = [];
        }

        this.isLoadingCultivos = false;
      },
      (error: Error) => {
        console.error('Error al obtener cultivos desde la API:', error);
        this.loadError =
          'Error al cargar cultivos desde el servidor: ' + error.message;
        this.cultivo = [];
        this.isLoadingCultivos = false;
      }
    );
  }

  // Método mejorado para extraer géneros y organizar cultivos
  extractGenresAndOrganizeCultivos(): void {
    console.log('Analizando estructura de cultivos recibidos:', this.cultivo);

    // Crear un conjunto para almacenar géneros únicos
    const genresSet = new Set<string>();
    this.cultivosPorGenero = {};

    // Verificar que tengamos un array de cultivos para procesar
    if (!Array.isArray(this.cultivo) || this.cultivo.length === 0) {
      console.warn('No hay cultivos para procesar o no es un array');
      this.generos = [];
      this.filteredCultivos = [];
      this.loadError = 'No hay datos de cultivos para procesar.';
      return;
    }

    // Usar nombreGenero de la interfaz Cultive como fuente para la agrupación
    this.cultivo.forEach((item) => {
      // Determinar el género a partir del nombreGenero
      const genero = item.nombreGenero || 'Otros Cultivos';

      // Añadir el género al conjunto
      genresSet.add(genero);

      // Inicializar el array para este género si no existe
      if (!this.cultivosPorGenero[genero]) {
        this.cultivosPorGenero[genero] = [];
      }

      // Añadir el cultivo a su categoría correspondiente
      this.cultivosPorGenero[genero].push(item);
    });

    // Convertir el conjunto a un array ordenado y asignarlo a géneros
    this.generos = Array.from(genresSet).sort();
    console.log(this.generos);
    
    // Inicializar cultivos filtrados con todos los cultivos
    this.filteredCultivos = [...this.cultivo];

    console.log('Géneros detectados:', this.generos);
    console.log('Cultivos organizados por género:', this.cultivosPorGenero);

    // Si no hay géneros, mostrar un mensaje
    if (this.generos.length === 0) {
      console.warn('No se pudieron extraer géneros de los cultivos');
      this.loadError = 'No se pudieron categorizar los cultivos.';
    }

    // Extraer nombres de cultivos para el selector
    this.extractCultivoNames();
  }

  // Método para extraer nombres de cultivos en el formato solicitado
  extractCultivoNames(): void {
    const cultivoNames: string[] = [];

    // Recorrer los cultivos y extraer nombres en el formato solicitado
    if (Array.isArray(this.cultivo)) {
      this.cultivo.forEach((cultivo) => {
        // Crear nombre en formato: nombreAgricultor - nombreGenero - nombreVariedad
        let displayName = '';

        // Agricultor
        displayName += cultivo.nombreAgricultor || 'Agricultor Desconocido';
        displayName += ' - ';

        // Género
        displayName += cultivo.nombreGenero || 'Género Desconocido';
        displayName += ' - ';

        // Variedad
        displayName += cultivo.nombreVariedad || 'Variedad Desconocida';

        cultivoNames.push(displayName);
      });
    }

    // Asignar a la propiedad cultivos
    this.cultivos = [...new Set(cultivoNames)].sort(); // Eliminar duplicados y ordenar
    console.log('Nombres de cultivos formateados:', this.cultivos);
  }

  // Añadir propiedad displayName a los cultivos para NgSelect
  prepareDisplayNames(): void {
    this.filteredCultivos.forEach((cultivo) => {
      (
        cultivo as any
      ).displayName = `${cultivo.nombreGenero} - ${cultivo.nombreVariedad} (${cultivo.nombreAgricultor})`;
    });
  }

  // Método para manejar el cambio de género seleccionado
  onGenreChange(): void {
    // 1) Mostrar el ID seleccionado
    console.log('ID de género seleccionado:', this.selectedGeneroId);

    // 2) Obtener el objeto completo a partir del ID
    const generoObj = this.genderList.find(
      (g) => g.idGenero === this.selectedGeneroId
    );
    this.idGnero = generoObj?.id;

    // 3) Actualizar el texto del género para uso en el filtro y la UI
    this.selectedGenre = generoObj?.nombreGenero ?? '';
    console.log('Nombre de género seleccionado:', this.selectedGenre);

    // 4) Filtrar cultivos según el género (por nombreGenero)
    if (this.selectedGenre && this.cultivosPorGenero[this.selectedGenre]) {
      this.filteredCultivos = this.cultivosPorGenero[this.selectedGenre];
      console.log(
        `Filtrados ${this.filteredCultivos.length} cultivos para el género ${this.selectedGenre}`
      );
    } else {
      // Si no hay género o no existe en el mapa, mostramos todos
      this.filteredCultivos = [...this.cultivo];
      console.log(
        `Mostrando todos los cultivos (${this.filteredCultivos.length})`
      );
    }

    // 5) Recalcular los displayName para el ng-select de cultivos
    this.prepareDisplayNames();

    // 6) Limpiar la selección temporal del modal
    this.tempSelectedCultivos = [];
  }

  // Método para cargar planificaciones desde la API
  cargarPlanificaciones(): void {
    this.isLoadingQuincenas = true;

    this.cultivoPlanningService.getAllCultivePlannings().subscribe(
      (data: CultivePlanning[]) => {
        console.log('Planificaciones cargadas desde API:', data);

        // Convertir las planificaciones de la API al formato local
        this.planificaciones = this.convertirPlanificacionesDeAPI(data);

        // Preparar opciones para el selector NgSelect
        this.updateGenderOptions();

        this.isLoadingQuincenas = false;
      },
      (error: Error) => {
        console.error('Error al cargar planificaciones:', error);
        // En caso de error, cargar planificaciones de ejemplo
        this.isLoadingQuincenas = false;
      }
    );
  }

  // Convertir planificaciones del formato de API al formato local
  convertirPlanificacionesDeAPI(
    planificacionesAPI: CultivePlanning[]
  ): Planificacion[] {
    return planificacionesAPI.map((planAPI) => {
      // Calcular las fechas de inicio y fin de la planificación
      const fechaInicio = planAPI.fechaInicio
        ? new Date(planAPI.fechaInicio)
        : new Date();
      const fechaFin = planAPI.fechaFin
        ? new Date(planAPI.fechaFin)
        : new Date();

      // Calcular la duración total en días
      const duracionTotal = Math.ceil(
        (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calcular la duración de cada tramo en días
      const duracionTramo = Math.ceil(duracionTotal / this.numTramos);

      // Crear los tramos
      const tramos: TramoCard[] = [];
      for (let i = 0; i < this.numTramos; i++) {
        const tramoInicio = new Date(fechaInicio);
        tramoInicio.setDate(fechaInicio.getDate() + i * duracionTramo);

        const tramoFin = new Date(tramoInicio);
        tramoFin.setDate(tramoInicio.getDate() + duracionTramo - 1);

        // Asegurar que el último tramo no supere la fecha fin
        if (tramoFin > fechaFin) {
          tramoFin.setTime(fechaFin.getTime());
        }

        tramos.push({
          value: 100, // Valor por defecto
          startDate: this.formatDate(tramoInicio),
          endDate: this.formatDate(tramoFin),
        });
      }

      return {
        id: planAPI.id || '',
        nombre: planAPI.nombre,
        tramos: tramos,
        cultivos: [], // Inicialmente vacío
        idGenero: planAPI.idGenero ?? null,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin
      };
    });
  }

  // Formatea una fecha como YYYY-MM-DD
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Formatea una fecha en formato ISO (YYYY-MM-DD) a formato de visualización (DD/MM/YYYY)
   * @param dateString Fecha en formato ISO
   * @returns Fecha formateada para visualización
   */
  formatDisplayDate(dateString: string | null): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const dia = date.getDate().toString().padStart(2, '0');
      const mes = (date.getMonth() + 1).toString().padStart(2, '0');
      const anio = date.getFullYear();
      
      return `${dia}/${mes}/${anio}`;
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return '';
    }
  }

  /**
   * Obtiene la fecha de inicio de la quincena seleccionada formateada
   * para mostrarla en el input
   */
  getFechaInicioDisplay(): string {
    if (!this.selectedQuincena || this.selectedQuincena === 'nueva') {
      return '';
    }
    
    const quincena = this.quincenas.find(q => q.id === this.selectedQuincena);
    if (!quincena || !quincena.fechaInicio) {
      return '';
    }
    
    // Formatear la fecha: DD/MM/YYYY
    return this.formatDisplayDate(this.formatDate(quincena.fechaInicio));
  }

  /**
   * Obtiene la fecha de fin de la quincena seleccionada formateada
   * para mostrarla en el input
   */
  getFechaFinDisplay(): string {
    if (!this.selectedQuincena || this.selectedQuincena === 'nueva') {
      return '';
    }
    
    const quincena = this.quincenas.find(q => q.id === this.selectedQuincena);
    if (!quincena || !quincena.fechaFin) {
      return '';
    }
    
    // Formatear la fecha: DD/MM/YYYY
    return this.formatDisplayDate(this.formatDate(quincena.fechaFin));
  }

  /**
   * Obtiene el nombre de la quincena seleccionada
   * @returns Nombre de la quincena seleccionada
   */
  getSelectedQuincenaName(): string {
    if (!this.selectedQuincena || this.selectedQuincena === 'nueva') {
      return '';
    }
    
    const quincena = this.quincenas.find(q => q.id === this.selectedQuincena);
    return quincena ? quincena.nombre : '';
  }

  private loadProductionsForDetails(details: CultivePlanningDetails[]) {
    this.productionService.getAllCultiveProductions().subscribe((allProds) => {
      // Filtra solo los de estos details
      const detailIds = new Set(details.map((d) => d.id));
      allProds
        .filter((p) => detailIds.has(p.cultivePlanningDetailsId))
        .forEach((p) => {
          const key = `${p.cultivePlanningDetailsId}_${p.cultiveId}`;
          this.produccionesMap.set(key, p);
        });
    });
  }




  // 3. Cada vez que cambie el texto llamas a esto:
  onSearchGenero(): void {
    this.filterGeneros();
  }

  onFamilyChange(): void {
    this.filterGeneros();
  }

  /**
   * Actualiza las opciones de géneros
   */
  private updateGenderOptions(): void {
    this.genderOptions = this.genderList.map(g => ({
      ...g,
      disabled: false,
      nombreFamilia: g.nombreFamilia
    }));
    // Aplica el filtro inicial (sin texto ni familia)
    this.filterGeneros();
  }

  
  /**
   * Aplica ambos criterios (texto y familia) para poblar filteredGenderOptions.
   */
  private filterGeneros(): void {
    const term = this.searchGeneroTerm.trim().toLowerCase();
    this.filteredGenderOptions = this.genderOptions.filter(g => {
      // 1) filtro por familia
      if (this.selectedFamilia !== 'todas' && g.nombreFamilia !== this.selectedFamilia) {
        return false;
      }
      // 2) filtro por texto en el nombre del género
      if (term && !g.nombreGenero.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }

  // Método para abrir el modal con los cultivos filtrados
  openCultivoModal(): void {
    console.log('Abriendo modal de selección de cultivos');
    
    // Almacenar los IDs seleccionados actuales para comparar después
    this.selectedCultivosIdsBefore = [...this.selectedCultivosIds];
    
    // Inicializar arreglos temporales con las selecciones actuales
    this.tempSelectedCultivosIds = [...this.selectedCultivosIds];
    this.tempSelectedCultivos = [];
    
    // Si hay un género elegido, filtrar por él; si no, cargar todos
    if (this.selectedGeneroId != null) {
      // Busco el nombre del género a partir de su ID
      const generoObj = this.genderList.find(
        (g) => g.idGenero === this.selectedGeneroId
      );
      if (generoObj) {
        // Aplico filtro
        this.filteredCultivos =
          this.cultivosPorGenero[generoObj.nombreGenero.trim()] || [];
      } else {
        // Si por algún motivo no lo encuentro, muestro todos
        this.filteredCultivos = [...this.cultivo];
      }
    } else {
      // Sin género, muestro todos
      this.filteredCultivos = [...this.cultivo];
    }
  
    // Recalculo los displayName para el ng-select de cultivos
    this.prepareDisplayNames();
  
    // Abro el modal
    this.showCultivoModal = true;
    //bug scroll
    document.body.style.overflow = 'hidden';
    
    console.log('Lista de cultivos filtrados cargada:', this.filteredCultivos.length);
    console.log('Cultivos seleccionados al abrir modal:', this.tempSelectedCultivosIds);
  }

  closeCultivoModal(): void {
    this.showCultivoModal = false;
    //bug scrolls
    document.body.style.overflow = '';
  }

  // Método para añadir cultivos seleccionados con NgSelect
  addSelectedCultivos(): void {
    console.log('Procesando cultivos seleccionados en modal:', this.tempSelectedCultivosIds);
    
    // Si no hay selecciones, cerrar el modal y salir
    if (!this.tempSelectedCultivosIds || this.tempSelectedCultivosIds.length === 0) {
      console.log('No hay cultivos seleccionados');
      this.closeCultivoModal();
      return;
    }

    // Obtener las selecciones actuales y previas
    const anteriores = [...this.selectedCultivosIdsBefore];
    const nuevas = [...this.tempSelectedCultivosIds];

    // Calcular añadidos y eliminados
    const añadidos = nuevas.filter((id) => !anteriores.includes(id));
    const eliminados = anteriores.filter((id) => !nuevas.includes(id));

    console.log('Cultivos añadidos:', añadidos);
    console.log('Cultivos eliminados:', eliminados);

    // Actualizar UI: ids y nombres
    this.selectedCultivosIds = nuevas;
    this.selectedCultivos = nuevas.map((id) => {
      const c = this.cultivo.find((x) => x.id === id);
      if (c) {
        return `${c.nombreAgricultor} - ${c.nombreGenero} - ${c.nombreVariedad}`;
      }
      return `Cultivo ID ${id}`;
    });
    
    console.log('Cultivos seleccionados actualizados:', this.selectedCultivos);
    
    this.closeCultivoModal();

    // Si tenemos una planificación seleccionada (no nueva), actualizar en DB
    if (this.selectedPlanificacion && this.selectedPlanificacion !== 'nueva') {
      const planificacionId = Number(this.selectedPlanificacion);
      this.asociarCultivosAPlanificacion(planificacionId);
    }

    // Para cada detalle y cada cultivo, crear o actualizar producciones
    if (this.details && this.details.length > 0) {
      this.details.forEach((detail) => {
        const card = this.cards[detail.tramo - 1];
        const kilosStr = String(card.value ?? 0);

        nuevas.forEach((cultiveId) => {
          const key = `${detail.id}_${cultiveId}`;
          const existing = this.produccionesMap.get(key);

          const dto: CreateCultiveProductionDto = {
            cultivePlanningDetailsId: detail.id,
            cultiveId: cultiveId,
            kilos: kilosStr,
            fechaInicio: card.startDate!,
            fechaFin: card.endDate!,
          };

          if (existing) {
            // **UPDATE** si ya existía
            this.productionService
              .updateCultiveProduction(
                existing.id,
                dto as UpdateCultiveProductionDto
              )
              .subscribe((updated) => {
                console.log(
                  `Producción actualizada detail ${detail.id}`,
                  updated
                );
                this.produccionesMap.set(key, updated);
              });
          } else {
            // **CREATE** si no existía
            this.productionService
              .createCultiveProduction(dto)
              .subscribe((created) => {
                console.log(`Producción creada detail ${detail.id}`, created);
                this.produccionesMap.set(key, created);
              });
          }
        });
      });

      // Borrar producciones de cultivos eliminados
      eliminados.forEach((cultiveId) => {
        this.details.forEach((detail) => {
          const key = `${detail.id}_${cultiveId}`;
          const prod = this.produccionesMap.get(key);
          if (prod) {
            this.productionService
              .deleteCultiveProduction(prod.id)
              .subscribe(() => {
                console.log(`Producción ${prod.id} eliminada`);
                this.produccionesMap.delete(key);
              });
          }
        });
      });
    }
  }

  // Eliminar un cultivo de la selección
  removeCultivo(index: number): void {
    // Obtener el ID del cultivo que vamos a quitar
    const cultiveId = this.selectedCultivosIds[index];
  
    // Quitar de la UI: nombre y ID
    this.selectedCultivos.splice(index, 1);
    this.selectedCultivosIds.splice(index, 1);
  
    // Para cada detalle (tramo) borrar la producción correspondiente a este cultivo
    this.details.forEach(detail => {
      const key = `${detail.id}_${cultiveId}`;
      const prod = this.produccionesMap.get(key);
      if (prod) {
        this.productionService.deleteCultiveProduction(prod.id)
          .subscribe(() => {
            console.log(`Producción borrada detail ${detail.id}, cultive ${cultiveId}`);
            this.produccionesMap.delete(key);
          }, err => {
            console.error(`Error borrando producción detail ${detail.id}`, err);
          });
      }
    });
  }

  // Muestra un mensaje de éxito temporal
  mostrarMensajeExito(mensaje: string): void {
    this.successMessage = mensaje;

    // Limpiar timeout anterior si existe
    if (this.successTimeout) {
      clearTimeout(this.successTimeout);
    }

    // Ocultar mensaje después de 3 segundos
    this.successTimeout = setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }

  // Método para asociar los cultivos seleccionados a la planificación
  asociarCultivosAPlanificacion(planificacionId: number | string): void {
    console.log(`Asociando cultivos a planificación ${planificacionId}...`);
    console.log(`Cultivos seleccionados: ${this.selectedCultivosIds.join(', ')}`);
    
    if (!planificacionId) {
      console.error('ID de planificación inválido, no se pueden asociar cultivos');
      return;
    }

    // Convertir planificacionId a número si es string
    const planificacionIdNumber = typeof planificacionId === 'string' 
      ? parseInt(planificacionId, 10) 
      : planificacionId;
      
    // Si no se puede convertir a número, usar null
    const planningIdForUpdate = isNaN(planificacionIdNumber) ? null : planificacionIdNumber;

    // Obtener todos los cultivos
    this.cultivoService.getAll().subscribe(
      (cultivos) => {
        console.log(`Total de cultivos en el sistema: ${cultivos.length}`);
        
        // Cultivos que ya tienen esta planificación
        const cultivosConEstaPlanificacion = cultivos.filter(c => 
          c.idCultivePlanning === planificacionIdNumber
        );
        
        console.log(`Cultivos que ya tienen esta planificación: ${cultivosConEstaPlanificacion.length}`);
        
        // Cultivos a vincular (los seleccionados que no tienen esta planificación)
        const cultivosAVincular = this.selectedCultivosIds.filter(id => 
          !cultivosConEstaPlanificacion.some(c => c.id === id)
        );
        
        // Cultivos a desvincular (los que tienen esta planificación pero no están seleccionados)
        const cultivosADesvincular = cultivosConEstaPlanificacion.filter(c => 
          !this.selectedCultivosIds.includes(c.id)
        );
        
        console.log(`Cultivos a vincular: ${cultivosAVincular.length}`);
        console.log(`Cultivos a desvincular: ${cultivosADesvincular.length}`);
        
        // Vincular cultivos
        cultivosAVincular.forEach(cultivoId => {
          this.cultivoService.updateCultivo(cultivoId, {
            idCultivePlanning: planningIdForUpdate
          }).subscribe(
            (updated) => {
              console.log(`Cultivo ${cultivoId} asociado a planificación ${planificacionId}`);
            },
            (error) => {
              console.error(`Error al asociar cultivo ${cultivoId}:`, error);
            }
          );
        });
        
        // Desvincular cultivos
        cultivosADesvincular.forEach(cultivo => {
          this.cultivoService.updateCultivo(cultivo.id, {
            idCultivePlanning: null
          }).subscribe(
            () => {
              console.log(`Cultivo ${cultivo.id} desvinculado de planificación ${planificacionId}`);
            },
            (error) => {
              console.error(`Error al desvincular cultivo ${cultivo.id}:`, error);
            }
          );
        });
      },
      (error) => {
        console.error('Error al obtener cultivos:', error);
      }
    );
  }

  /**
   * Guarda los cambios realizados en los tramos de la quincena
   * y asocia los cultivos seleccionados a la planificación
   */
  guardar(): void {
    // 1️⃣ Validaciones básicas
    if (!this.selectedQuincena) {
      this.mostrarMensajeExito('No hay quincena seleccionada');
      return;
    }
  
    // Evitar valores negativos
    const valoresNegativos = this.cards.some(card => card.value !== null && card.value < 0);
    if (valoresNegativos) {
      alert('Los kilogramos estimados no pueden ser negativos');
      return;
    }
  
    // 2️⃣ Buscar objeto quincena y construir nombre incluyendo género
    const quincena = this.quincenas.find(q => q.id === this.selectedQuincena);
    if (!quincena) {
      console.error('No se encontró la quincena seleccionada');
      return;
    }
    const nombrePlan = `${quincena.nombre} ${this.selectedGenre}`;
  
    // 3️⃣ Comprobar si ya existe la planificación
    this.cultivoPlanningService.getAllCultivePlannings().subscribe(
      planificaciones => {
        const planExist = planificaciones.find(p => p.nombre === nombrePlan);
  
        if (planExist && planExist.id) {
          // ——— ACTUALIZAR PLANIFICACIÓN EXISTENTE ———
          const updateDto: UpdateCultivePlanningDto = {
            nombre: nombrePlan,
            idGenero: this.idGnero,
            fechaInicio: quincena.fechaInicio,
            fechaFin: quincena.fechaFin
          };
  
          this.cultivoPlanningService
            .updateCultivePlanning(planExist.id, updateDto)
            .subscribe(
              () => {
                console.log(`Planificación ${planExist.id} actualizada a "${nombrePlan}"`);
  
                // 4️⃣ Ahora actualizar o crear sus detalles
                this.cultivePlanningDetailsService
                  .getDetailsByPlanningId(planExist.id.toString())
                  .subscribe(
                    existingDetails => {
                      if (existingDetails.length > 0) {
                        this.actualizarPlanificacionExistente(existingDetails, planExist.id);
                      } else {
                        this.crearDetallesParaPlanificacionExistente(planExist);
                      }
                    },
                    err => {
                      console.error('Error al cargar detalles para actualización:', err);
                      this.mostrarMensajeExito('Error al guardar los cambios');
                    }
                  );
              },
              err => {
                console.error('Error al actualizar la planificación:', err);
                this.mostrarMensajeExito('Error al guardar los cambios');
              }
            );
        } else {
          // ——— CREAR NUEVA PLANIFICACIÓN ———
          this.crearNuevaPlanificacion();
        }
      },
      err => {
        console.error('Error al buscar planificaciones existentes:', err);
        this.mostrarMensajeExito('Error al guardar los cambios');
      }
    );
  }
  
  
  /**
 * Sincroniza (crea/actualiza/borra) todas las producciones
 * basadas en los detalles actuales y los cultivos seleccionados.
 */
private syncAllProductions(): void {
  // 1) Crear/actualizar
  this.details.forEach(detail => {
    const card = this.cards[detail.tramo - 1];
    const kilosStr = String(card.value ?? 0);

    this.selectedCultivosIds.forEach(cultiveId => {
      const key = `${detail.id}_${cultiveId}`;
      const existing = this.produccionesMap.get(key);

      const dto: CreateCultiveProductionDto = {
        cultivePlanningDetailsId: detail.id,
        cultiveId:                cultiveId,
        kilos:                    kilosStr,
        fechaInicio:              card.startDate!,
        fechaFin:                 card.endDate!
      };

      if (existing) {
        this.productionService
          .updateCultiveProduction(existing.id, dto as UpdateCultiveProductionDto)
          .subscribe(updated => {
            this.produccionesMap.set(key, updated);
          });
      } else {
        this.productionService
          .createCultiveProduction(dto)
          .subscribe(created => {
            this.produccionesMap.set(key, created);
          });
      }
    });
  });

  // 2) Borrar las que ya no correspondan
  const detalleIds = this.details.map(d => d.id);
  Array.from(this.produccionesMap.entries()).forEach(([key, prod]) => {
    const [detailIdStr, cultiveIdStr] = key.split('_');
    const detailId  = Number(detailIdStr);
    const cultiveId = Number(cultiveIdStr);

    if (!detalleIds.includes(detailId) || !this.selectedCultivosIds.includes(cultiveId)) {
      this.productionService.deleteCultiveProduction(prod.id).subscribe(() => {
        this.produccionesMap.delete(key);
      });
    }
  });
}

/**
 * Actualiza los detalles (tramos) de una planificación ya existente,
 * y luego sincroniza las producciones.
 */
private actualizarPlanificacionExistente(
  existingDetails: CultivePlanningDetails[],
  planificacionId: number | string
): void {
  // 1️⃣ Separa los detalles a borrar y los que quedan
  const detallesABorrar = existingDetails.filter(d => d.tramo > this.numTramos);
  const detallesAActualizar = existingDetails.filter(d => d.tramo <= this.numTramos);

  // 2️⃣ Borra primero los tramos que sobran
  detallesABorrar.forEach(d => {
    this.cultivePlanningDetailsService
      .deleteCultivePlanningDetails(d.id)
      .subscribe(() => {
        console.log(`Detalle tramo ${d.tramo} borrado (ahora sobrante)`);
      });
  });

  // 3️⃣ Actualiza los tramos existentes dentro de rango
  const updateObs = detallesAActualizar.map(detail => {
    const idx = detail.tramo - 1;           // idx < this.numTramos
    const card = this.cards[idx];           // ¡ya existe!
    return this.cultivePlanningDetailsService.updateCultivePlanningDetails(detail.id, {
      id: detail.id,
      fechaInicio: new Date(card.startDate!),
      fechaFin:    new Date(card.endDate!),
      kilos:       card.value || 0,
      tramo:       detail.tramo,
      cultivePlanningId: detail.cultivePlanningId
    });
  });

  // 4️⃣ Si después de actualizar falta crear nuevos tramos (subir count)
  const nuevosATraer: any[] = [];
  for (let tramo = detallesAActualizar.length + 1; tramo <= this.numTramos; tramo++) {
    const card = this.cards[tramo - 1];
    nuevosATraer.push({
      fechaInicio: new Date(card.startDate!),
      fechaFin:    new Date(card.endDate!),
      kilos:       card.value || 0,
      tramo:       tramo
    });
  }

  forkJoin(updateObs).subscribe(
    updatedDetails => {
      // 5️⃣ Crear los detalles nuevos si hacen falta
      if (nuevosATraer.length) {
        this.cultivePlanningDetailsService
          .createMultiplePlanningDetails(planificacionId.toString(), nuevosATraer)
          .subscribe(created => {
            this.details = [...updatedDetails, ...created];
            this.loadAndSyncProductions(this.details);
            this.asociarCultivosAPlanificacion(planificacionId);
            this.mostrarMensajeExito('Planificación actualizada correctamente');
          });
      } else {
        this.details = updatedDetails;
        this.loadAndSyncProductions(this.details);
        this.asociarCultivosAPlanificacion(planificacionId);
        this.mostrarMensajeExito('Planificación actualizada correctamente');
      }
    },
    err => {
      console.error('Error actualizando detalles:', err);
      this.mostrarMensajeExito('Error al guardar los cambios');
    }
  );
}



/**
 * Carga en el map todas las producciones que ya existen
 * para estos detalles, y luego lanza la sincronización.
 */
private loadAndSyncProductions(details: CultivePlanningDetails[]): void {
  // Limpiar el map para no acumular de corridas anteriores
  this.produccionesMap.clear();

  // Primero traemos todas las producciones de la API
  this.productionService.getAllCultiveProductions().subscribe(allProds => {
    // Filtramos sólo las de nuestros details
    const ids = new Set(details.map(d => d.id));
    allProds
      .filter(p => ids.has(p.cultivePlanningDetailsId))
      .forEach(p => {
        const key = `${p.cultivePlanningDetailsId}_${p.cultiveId}`;
        this.produccionesMap.set(key, p);
      });

    // Una vez cargado el map, ejecutamos la sincronización
    this.syncAllProductions();
  });
}





/**
 * Crea los detalles (tramos) para una planificación recién creada
 * y luego sincroniza las producciones.
 */
private crearDetallesParaPlanificacionExistente(planificacion: CultivePlanning): void {
  const planningId = planificacion.id!.toString();
  const tramosDetails = this.cards.map((card, idx) => ({
    fechaInicio: new Date(card.startDate!),
    fechaFin:    new Date(card.endDate!),
    kilos:       card.value || 0,
    tramo:       idx + 1
  }));

  this.cultivePlanningDetailsService
    .createMultiplePlanningDetails(planningId, tramosDetails)
    .subscribe(
      (createdDetails) => {
        this.details = createdDetails;
        // recargar producciones y luego sincronizar
        this.loadAndSyncProductions(createdDetails);
        // asociar cultivos a la planificación
        this.asociarCultivosAPlanificacion(planificacion.id!);
        this.mostrarMensajeExito('Planificación y producciones creadas correctamente');
      },
      err => {
        console.error('Error creando detalles:', err);
        this.mostrarMensajeExito('Error al guardar los cambios');
      }
    );
}


  /**
 * Crea una nueva planificación con sus detalles,
 * asocia cultivos, y luego genera las producciones.
 */
private crearNuevaPlanificacion(): void {
  const quincena = this.quincenas.find(q => q.id === this.selectedQuincena);
  if (!quincena) {
    console.error('No se encontró la quincena seleccionada');
    return;
  }

  // 1️⃣ Crear la planificación
  const planDto: CreateCultivePlanningDto = {
    nombre:     `${quincena.nombre} ${this.selectedGenre}`,
    fechaInicio: quincena.fechaInicio,
    fechaFin:    quincena.fechaFin,
    idGenero:    this.idGnero
  };

  this.cultivoPlanningService.createCultivePlanning(planDto)
    .subscribe(planificacion => {
      // 2️⃣ Crear los detalles (tramos)
      const tramosDetails = this.cards.map((card, idx) => ({
        fechaInicio: new Date(card.startDate!),
        fechaFin:    new Date(card.endDate!),
        kilos:       card.value || 0,
        tramo:       idx + 1
      }));

      this.cultivePlanningDetailsService
        .createMultiplePlanningDetails(planificacion.id!.toString(), tramosDetails)
        .subscribe(
          (createdDetails: CultivePlanningDetails[]) => {
            this.details = createdDetails;

            // 3️⃣ Asociar cultivos a la planificación
            this.asociarCultivosAPlanificacion(planificacion.id!);

            // 4️⃣ Generar producciones para cada detail + cultivo
            this.details.forEach(detail => {
              const card = this.cards[detail.tramo - 1];
              const kilosStr = String(card.value ?? 0);

              this.selectedCultivosIds.forEach(cultiveId => {
                const dto: CreateCultiveProductionDto = {
                  cultivePlanningDetailsId: detail.id,
                  cultiveId:                cultiveId,
                  kilos:                    kilosStr,
                  fechaInicio:              card.startDate!,
                  fechaFin:                 card.endDate!
                };
                // Crear sin comprobar, porque son todas nuevas
                this.productionService
                  .createCultiveProduction(dto)
                  .subscribe(created => {
                    const key = `${detail.id}_${cultiveId}`;
                    this.produccionesMap.set(key, created);
                  });
              });
            });

            this.mostrarMensajeExito('Planificación, detalles y producciones creadas correctamente');
          },
          error => {
            console.error('Error creando detalles:', error);
            this.mostrarMensajeExito('Error al guardar los detalles');
          }
        );
    },
    error => {
      console.error('Error creando planificación:', error);
      this.mostrarMensajeExito('Error al crear la planificación');
    }
  );
}
}