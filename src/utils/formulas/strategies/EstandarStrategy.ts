import { IFormulaHandler, FormulaFieldName } from '../types';
import { parseNumericValue } from '../utils';

export class EstandarStrategy implements IFormulaHandler {
    id = "ESTANDAR";

    isFieldLocked(_fieldName: FormulaFieldName): boolean {
        return false; // Estándar tiene todo habilitado
    }

    getFieldLabel(fieldName: FormulaFieldName): string {
        switch (fieldName) {
            case 'longitud_area': return 'LARGO / ÁREA';
            case 'ancho_empalme': return 'ANCHO';
            case 'altura_gancho': return 'ALT./GAN.';
            default: return fieldName.toUpperCase();
        }
    }

    calcularParcial(data: any): number {
        const { cantidad, longitud, ancho, altura } = data;
        if (cantidad === "" && longitud === "" && ancho === "" && altura === "") return 0;
        
        const c = parseNumericValue(cantidad, 1);
        const l = parseNumericValue(longitud, 1);
        const a = parseNumericValue(ancho, 1);
        const h = parseNumericValue(altura, 1);
        
        return c * l * a * h;
    }
}
