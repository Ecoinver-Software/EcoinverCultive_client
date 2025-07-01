import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComercialServiceService } from '../../services/Comercial.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CreateComercial } from '../../types/createComercial';
import { NgSelectModule } from '@ng-select/ng-select';
import { Client, User } from '../../types/Client';
import { GenderService } from '../../services/Gender.service';
import { Gender } from '../../types/gender';
import { AuthService } from '../../services/Auth.service';



export interface Comercial {
  id: number;
  clientCode: number;
  clientName: string;
  startDate: Date;
  endDate: Date;
  idGenero: number;
  nombreGenero: string;
  nombreUsuario:string;
  kgs: number;
  kgsPlan:number;
  pendiente:number;
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
    nombreUsuario: '',
    nombreGenero: '',

    kgs: 0,
    kgsPlan: 0,
    pendiente: 0
  };
  clientErp: Client[] = [];//Array para la base de datos del Erp
  showDeleteModal: boolean = false;
  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  genderArray: Gender[] = []//Variable donde se guardan los generos
  usuarioSesion:User={
    id: '',
    userName: '',
    name: '',
    lastName: '',
    role: '',
    roleLevel: 0
  }

  validar:boolean=false;
  mensajeError:string='';
  //Un array que va a tener los el género,los kilos, la fecha de inicio y la fecha fin.
  addComercial: { idGenero: number, kg: number, fechaInicio: Date, fechaFin: Date, nombreGenero: string }[] = [];

  constructor(private comercialServicio: ComercialServiceService, private ruta: Router, private fb: FormBuilder, private gender: GenderService,
    private user:AuthService
  ) {

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

    //Se obtienen los datos del usuario que ha iniciado sesión en el hub.
    this.user.obtenerInfo().subscribe(
      (data)=>{
        console.log(data);
        this.usuarioSesion=data;
      },
      (error)=>{
        console.log(error);
      }
    )

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
        item.startDate = new Date(item.startDate);
        item.endDate = new Date(item.endDate);
        const startDate = `${String(item.startDate.getDate()).padStart(2, '0')}-${String(item.startDate.getMonth() + 1).padStart(2, '0')}-${item.startDate.getFullYear()}`;
        const endDate = `${String(item.endDate.getDate()).padStart(2, '0')}-${String(item.endDate.getMonth() + 1).padStart(2, '0')}-${item.endDate.getFullYear()}`;
        return (

          // Verifica si la propiedad es una cadena y realiza la búsqueda de manera insensible a mayúsculas
          (item.clientCode.toString().toLowerCase().includes(query)) ||
          (item.clientName.toLowerCase().includes(query)) ||
          (startDate.includes(query)) || item.nombreGenero.toLowerCase().includes(query) ||
          (endDate.includes(query)) ||
          (item.kgs?.toString().includes(query)) || item.idGenero.toString().includes(query)

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

    //Comprobamos que el clientCode y el clientName no estém vacíos.
    if (!this.miFormulario2.get('clientCode2')?.value || !this.miFormulario2.get('clientName2')) {
      return;
    }

    //Comprobación de si hay datos(par que no se envíen datos vacíos).
    if (this.addComercial.length == 0) {
      return;
    }
    //para actualizar la página justo cuando terminen todas las operaciones
    let contador = 0;
    let operacionesTotales = this.addComercial.length;
    for (let i = 0; i < this.addComercial.length; i++) {
      const formulario = {
        clientCode: this.miFormulario2.get('clientCode2')?.value,
        clientName: this.miFormulario2.get('clientName2')?.value,
        startDate: this.addComercial[i].fechaInicio,
        endDate: this.addComercial[i].fechaFin,
        idGenero: this.addComercial[i].idGenero,
        nombreGenero: this.addComercial[i].nombreGenero,
        nombreUsuario:this.usuarioSesion.name+' '+this.usuarioSesion.lastName,
        kgs: this.addComercial[i].kg
      }
      this.clientData = {
        clientCode: formulario.clientCode,
        clientName: formulario.clientName,
        startDate: formulario.startDate,
        endDate: formulario.endDate,

        idGenero: formulario.idGenero,
        nombreGenero: formulario.nombreGenero,
        nombreUsuario:formulario.nombreUsuario,
        kgs: formulario.kgs,
        kgsPlan:0,
        pendiente:formulario.kgs
      };


      console.log(this.clientData);
      this.comercialServicio.createComercial(this.clientData).subscribe(

        (data) => {
          this.paginatedData = data;
          contador++;
          if (contador == operacionesTotales) {
            window.location.reload();
          }


        },
        (error) => {
          console.error('Error al crear el cliente ', error);
        }
      );
    }



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
      nombreUsuario:this.usuarioSesion.name+' '+this.usuarioSesion.lastName,
      kgs: formulario.kgs,
      kgsPlan:0,
      pendiente:0
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
    dateObj = new Date(dateObj.setHours(12, 0, 0, 0))
    let formattedDate = dateObj.toISOString().slice(0, 10); // "YYYY-MM-DD"
    this.miFormulario.get('startDate')?.setValue(formattedDate);

    dateObj = new Date(this.selectedComercial.endDate);
    dateObj = new Date(dateObj.setHours(12, 0, 0, 0))
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
  //Para la búsqueda de los generos sellecionados por el usuario al crear

  generoBusqueda(idGenero: number) {
    const nombreGenero = this.genderArray.find(item => item.idGenero == idGenero);
    return nombreGenero?.nombreGenero;
  }

  guardarArray() {//Cada vez que se llame a este método se iran guardando las necesidades en el array.

    //Antes que todo comprobamos que los clientes y el género seleccionados no esten ya en la DB.-
    const encontrado=this.paginatedData.find(item=>item.clientCode==this.miFormulario2.get('clientCode2')?.value && item.idGenero==this.miFormulario2?.get('genero2')?.value);
    if(encontrado!==undefined){
      this.mensajeError='Error, esta necesidad ya existe';
    
      this.validar=true;//Para mostrar una alerta cuando la necesidad que si quiere crear ya exista.
      setTimeout(() => {
          this.validar=false;
      }, 2000);
      return;
    }

    if (!this.miFormulario2.get('genero2')?.value || !this.miFormulario2.get('kgs2')?.value || !this.miFormulario2.get('startDate2')?.value || !this.miFormulario2.get('endDate2')?.value || !this.miFormulario2.get('generoNombre2')?.value) {

      return;
    }
    const fechaActual = new Date();//Para el año actual
    let inicioCampana;
    let finCampana;
    if (fechaActual.getMonth() >= 8) {
       inicioCampana = new Date(fechaActual.getFullYear(), 8, 1);
       finCampana = new Date(fechaActual.getFullYear()+1, 7, 31);
    }
    else{
       inicioCampana = new Date(fechaActual.getFullYear()-1, 8, 1);
      finCampana = new Date(fechaActual.getFullYear(), 7, 31);
    }
    inicioCampana.setHours(12,0,0,0);
    finCampana.setHours(12,0,0,0);
    //Validamos también la fecha
    //Comprobación de la fecha fechaInicio>fechaFin, también que este dentro de la campaña
    if (this.miFormulario2.get('startDate2')?.value && this.miFormulario2.get('endDate2')?.value) {
      let startDate = new Date(this.miFormulario2.get('startDate2')?.value);
      let endDate = new Date(this.miFormulario2.get('endDate2')?.value);
      startDate = new Date(startDate.setHours(12, 0, 0, 0));
      endDate = new Date(endDate.setHours(12, 0, 0, 0));
     
      this.clientData.startDate = startDate;
      this.clientData.endDate = endDate;
      if (startDate.getTime() > endDate.getTime()) {
        
        this.fecha = true;
        return;
      }
      
      else if(startDate.getTime()<inicioCampana.getTime() || endDate.getTime()>finCampana.getTime()){
        
        this.fecha=true;
        return;
      }
      else {
        this.fecha = false;
      }
    }

    this.addComercial.push({
      idGenero: this.miFormulario2.get('genero2')?.value,
      kg: this.miFormulario2.get('kgs2')?.value,
      fechaInicio: this.miFormulario2.get('startDate2')?.value,
      fechaFin: this.miFormulario2.get('endDate2')?.value,
      nombreGenero: this.miFormulario2.get('generoNombre2')?.value
    });

    ['genero2', 'generoNombre2', 'kgs2', 'startDate2', 'endDate2'].forEach(campo => {//Lo que hace esto es que se toma que no se hobera tocado(touched) para la validación en el html.
      const control = this.miFormulario2.get(campo);
      control?.setValue('');
      control?.markAsPristine();
      control?.markAsUntouched();
      control?.updateValueAndValidity();
    });

  }
  //Para quitar la necesidad que quiera el usuario.
  quitarNecesidad(i:number){
    this.addComercial.splice(i,1);
  }
}
