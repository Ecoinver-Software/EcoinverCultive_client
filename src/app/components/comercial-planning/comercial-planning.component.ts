import { ChangeDetectorRef, Component } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Comercial, ComercialServiceService } from '../../services/Comercial.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';
import { ComercialPlanningService } from '../../services/ComercialPlanning.service';
import { ComercialPlanning } from '../../types/ComercialPlanning';
import { ComercialPlanningDetailsService } from '../../services/ComercialPlanningDetails.service';
import { ComercialPlanningDetails } from '../../types/ComercialPlanningDetails';
import { ComercialPlanningPost } from '../../types/ComercialPlanningPost';
import { ComercialPlanningDetailsWithId } from '../../types/ComercialPlanningDetailsWithId';

@Component({
  selector: 'app-comercial-planning',
  imports: [FormsModule, NgSelectModule, CommonModule, ReactiveFormsModule],
  templateUrl: './comercial-planning.component.html',
  styleUrl: './comercial-planning.component.css'
})
export class ComercialPlanningComponent {
  modal = false;
  editarBoton: boolean = false;

  validar: string | null = null//Para el botón guardar planificación
  semanas: { semana: number, fecha: string }[] = [];//Array que contendrá la semana y fecha de los cards
  rangoSemana: { inicio: Date, fin: Date }[] = [];
  comercial: Comercial[] = [];
  planning: ComercialPlanning[] = [];
  plannigDetails: ComercialPlanningDetailsWithId[] = [];//Array donde se guardans los cards en la BD
  planningEditar: ComercialPlanningDetailsWithId[] = [];//Para editar los planning
  guardarPlanning: ComercialPlanningDetails = {
    idCommercialNeedsPlanning: 0,
    kilos: 0,
    fechaDesde: new Date(),
    fechaHasta: new Date(),
    numeroSemana: 0,
  }
  distribuido: number = 0;
  pendiente: number = 0;
  selectedComercial: Comercial = {
    id: 0,
    clientCode: 0,
    clientName: '',
    startDate: new Date(),
    endDate: new Date(),
    idGenero: 0,
    nombreGenero: '',
    nombreUsuario:'',
    kgs: 0
  };
  editarPlanning: boolean = false;
  formulario: FormGroup;
  validForm: boolean = false;//Para validar el formualarrio
  index: number = -1;

  constructor(private comercialServicio: ComercialServiceService, private comercialPlanning: ComercialPlanningService, private comercialDetails: ComercialPlanningDetailsService, private fb: FormBuilder, private cdr: ChangeDetectorRef) {
    this.formulario = this.fb.group({
      semanas: this.fb.array([]) // Inicializa un FormArray vacío
    });
  }
  
  ngOnInit(): void {
    this.comercialServicio.getComercial().subscribe(//Obtenemos las necesidades comerciales guardadas en la base de datos
      (data) => {
        this.comercial = data;
      },
      (error) => {
        console.log(error);
      }
    );
    
    //Obtenemos los datos del planning de la BD
    this.comercialPlanning.get().subscribe(
      (data) => {
        this.planning = data;
      },
      (error) => {
        console.log(error);
      }
    );
  }
  
  ngAfterViewInit() {
    this.cdr.detectChanges();
  }

  calcularSemanas(evento: Comercial) {//Calculo del rengo de las fechas para generar los Cards
    this.semanas = [];
    this.rangoSemana = [];
    this.distribuido = 0;
    this.pendiente = 0;
    this.planningEditar = [];
    this.validar = null;
    this.editarBoton = false;

    if (evento) {
      //Obtenemos los datos detalles de cada card del planning de la BD
      this.comercialDetails.get().subscribe(
        (data) => {
          this.plannigDetails = data;
          this.selectedComercial = {//El comercial seleccionado en el ngSelect.
            id: evento.id,
            clientCode: evento.clientCode,
            clientName: evento.clientName,
            startDate: evento.startDate,
            endDate: evento.endDate,
            idGenero: evento.idGenero,
            nombreGenero: evento.nombreGenero,
            nombreUsuario:'',
            kgs: evento.kgs
          };

          const startDate = new Date(evento.startDate);
          const endDate = new Date(evento.endDate);
          let inicio = new Date(startDate);
          let fin;
          let numSemanas = 0;
          //Calculo del número de semana
          const primerDia = new Date(inicio.getFullYear(), 0, 1); // 1 de enero
          const diaSemana = primerDia.getDay(); // 0 = domingo, 1 = lunes, ...

          // Ajustamos el inicio para que la semana comience correctamente
          const diasDesdePrimerDia = Math.floor((inicio.getTime() - primerDia.getTime()) / (1000 * 60 * 60 * 24));
          const diasAjustados = diasDesdePrimerDia + diaSemana; // Ajuste si semana inicia en domingo

          let semana = [];
          semana.push(Math.floor(diasAjustados / 7) + 1);

          for (let i = new Date(startDate); i <= endDate; i.setDate(i.getDate() + 1)) {//Se recorren las fechas
            if (inicio.getFullYear() !== i.getFullYear()) {
              semana.push(1);
            }
            if (i.getDay() == 0) {//Si el dia de la fecha es igual a domingo
              fin = new Date(i.getFullYear(), i.getMonth(), i.getDate());
              numSemanas++;//Sumamos una semana
              this.semanas.push({
                semana: semana[semana.length - 1], fecha: inicio.toLocaleDateString('es-ES', {
                  day: '2-digit',   // Asegura que el día tenga 2 dígitos
                  month: '2-digit', // Asegura que el mes tenga 2 dígitos
                  year: 'numeric',
                }) + '-' + fin.toLocaleString('es-ES', {
                  day: '2-digit',   // Asegura que el día tenga 2 dígitos
                  month: '2-digit', // Asegura que el mes tenga 2 dígitos
                  year: 'numeric',
                })
              });

              this.rangoSemana.push({
                inicio: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 12, 0, 0),
                fin: new Date(fin.getFullYear(), fin.getMonth(), fin.getDate(), 12, 0, 0)
              });
              inicio = new Date(i.getFullYear(), i.getMonth(), i.getDate() + 1);

              semana.push(semana[semana.length - 1] + 1);
            }
            if (i.getTime() === endDate.getTime()) {
              fin = new Date(i.getFullYear(), i.getMonth(), i.getDate());

              if (i.getDay() != 0) {//Si hemos entrado en una nueva semana aunque no sea domingo.
                this.semanas.push({
                  semana: semana[semana.length - 1], fecha: inicio.toLocaleDateString('es-ES', {
                    day: '2-digit',   // Asegura que el día tenga 2 dígitos
                    month: '2-digit', // Asegura que el mes tenga 2 dígitos
                    year: 'numeric',
                  }) + '-' + fin.toLocaleString('es-ES', {
                    day: '2-digit',   // Asegura que el día tenga 2 dígitos
                    month: '2-digit', // Asegura que el mes tenga 2 dígitos
                    year: 'numeric',
                  })
                });
                this.rangoSemana.push({
                  inicio: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 12, 0, 0),
                  fin: new Date(fin.getFullYear(), fin.getMonth(), fin.getDate(), 12, 0, 0)
                });

                numSemanas++;//Sumamos una semana
                semana.push(semana[semana.length - 1] + 1)
              }
            }
          }

          console.log(this.rangoSemana);

          const planning: ComercialPlanningPost = {
            idCommercialNeed: this.selectedComercial.id,
            weekNumber: numSemanas,
            kgs: this.selectedComercial.kgs,
            startDate: this.selectedComercial.startDate,
            endDate: this.selectedComercial.endDate
          }
          //Guardamos en la tabla planning la necesidad comercial.

          if (planning && !this.planning.find(item => item.idCommercialNeed === planning.idCommercialNeed)) {
            // Para que no se repita la misma necesidad comercial en la tabla
            this.comercialPlanning.post(planning).subscribe(
              (data) => {
                console.log('Se han insertado los datos correctamente');
                this.planning.push(data.entity);
              },
              (error) => {
                console.log(error);
              }
            );
          }

          if (this.planning.find(item => item.idCommercialNeed === evento.id)) {
            const edit = this.planning.find(item => item.idCommercialNeed === evento.id);
            if (!edit) return;

            // Filtrar y ordenar detalles
            const detalles = this.plannigDetails
              .filter(d => d.idCommercialNeedsPlanning === edit.id)
              .map(d => {
                const fechaDesde = new Date(d.fechaDesde);
                const fechaHasta = new Date(d.fechaHasta);
                return {
                  ...d,
                  fechaDesde,
                  fechaHasta,
                  semanaReal: this.getWeekNumberISO(fechaDesde),
                  añoReal: this.getYearFromISOWeek(fechaDesde)
                };
              })
              .sort((a, b) => a.fechaDesde.getTime() - b.fechaDesde.getTime());

            if (!detalles.length) {
              this.planningEditar = [];
              this.distribuido = 0;
              // Crear FormArray para las semanas sin datos existentes
              this.createFormArrayForSemanas();
              return;
            }

            const fechaInicio = this.getMondayOfISOWeek(detalles[0].fechaDesde);
            const fechaFin = this.getMondayOfISOWeek(detalles[detalles.length - 1].fechaDesde);
            const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
            const semanasTotales = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / MS_PER_WEEK);

            const semanas: { semana: number, año: number, desde: Date, hasta: Date }[] = [];
            for (let i = 0; i <= semanasTotales; i++) {
              const desde = new Date(fechaInicio.getTime() + i * MS_PER_WEEK);
              const hasta = new Date(desde.getTime() + 6 * 24 * 60 * 60 * 1000);
              semanas.push({
                semana: this.getWeekNumberISO(desde),
                año: this.getYearFromISOWeek(desde),
                desde,
                hasta
              });
            }

            this.planningEditar = [];
            this.distribuido = 0;

            for (const s of semanas) {
              const existente = detalles.find(d => d.semanaReal === s.semana && d.añoReal === s.año);
              if (existente) {
                this.planningEditar.push({
                  id: existente.id,
                  idCommercialNeedsPlanning: existente.idCommercialNeedsPlanning,
                  numeroSemana: s.semana,
                  kilos: existente.kilos,
                  fechaDesde: existente.fechaDesde,
                  fechaHasta: existente.fechaHasta
                });
                this.distribuido += existente.kilos ?? 0;
              } else {
                this.planningEditar.push({
                  id: undefined,
                  idCommercialNeedsPlanning: edit.id,
                  numeroSemana: s.semana,
                  kilos: 0,
                  fechaDesde: s.desde,
                  fechaHasta: s.hasta
                });
              }
            }

            console.log(this.planningEditar);
          }

          // Crear FormArray después de procesar todos los datos
          this.createFormArrayForSemanas();
          this.pendiente = evento.kgs - this.distribuido;
        },
        (error) => {
          console.log('Error ' + error);
        }
      );
    }
  }

  // Método auxiliar para crear el FormArray correctamente
  createFormArrayForSemanas() {
    // Limpiar el FormArray primero
    this.semanasFormArray.clear();

    // Crear controles de formulario para cada semana
    for (let i = 0; i < this.semanas.length; i++) {
      let initialValue: string | number = '';
      
      // Si existe planningEditar para este índice, usar su valor
      if (this.planningEditar[i] && this.planningEditar[i].kilos !== undefined) {
        initialValue = this.planningEditar[i].kilos || '';
      }
      
      const control = this.fb.control(
        initialValue,
        [Validators.required, Validators.min(1)]
      );

      this.semanasFormArray.push(control);
    }

    // Habilitar/deshabilitar controles basándose en datos existentes
    this.semanasFormArray.controls.forEach((control, index) => {
      // Si hay datos existentes en planningEditar para este índice
      if (this.planningEditar[index] && 
          this.planningEditar[index].kilos !== undefined && 
          this.planningEditar[index].kilos !== 0) {
        control.disable();
      } else {
        control.enable();
      }
    });

    console.log('FormArray length:', this.semanasFormArray.length);
    console.log('Semanas length:', this.semanas.length);
    console.log('PlanningEditar length:', this.planningEditar.length);
  }

  resumen() {
    this.distribuido = 0;

    // Usar los valores del FormArray en lugar de DOM queries
    this.semanasFormArray.controls.forEach((control, index) => {
      const value = control.value || 0;
      this.distribuido += Number(value);
      
      if (this.planningEditar[index]) {
        this.planningEditar[index].kilos = Number(value);
      }
    });

    this.pendiente = this.selectedComercial.kgs - this.distribuido;
  }

  search(nombre: string, comercial: Comercial) {//Búsqueda en el ng select
    nombre = nombre.toLowerCase().trim();
    return comercial.clientCode.toString().toLowerCase().includes(nombre) || comercial.clientName.toLowerCase().includes(nombre);
  }
  
  //Aquí se guardan los datos de los cards en la tabla commercialneedsplanningdetails
  async guardar() {
    this.validar = null;

    const id = this.planning.find(item => item.idCommercialNeed == this.selectedComercial.id);

    if (id === undefined || this.plannigDetails.find(item => item.idCommercialNeedsPlanning == id?.id)) {
      this.validar = 'Esta necesidad comercial ya existe en el sistema';
      this.modal = false;
      setTimeout(() => {
        this.validar = null;
        return;
      }, 2000);
    }
    else {
      for (let i = 0; i < this.semanasFormArray.length; i++) {
        if (this.semanasFormArray.controls[i].invalid) {
          this.validForm = true;
        }
      }
      if (this.validForm) {
        this.validForm = true;
        console.log('Error');
        setTimeout(() => {
          this.validForm = false;
          return;
        }, 2000)
      }
      else {
        const promesas = [];
        for (let i = 0; i < this.semanasFormArray.length; i++) {
          const controlValue = this.semanasFormArray.controls[i].value;
          this.guardarPlanning = {
            idCommercialNeedsPlanning: id?.id || 0,
            kilos: Number(controlValue),
            fechaDesde: this.rangoSemana[i].inicio,
            fechaHasta: this.rangoSemana[i].fin,
            numeroSemana: this.semanas[i].semana
          };
          console.log(this.guardarPlanning);
          const promesa = this.comercialDetails.post(this.guardarPlanning).toPromise();
          promesas.push(promesa);
        }

        try {
          const resultado = await Promise.all(promesas);
          this.modal = true;
          console.log('Datos insertados correctamente ' + resultado);
        } catch (error) {
          console.log('Error al guardar los datos ' + error);
          this.modal = false;
        }
      }
    }
  }
  
  cerrarModal() {
    this.modal = false;
    window.location.reload();
  }
  
  //Barra de progreso
  get calcularPorcentaje() {
    const porcentaje = (this.distribuido * 100) / this.selectedComercial.kgs;
    if (porcentaje <= 100) {
      return porcentaje;
    } else {
      return 100;
    }
  }

  editar(indice: number) {//Para editar cada Card.
    const editar = this.planningEditar[indice];

    for (let i = 0; i < this.semanasFormArray.length; i++) {
      if (this.semanasFormArray.controls[i].invalid && i === indice) {
        this.validForm = true;
        setTimeout(() => {
          this.validForm = false;
        }, 2000)
        return;
      }
    }
    
    if (editar) {
      if (editar.id) {
        this.comercialDetails.put(editar.id, editar).subscribe(
          (data) => {
            console.log(data);
            this.editarPlanning = true;
            this.validar = null;
            this.editarBoton = false;
            this.semanasFormArray.controls[indice].disable();
          },
          (error) => {
            console.log('Error al editar' + error);
          }
        );
      }
      else {
        const id = this.planning.find(item => item.idCommercialNeed == this.selectedComercial.id);
        const controlValue = this.semanasFormArray.controls[indice].value;

        if (this.semanasFormArray.controls[indice].invalid) {
          this.validForm = true;
          setTimeout(() => {
            this.validForm = false;
          }, 2000);
          return;
        }
        
        const fecha = new Date(this.rangoSemana[indice].inicio);
        fecha.setHours(12, 0, 0, 0); // evitar problemas por zona horaria

        const primerDia = new Date(fecha.getFullYear(), 0, 1);
        const diff = (fecha.getTime() - primerDia.getTime()) / (1000 * 60 * 60 * 24);
        const ajuste = primerDia.getDay(); // 0 = domingo, 1 = lunes, etc.
        console.log(this.rangoSemana);
        
        const semana = Math.floor((diff + ajuste) / 7) + 1;

        this.guardarPlanning = {
          idCommercialNeedsPlanning: id?.id || 0,
          kilos: Number(controlValue),
          fechaDesde: this.rangoSemana[indice].inicio,
          fechaHasta: this.rangoSemana[indice].fin,
          numeroSemana: semana
        };
        console.log(this.rangoSemana);

        this.comercialDetails.post(this.guardarPlanning).subscribe(
          (data) => {
            console.log(data);
            this.editarPlanning = true;
            this.validar = null;
            this.editarBoton = false;
            this.semanasFormArray.controls[indice].disable();
          },
          (error) => {
            console.log(error);
          }
        )
      }
    }
    else {
      const id = this.planning.find(item => item.idCommercialNeed == this.selectedComercial.id);
      const controlValue = this.semanasFormArray.controls[indice].value;

      if (this.semanasFormArray.controls[indice].invalid) {
        this.validForm = true;
        setTimeout(() => {
          this.validForm = false;
        }, 2000);
        return;
      }
      
      const fecha = new Date(this.rangoSemana[indice].inicio);
      fecha.setHours(12, 0, 0, 0); // evitar problemas por zona horaria

      const primerDia = new Date(fecha.getFullYear(), 0, 1);
      const diff = (fecha.getTime() - primerDia.getTime()) / (1000 * 60 * 60 * 24);
      const ajuste = primerDia.getDay(); // 0 = domingo, 1 = lunes, etc.

      const semana = Math.floor((diff + ajuste) / 7) + 1;
      this.guardarPlanning = {
        idCommercialNeedsPlanning: id?.id || 0,
        kilos: Number(controlValue),
        fechaDesde: this.rangoSemana[indice].inicio,
        fechaHasta: this.rangoSemana[indice].fin,
        numeroSemana: semana
      };
      console.log(this.rangoSemana);

      this.comercialDetails.post(this.guardarPlanning).subscribe(
        (data) => {
          console.log(data);
          this.editarPlanning = true;
          this.validar = null;
          this.editarBoton = false;
          this.semanasFormArray.controls[indice].disable();
        },
        (error) => {
          console.log(error);
        }
      )
    }
    console.log(this.planningEditar);
  }

  modalEditar() {
    this.editarPlanning = false;
  }

  habilitarBoton(i: number) {
    if (this.editarBoton == false) {
      this.editarBoton = true;
      this.semanasFormArray.controls[i].enable();
      this.index = i;
    } else {
      this.editarBoton = false;
      this.semanasFormArray.controls[i].disable();
    }
    this.cdr.detectChanges(); // Forzar la detección de cambios
  }
  
  get semanasFormArray(): FormArray<FormControl> {
    return this.formulario.get('semanas') as FormArray<FormControl>;
  }
  
  getWeekNumberISO(date: Date): number {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  getYearFromISOWeek(date: Date): number {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    return tmp.getUTCFullYear();
  }

  getMondayOfISOWeek(date: Date): Date {
    const tmp = new Date(date);
    const day = tmp.getDay();
    const diff = tmp.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(tmp.setDate(diff));
  }
}