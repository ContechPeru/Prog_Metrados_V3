import { Partida } from '../types';
import { formulaRegistry } from './formulas/registry';

export const PESOS_ACERO: Record<string, number> = {
    "1/4": 0.254,
    "3/8": 0.560,
    "1/2": 0.994,
    "5/8": 1.550,
    "3/4": 2.240,
    "1": 3.970
};

export const isAcero = (partida: Partida | null | undefined): boolean => {
    if (!partida) return false;
    return partida.tipo_metrado === 'ACERO';
};

export const isInstalacion = (partida: Partida | null | undefined): boolean => {
    if (!partida) return false;
    // Las instalaciones ahora se manejan por tipo_metrado explicitamente en Supabase si requieren lógica especial
    return false; 
};

export function calcularParcial(data: {
    partida: Partida | null | undefined;
    cantidad: number | "";
    longitud: number | "";
    ancho: number | "";
    altura: number | "";
    diametro?: string;
    hvacFactor?: number | null;
    hvacItemType?: string | null;
}): number {
    const { partida } = data;
    const strategy = formulaRegistry.get(partida?.tipo_metrado);
    return strategy.calcularParcial(data);
}

/**
 * Calcula el total a partir del parcial y número de veces
 */
export function calcularTotal(parcial: number, nroVeces: number | ""): number {
    const v = nroVeces !== "" ? Number(nroVeces) : 1;
    return parcial * v;
}
