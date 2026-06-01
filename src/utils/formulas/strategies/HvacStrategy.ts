import { IFormulaHandler, FormulaFieldName } from '../types';
import { parseNumericValue } from '../utils';

export class HvacStrategy implements IFormulaHandler {
    id = "HVAC";

    /**
     * HVAC bloquea el Largo si es un accesorio (TEE, REDUCCION) 
     * pero lo habilita si es DUCTO o CODO.
     */
    isFieldLocked(fieldName: FormulaFieldName, metadata?: { hvacItemType?: string }): boolean {
        if (fieldName === 'longitud_area') {
            const type = metadata?.hvacItemType || '';
            // Solo Ductos y Codos usan Longitud en HVAC
            return !(type === 'DUCTO' || type === 'CODO');
        }
        return false;
    }

    getFieldLabel(fieldName: FormulaFieldName): string {
        switch (fieldName) {
            case 'longitud_area': return 'LONGITUD';
            case 'ancho_empalme': return 'ANCHO';
            case 'altura_gancho': return 'ALTO';
            default: return fieldName.toUpperCase();
        }
    }

    calcularParcial(data: any): number {
        const { cantidad, longitud, ancho, altura, hvacFactor, hvacItemType } = data;
        
        const f = hvacFactor !== undefined && hvacFactor !== null ? Number(hvacFactor) : 1;
        const c = parseNumericValue(cantidad, 1);
        
        // La longitud solo cuenta si es Ducto o Codo
        const usesLong = (hvacItemType === 'CODO' || hvacItemType === 'DUCTO');
        const l = usesLong ? parseNumericValue(longitud, 1) : 1;
        
        const a = parseNumericValue(ancho, 1);
        const h = parseNumericValue(altura, 1);
        
        return c * l * a * h * f;
    }
}
