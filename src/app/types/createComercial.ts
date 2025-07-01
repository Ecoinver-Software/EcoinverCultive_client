export interface CreateComercial {
   
        clientCode:number;
        clientName:string;
        startDate:Date | undefined;
        endDate:  Date | undefined;
        idGenero:number;
        nombreGenero:string;
        nombreUsuario:string;
        kgs:number;
        kgsPlan:number;
        pendiente:number;
}
