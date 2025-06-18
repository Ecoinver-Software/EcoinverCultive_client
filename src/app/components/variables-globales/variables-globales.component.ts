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
  buscar: string = '';
  editModal: boolean = false;
  indice: number = 0;
  constructor(private productionService: CultiveProductionService, private variablesService: VariablesService, private cultiveService: CultivoService) {

  }
  ngOnInit(): void {
    this.productionService.getAllCultiveProductions().subscribe(
      (data) => {
        this.producciones = data;


        //Para coger aquellos cultivos cuya planidficación entra en la fecha de la creación de la variable.
        for (let i = 0; i < this.producciones.length; i++) {
          const encontrado = this.idCultivoFechaValida.find(item => item == this.producciones[i].cultiveId);
          if (encontrado == null) {
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
        console.log(this.variables);
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

  async crearVariable() {

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


    this.loading = true;
    try {
      // 1️⃣ CREAR TODAS las variables
      const promesasVariables = this.idsCultivosSeleccionados.map(idCultivo => {
        const variable: Variables = {
          id: 0,
          name: this.nombreVariable,
          idCultivo: idCultivo,
          fechaRegistro: new Date(),
          valor: this.valorRango / 100,
          categoria: 'global'
        };
        return this.variablesService.post(variable).toPromise();
      });

      const resultados = await Promise.all(promesasVariables);

      // 2️⃣ AJUSTAR TODOS los kilos
      const promesasKilos = resultados.map(data => {
        return this.ajustarKilos(data!.idCultivo, data!.valor);
      });

      await Promise.all(promesasKilos);

      // 3️⃣ TODO TERMINÓ ✅
      this.loading = false;
      this.message = 'Variable creada correctamente';
      this.showSuccessAlert = true;
      this.calcularVariablesFiltros();

    } catch (error) {
      console.log(error);
      this.loading = false;
      this.errorMessage = 'Error al procesar';
      this.showErrorAlert = true;
    }


  }

  cerrarErrorModal() {
    this.showErrorAlert = false;

  }

  ajustarKilos(idCultivo: number, valor: number): Promise<any> {
    const producciones = this.producciones.filter(item => item.cultiveId == idCultivo);

    if (producciones.length === 0) {
      return Promise.resolve(); // No hay nada que hacer
    }

    // Crear promesas para TODAS las actualizaciones
    const promesas = producciones.map(produccion => {
      const kilos = Number(produccion.kilosAjustados.trim().replace(',', '.')) * valor;
      return this.productionService.updatePatch(produccion.id, kilos).toPromise();
    });

    // Retornar Promise que espera a TODAS
    return Promise.all(promesas);
  }

  cerrarModal() {
    this.showSuccessAlert = false;
    window.location.reload();
  }

  cultivosValidos() {
    const fechaHoy = new Date();
    for (let i = 0; i < this.idCultivoFechaValida.length; i++) {
      this.cultiveService.getById(this.idCultivoFechaValida[i]).subscribe(
        (data) => {
          if (data.fechaFin) {
            if (new Date(data.fechaFin).getTime() <= fechaHoy.getTime()) {
              this.cultivos.push(data);
              this.cultivosFiltrados.push(data);
            }
          }


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
    if (this.producciones.length == 0) {
      this.loading = false;
      return;
    }
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

  calcularVariablesFiltros() {//Actualizar dinámicamente el filtro de las variables para la vista del usuario del post,delete..etc
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
    this.cultivosAsociados = [];

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

  cantidadCultivos(i: number) {

    const encontrado = this.variables.filter(item => item.name == this.variablesFiltros[i].name);

    if (encontrado !== undefined) {
      return encontrado.length;
    }

    return 0;

  }

  buscarVariables() {
    for (let i = 0; i < this.variables.length; i++) {
      const encontrado = this.variablesFiltros.find(item => item.name == this.variables[i].name);
      if (encontrado == undefined) {
        this.variablesFiltros.push(this.variables[i]);
      }
    }
    this.variablesFiltros = this.variablesFiltros.filter(item => item.name.toLowerCase().includes(this.buscar.trim().toLowerCase()));

  }

  abrirEditModal(i: number) {
    this.editModal = true;
    this.indice = i;
  }

  closeEditModal() {
    this.editModal = false;
  }

  async editarVariable(i: number) {
    this.editModal = false; // Cerrar el modal de edición

    const nombre = this.variablesFiltros[i].name;
    const nuevoValor = this.variablesFiltros[i].valor;
    const variablesConNombre = this.variables.filter(v => v.name === nombre);
    console.log(this.variables);

    // Tomar el valor original antes de modificar nada
    const valorOriginal = variablesConNombre[1]?.valor;
    //alert(valorOriginal);
    //alert(nuevoValor);
    console.log(variablesConNombre);
    if (valorOriginal === undefined) return;

    this.loading = true;
    try {
      // Actualizar todas las variables (PUT)
      const promesasPut = variablesConNombre.map(variable => {
        const factor = nuevoValor / valorOriginal;
        const variableActualizada: Variables = {
          ...variable,
          valor: nuevoValor,
          fechaRegistro: new Date(),
        };
        return this.variablesService.put(variable.id, variableActualizada).toPromise()
          .then(() => ({ idCultivo: variable.idCultivo, factor }));
      });

      const resultados = await Promise.all(promesasPut);

      // Ajustar kilos para cada cultivo afectado
      const promesasKilos = resultados.map(res =>
        this.ajustarKilosEditar(res.idCultivo, nuevoValor / valorOriginal)
      );
      await Promise.all(promesasKilos);

      this.loading = false;
      this.message = 'Variable editada correctamente';
      this.showSuccessAlert = true;
      this.calcularVariablesFiltros();
    } catch (error) {
      console.log(error);
      this.loading = false;
      this.errorMessage = 'Error al editar la variable';
      this.showErrorAlert = true;
    }
  }


  // Versión async de ajustarKilosEditar
  ajustarKilosEditar(idCultivo: number, factor: number): Promise<any> {

    const cultivosAfectados = this.producciones.filter(item => item.cultiveId == idCultivo);
    const promesas = cultivosAfectados.map(cultivo =>
      this.productionService.updatePatch(
        cultivo.id,
        Number(cultivo.kilosAjustados.trim().replace(',', '.')) * factor
      ).toPromise()
    );
    return Promise.all(promesas);
  }

  coeficientePromedio() {
    const suma = this.variables.reduce((a, b) => a + b.valor, 0);
    const promedio = suma / this.variables.length;
    if (!isNaN(promedio)) {
      return promedio.toFixed(2); // Retorna el promedio con 2 decimales
    }
    else {
      return 0;
    }

  }

}
