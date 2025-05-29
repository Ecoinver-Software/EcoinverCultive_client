import { Component, OnInit } from '@angular/core';
import { CultiveProductionDto } from '../../types/CultiveProductionTypes';
import { CultiveProductionService } from '../../services/CultiveProduction.service';
import { VariablesService } from '../../services/variables.service';
import { Variables } from '../../types/variables';
import { FormsModule } from '@angular/forms';
import { CultivoService } from '../../services/Cultivo.service';
import { Cultive } from '../../types/Cultive';

@Component({
  selector: 'app-variables-globales',
  imports: [FormsModule],
  templateUrl: './variables-globales.component.html',
  styleUrl: './variables-globales.component.css'
})
export class VariablesGlobalesComponent implements OnInit {

  //Variables
  activeIndex: number | null = null;
  
  loading: boolean = false;
  producciones: CultiveProductionDto[] = [];
  variables: Variables[] = [];
  idCultivosSinRepetir: number[] = [];
  cultivos: Cultive[] = [];
  valorRango: number = 100;
  nombreVariable: string = '';
  //Variables booleanas para manejar las alertas
  showErrorAlert: boolean = false;
  showSuccessAlert: boolean = false;
  errorMessage: string = '';
  idCultivoFechaValida: number[] = [];
  busquedaCultivos: string = '';
  cultivosFiltrados: Cultive[] = [];
  contadorCheckbox: number = 0;
  idsCultivosSeleccionados: number[] = [];
  variablesFiltros: Variables[] = [];
  message: string = '';
  showDeleteModal: boolean = false;
  nombreVariableBorrar: string = '';
  cultivosAsociados: Cultive[] = [];
  
  constructor(private productionService: CultiveProductionService, private variablesService: VariablesService, private cultiveService: CultivoService) {

  }
  ngOnInit(): void {
    this.productionService.getAllCultiveProductions().subscribe(
      (data) => {
        this.producciones = data;
        const fechaHoy = new Date();

        //Para coger aquellos cultivos cuya planidficación entra en la fecha de la creación de la variable.
        for (let i = 0; i < this.producciones.length; i++) {
          const encontrado = this.idCultivoFechaValida.find(item => item == this.producciones[i].cultiveId);
          if (encontrado == null && new Date(this.producciones[i].fechaFin).getTime() >= fechaHoy.getTime()) {
            this.idCultivoFechaValida.push(this.producciones[i].cultiveId);
          }
        }
        console.log(this.idCultivoFechaValida);
        this.cultivosValidos();
      },
      (error) => {
        console.log(error);
      }
    );
    this.variablesService.get().subscribe(
      (data) => {
        this.variables = data;
        this.variables = this.variables.filter(item => item.categoria == 'global');
        this.calcularVariablesFiltros();

        for (let i = 0; i < this.variablesFiltros.length; i++) {
          const encontrado = this.idCultivosSinRepetir.find(item => item == this.variablesFiltros[i].idCultivo);
          if (encontrado == undefined) {

            this.idCultivosSinRepetir.push(this.variablesFiltros[i].idCultivo);

          }
        }

      },
      (error) => {
        console.log(error);
      }
    );
  }

  porcentaje() {
    let rango = document.getElementById('rango') as HTMLInputElement;
    this.valorRango = Number(rango.value)

  }

  descripcion() {
    const numero = this.valorRango - 100;

    if (this.valorRango > 100) {
      return 'Aumenta la producción un ' + numero + '%';
    }
    else if (this.valorRango < 100) {
      return 'Disminuye la producción un ' + (-numero) + '%';
    }
    else {
      return 'Mantiene la producción actual';
    }
  }

  descripcion2(i: number) {
    const numero = this.variablesFiltros[i].valor * 100;

    if (numero > 100) {
      return 'Aumenta la producción un ' + (numero - 100).toFixed(0) + '%';
    }
    else if (numero < 100) {
      return 'Disminuye la producción un ' + (-numero + 100).toFixed(0) + '%';
    }
    else {
      return 'Mantiene la producción actual';
    }
  }

  crearVariable() {

    if (this.nombreVariable.trim() == '') {
      this.errorMessage = 'El campo Nombre de la Variable no debe estar vacío';
      this.showErrorAlert = true;
      return;
    }

    if (this.idsCultivosSeleccionados.length == 0) {

      this.errorMessage = 'Debes seleccionar al menos un cultivo';
      this.showErrorAlert = true;
      return;
    }

    let totalOperaciones = this.idsCultivosSeleccionados.length;
    let operacionesCompletadas = 0;

    for (let i = 0; i < this.idsCultivosSeleccionados.length; i++) {
      const encontrado = this.variables.find(item => item.idCultivo == this.idsCultivosSeleccionados[i] && item.name == this.nombreVariable);
      if (encontrado !== undefined) {
        this.errorMessage = 'Uno de los cultivos ya contiene esta variable';
        this.showErrorAlert = true;
        return;
      }

      const variable: Variables = {
        id: 0,
        name: this.nombreVariable,
        idCultivo: this.idsCultivosSeleccionados[i],
        fechaRegistro: new Date(),
        valor: this.valorRango / 100,
        categoria: 'global'
      }

      this.variablesService.post(variable).subscribe(
        (data) => {

          this.calcularVariablesFiltros();
          this.ajustarKilos(data.idCultivo, data.valor);
          operacionesCompletadas++;

          if (operacionesCompletadas == totalOperaciones) {
            this.loading = false;
            this.message = 'Variable creada correctamente';
            this.showSuccessAlert = true;

          }

        },
        (error) => {
          console.log(error);
        }
      );
    }


  }

  cerrarErrorModal() {
    this.showErrorAlert = false;

  }

  ajustarKilos(idCultivo: number, valor: number) {

    const producciones = this.producciones.filter(item => item.cultiveId == idCultivo);


    this.loading = true;
    for (let i = 0; i < producciones.length; i++) {
      this.productionService.updatePatch(producciones[i].id, Number(producciones[i].kilosAjustados.trim().replace(',', '.')) * valor).subscribe(
        (data) => {
          console.log(data);
        },
        (error) => {
          console.log(error);
        }
      );
    }

  }

  cerrarModal() {
    this.showSuccessAlert = false;
    window.location.reload();
  }

  cultivosValidos() {
    for (let i = 0; i < this.idCultivoFechaValida.length; i++) {
      this.cultiveService.getById(this.idCultivoFechaValida[i]).subscribe(
        (data) => {
          this.cultivos.push(data);
          this.cultivosFiltrados.push(data);
        },
        (error) => {
          console.log(error);
        }
      );
    }

  }
  buscarCultivos() {

    this.cultivosFiltrados = this.cultivos.filter(item => item.nombreAgricultor.toLowerCase().includes(this.busquedaCultivos.trim()) || item.nombreFinca.toLowerCase().includes(this.busquedaCultivos.trim()) || item.nombreGenero.toLowerCase().includes(this.busquedaCultivos.trim()) || item.nombreVariedad.toLowerCase().includes(this.busquedaCultivos.trim()));

  }
  contarSeleccionados() {
    this.idsCultivosSeleccionados = [];
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    this.contadorCheckbox = 0;
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;
      if (checkbox.checked) {
        this.contadorCheckbox++;

        this.idsCultivosSeleccionados.push(Number(checkbox.value));
        console.log(this.idsCultivosSeleccionados);
      }

    }


    return this.contadorCheckbox;
  }

  ninguno() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');

    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;
      if (checkbox.checked) {
        checkbox.checked = false;
      }
    }
    this.contadorCheckbox = 0;
  }

  todos() {
    this.contadorCheckbox = 0;
    this.idsCultivosSeleccionados = this.idCultivoFechaValida;

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (let i = 0; i < checkboxes.length; i++) {
      const checkbox = checkboxes[i] as HTMLInputElement;
      checkbox.checked = true;
      this.contadorCheckbox++;
    }

  }

  borrar(name: string) {
    const variables = this.variables.filter(item => item.name == name);
    for (let i = 0; i < variables.length; i++) {
      this.variablesService.delete(variables[i].id).subscribe(
        (data) => {
          console.log(data);
          this.ajustarKilosBorrar(variables[i].id, data.valor);

        }
      );
    }

  }

  ajustarKilosBorrar(id: number, valor: number) {
    const variab = this.variablesFiltros.find(item => item.id == id);
    const variablesProduccion = this.variables.filter(item => item.name == variab?.name);

    this.loading = true; // Mostrar spinner

    let totalOperaciones = 0;
    let operacionesCompletadas = 0;

    // Contar cuántas operaciones se van a realizar
    for (let i = 0; i < this.producciones.length; i++) {
      const encontrado = variablesProduccion.find(item => item.idCultivo == this.producciones[i].cultiveId);
      if (encontrado !== undefined) {
        totalOperaciones++;
      }
    }
    this.showDeleteModal = false;

    if (valor == 0) {

      this.loading = false;

      return;
    }
    // Ejecutar las operaciones
    for (let i = 0; i < this.producciones.length; i++) {
      const encontrado = variablesProduccion.find(item => item.idCultivo == this.producciones[i].cultiveId);

      if (encontrado !== undefined) {
        this.productionService.updatePatch(
          this.producciones[i].id,
          Number(this.producciones[i].kilosAjustados.trim().replace(',', '.')) / valor
        ).subscribe(
          (data) => {
            console.log(data);
            operacionesCompletadas++;

            // Verificar si ya terminaron todas
            if (operacionesCompletadas === totalOperaciones) {
              this.loading = false; // Ocultar spinner
              window.location.reload();

            }
          },
          (error) => {
            console.log(error);
            operacionesCompletadas++;

            // Verificar si ya terminaron todas (incluso con error)
            if (operacionesCompletadas === totalOperaciones) {
              this.loading = false; // Ocultar spinner
              // Opcional: mostrar mensaje de error
            }
          }
        );
      }
    }

  }

  calcularVariablesFiltros() {//Actaulizar dinamicamente el filtro de las variables para la vista del usuario del post,delete..etc
    for (let i = 0; i < this.variables.length; i++) {
      const encontrado = this.variablesFiltros.find(item => item.name == this.variables[i].name);
      if (encontrado == undefined) {
        this.variablesFiltros.push(this.variables[i]);
      }
    }


  }
  calcularPorcentaje(evento: Event, i: number) {
    let slider = evento.target as HTMLInputElement;
    this.variablesFiltros[i].valor = Number(slider.value) / 100;

  }

  cerrarDeleteModal() {
    this.showDeleteModal = false;
  }

  abrirDeleteModal(name: string) {
    this.showDeleteModal = true;
    this.nombreVariableBorrar = name;
  }

  cultivosAfectados(i: number) {
    this.cultivosAsociados=[];

    const encontrado = this.variables.filter(item => item.name == this.variablesFiltros[i].name);
    console.log(encontrado);
    if (encontrado !== undefined) {
      for (let i = 0; i < encontrado.length; i++) {
        const cultivo = this.cultivos.find(item => item.id == encontrado[i].idCultivo);
        if (cultivo !== undefined) {
          this.cultivosAsociados.push(cultivo);
        }
      }
    }
  }

  toggle(index: number) {
    if (this.activeIndex === index) {
      this.activeIndex = null; // Cierra si está abierto
    } else {
      this.activeIndex = index; // Abre y cierra el anterior
      this.cultivosAfectados(index); // actualiza datos si es necesario
    }
  }

  cantidadCultivos(i:number){

      const encontrado = this.variables.filter(item => item.name == this.variablesFiltros[i].name);
    console.log(encontrado);
    if (encontrado !== undefined) {
      return encontrado.length;
    }
    return 0;

  }

}
