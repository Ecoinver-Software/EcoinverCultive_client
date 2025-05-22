import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComercialServiceService } from '../../services/Comercial.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateComercial } from '../../types/createComercial';
import { NgSelectModule } from '@ng-select/ng-select';
import { Client } from '../../types/Client';
import { GenderService } from '../../services/Gender.service';
import { Gender } from '../../types/Gender';
import { animate, style, transition, trigger } from '@angular/animations';


export interface Comercial {
  id: number;
  clientCode: number;
  clientName: string;
  startDate: Date;
  endDate: Date;
  idGenero: number;
  nombreGenero: string;
  kgs: number;
}


@Component({
  selector: 'app-comercial',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgSelectModule],
  templateUrl: './comercial.component.html',
  styleUrls: ['./comercial.component.css']
  
})
export class ComercialComponent implements OnInit {
  // Propiedad para acceder a Math desde el template
  Math = Math;
  //Variables
  selectedComercial: Comercial | null = null;
  validarFechas: boolean = false;
  numId: number = 0;
  fecha: boolean = false;//Manejo de errores dentro del HTML.
  miFormulario: FormGroup;
  miFormulario2: FormGroup;
  codigoElegido: number = 0;
  clientData: CreateComercial = {
    clientCode: 0,
    clientName: '',
    startDate: undefined,
    endDate: undefined,
    idGenero: 0,
    nombreGenero: '',

    kgs: 0
  };
  clientErp: Client[] = [];//Array para la base de datos del Erp
  showDeleteModal: boolean = false;
  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  genderArray: Gender[] = []//Variable donde se guardan los generos
  constructor(private comercialServicio: ComercialServiceService, private ruta: Router, private fb: FormBuilder, private gender: GenderService) {

    this.miFormulario = this.fb.group(//Un validador del formulario para el edit
      {
        clientCode: ['', Validators.required],
        clientName: ['', Validators.required],
        startDate: ['', Validators.required],
        endDate: ['', Validators.required],
        genero: ['', Validators.required],
        generoNombre: ['', Validators.required],
        kgs: ['', [Validators.required, Validators.pattern('^[0-9]+(\.[0-9]+)?$')]],


      });
    this.miFormulario.get('generoNombre')?.disable();
    this.miFormulario.get('clientName')?.disable();
    this.miFormulario2 = this.fb.group(//Otro validador del formulario para el create
      {
        clientCode2: ['', Validators.required],
        clientName2: ['', Validators.required],
        startDate2: ['', Validators.required],
        endDate2: ['', Validators.required],
        genero2: ['', Validators.required],
        generoNombre2: ['', Validators.required],
        kgs2: ['', [Validators.required, Validators.pattern('^[0-9]+(\.[0-9]+)?$')]]

      });
  }

  // Variables para búsqueda y paginación
  searchQuery: string = '';
  itemsPerPage: number = 5;
  currentPage: number = 1;

  // Arrays auxiliares
  filteredData: Comercial[] = [];
  paginatedData: Comercial[] = [];

  // Getter para calcular el total de páginas
  get totalPages(): number {
    return Math.ceil(this.paginatedData.length / this.itemsPerPage);
  }

  ngOnInit(): void {


    //Obtenemos los registros de los datos de la base de datos
    this.comercialServicio.getComercial().subscribe(
      (data) => {
        this.paginatedData = data;
        this.filteredData = this.paginatedData;
        console.log(this.paginatedData);
        this.updatePagination();

      },
      (error) => {
        console.error('Error: ' + error);
      }

    );


    this.comercialServicio.getCliente().subscribe(//Obtenemos los clientes.
      (data) => {
        this.clientErp = data;

      },
      (error) => {
        console.log('Error:' + error);
      }

    );

    this.gender.get().subscribe(//Obtenemos el genero
      (data) => {
        this.genderArray = data;

      },
      (error) => {
        console.error('Error ' + error);
      }

    );

  }

  // Filtrar datos basado en la búsqueda
  filterData(): void {
    const query = this.searchQuery.toLowerCase().trim();


    if (query) {

      // Si hay texto en la búsqueda, filtrar los datos
      this.filteredData = this.paginatedData.filter(item => {
        // Asegúrate de que las fechas estén formateadas de manera consistente
        const startDate = new Date(item.startDate).toISOString().slice(0, 10); // 'YYYY-MM-DD'
        const endDate = new Date(item.endDate).toISOString().slice(0, 10); // 'YYYY-MM-DD'

        return (

          // Verifica si la propiedad es una cadena y realiza la búsqueda de manera insensible a mayúsculas
          (item.clientCode.toString().toLowerCase().includes(query)) ||
          (item.clientName.toLowerCase().includes(query)) ||
          (startDate.includes(query)) ||
          (endDate.includes(query)) ||
          (item.kgs?.toString().includes(query))

        );

      });
    } else {
      // Si no hay consulta, se restauran todos los datos y se restablece a la primera página
      this.filteredData = [...this.paginatedData];

      this.currentPage = 1;  // Restablecer la página a la primera
    }
    // Actualizar la paginación para reflejar los datos filtrados

  }

  // Actualiza los datos mostrados en la página actual
  updatePagination(): void {
    let startIndex = (this.currentPage - 1) * this.itemsPerPage;
    let endIndex = Number(startIndex) + Number(this.itemsPerPage);
    startIndex = Number(startIndex);
    this.filteredData = this.paginatedData.slice(startIndex, endIndex);


  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }
  //Método para crear un nuevo comercial
  create(): void {
    this.miFormulario2.get('clientName2')?.enable();
    this.miFormulario2.get('generoNombre2')?.enable();
    const formulario = this.miFormulario2.value;

    this.clientData = {
      clientCode: formulario.clientCode2,
      clientName: formulario.clientName2,
      startDate: formulario.startDate2,
      endDate: formulario.endDate2,

      idGenero: formulario.genero2,
      nombreGenero: formulario.generoNombre2,
      kgs: formulario.kgs2
    };


    //Comprobación de la fecha fechaInicio>fechaFin
    if (this.clientData.startDate && this.clientData.endDate) {
      let startDate = new Date(this.clientData.startDate);
      let endDate = new Date(this.clientData.endDate);
      startDate=new Date(startDate.setHours(12,0,0,0));
      endDate=new Date(endDate.setHours(12,0,0,0));

      this.clientData.startDate=startDate;
      this.clientData.endDate=endDate;
      if (startDate.getTime() > endDate.getTime()) {
        this.validarFechas = true;
      }
      else {
        this.validarFechas = false;
      }
    }
    else {
      this.validarFechas = false;
    }

    if (this.validarFechas) {
      setTimeout(() => {
        this.fecha = true;
        this.validarFechas = false; // De esta manera, Angular actualizará la vista.
      }, 0); //Cambiamos la variable para que el usuario pueda volver a darle al botón
      return;
    }
    console.log(this.clientData);
    this.comercialServicio.createComercial(this.clientData).subscribe(

      (data) => {
        this.paginatedData = data;
        window.location.reload();
      },
      (error) => {
        console.error('Error al crear el cliente ', error);
      }
    );

  }


  // Método para editar
  edit(): void {
    this.miFormulario.get('clientName')?.enable();
    this.miFormulario.get('generoNombre')?.enable();
    const formulario = this.miFormulario.value;

    this.clientData = {
      clientCode: formulario.clientCode,
      clientName: formulario.clientName,
      startDate: formulario.startDate,
      idGenero: formulario.genero,
      nombreGenero: formulario.generoNombre,
      endDate: formulario.endDate,
      kgs: formulario.kgs
    };
    console.log(this.clientData);
    //Comprobación de la fecha fechaInicio>fechaFin
    if (this.clientData.startDate && this.clientData.endDate) {
      const startDate = new Date(this.clientData.startDate);
      const endDate = new Date(this.clientData.endDate);

      if (startDate.getTime() > endDate.getTime()) {
        this.validarFechas = true;
      }
      else {
        this.validarFechas = false;
      }
    }
    else {
      this.validarFechas = false;
    }

    if (this.validarFechas) {
      setTimeout(() => {
        this.fecha = true;
        this.validarFechas = false; // De esta manera, Angular actualizará la vista.
      }, 0); //Cambiamos la variable para que el usuario pueda volver a darle al botón
      return;
    }
    this.comercialServicio.editComercial(this.numId, this.clientData).subscribe(

      (data) => {
        this.paginatedData = data;
        window.location.reload();
      },
      (error) => {
        console.error('Error al crear el cliente ', error);
      }
    );



  }

  // Método para borrar
  delete(id: number): void {
    this.comercialServicio.deleteComercial(id).subscribe(
      (data) => {
        this.paginatedData = data;
        window.location.reload();
      }

    );
  }

  selectRow(item: Comercial) {//Al comerical asignado en HTML, guardamos su ID en la variable numId
    this.selectedComercial = item;
    this.numId = this.selectedComercial.id;

    this.miFormulario.patchValue({ clientCode: this.selectedComercial.clientCode });
    this.miFormulario.get('clientName')?.setValue(this.selectedComercial.clientName);
    this.miFormulario.get('genero')?.setValue(this.selectedComercial.idGenero);
    this.miFormulario.get('generoNombre')?.setValue(this.selectedComercial.nombreGenero);

    let dateObj = new Date(this.selectedComercial.startDate);
    dateObj=new Date(dateObj.setHours(12,0,0,0))
    let formattedDate = dateObj.toISOString().slice(0, 10); // "YYYY-MM-DD"
    this.miFormulario.get('startDate')?.setValue(formattedDate);

    dateObj = new Date(this.selectedComercial.endDate);
    dateObj=new Date(dateObj.setHours(12,0,0,0))
    formattedDate = dateObj.toISOString().slice(0, 10); // "YYYY-MM-DD"
    this.miFormulario.get('endDate')?.setValue(formattedDate);
    this.miFormulario.get('kgs')?.setValue(this.selectedComercial.kgs);
  }

  buscarComercial(evento: Client) {//Asignación input del nombre del comercial en el edit.
    const selectedComercial = this.clientErp.find(item => item.clientId == evento.clientId);
    this.miFormulario.get('clientName')?.setValue(selectedComercial?.name);

  }
  buscarComercial2(evento: Client) {//Asignación input del nombre del género en el create.
    const selectedComercial = this.clientErp.find(item => item.clientId == evento.clientId);
    this.miFormulario2.get('clientName2')?.setValue(selectedComercial?.name);

  }
  buscarGenero(genero: Gender) {//Asignación input del nombre del género en el edit.
    const selectedGenero = this.genderArray.find(item => item.idGenero == genero.idGenero);
    this.miFormulario.get('generoNombre')?.setValue(selectedGenero?.nombreGenero);
  }
  buscarGenero2(genero: Gender) {//Asignación input del nombre del género en el create.
    const selectedGenero = this.genderArray.find(item => item.idGenero == genero.idGenero);
    this.miFormulario2.get('generoNombre2')?.setValue(selectedGenero?.nombreGenero);
  }
  search(nombre: string, cliente: Client) {//Búsqueda del comercial
    nombre = nombre.toLowerCase();
    return cliente.clientId.toString().toLowerCase().includes(nombre) || cliente.name.toLowerCase().includes(nombre);

  }
  searchGenero(nombre: string, genero: Gender) {//Búsqueda del géenero
    nombre = nombre.toLowerCase();
    return genero.idGenero.toString().toLowerCase().includes(nombre) || genero.nombreGenero.toLowerCase().includes(nombre);
  }

  //Manejo de los modales
  openDeleteModal() {
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
  }

  openCreateModal() {
    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  openEditModal() {
    if (this.selectedComercial) {
      this.showEditModal = true;
    }
  }

  closeEditModal() {
    this.showEditModal = false;
  }


}