// ControlStockDetails.types.ts

export interface ControlStockDetailsDto {
  id: number;
  numBultos: number;
  codigoPartida: string;
  idGenero: number;
  categoria: string;
  idControl: number;
}

export interface CreateStockDetailsDto {
  NumBultos: number;
  CodigoPartida: number;
  IdGenero: number;
  Categoria: string;
  idControl: number;
}

export interface PutIdPartidaDto{
  idPartida: number
}