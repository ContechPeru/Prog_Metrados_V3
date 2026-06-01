import { IFormulaHandler, FormulaFieldName } from '../types';
import { parseNumericValue } from '../utils';

export class InstalacionesStrategy implements IFormulaHandler {
    id = "INSTALACION";

    isFieldLocked(_fieldName: FormulaFieldName): boolean {
        // En instalaciones eléctricas y sanitarias TODO está desbloqueado
        // para dar máxima flexibilidad en usar 'VECES' o metros lineales.
        return false; 
    }

    getFieldLabel(fieldName: FormulaFieldName): string {
        switch (fieldName) {
            case 'nro_veces': return 'N° VECES / PUNTOS';
            case 'longitud_area': return 'LONG. / CABLE';
            case 'ancho_empalme': return 'ANCHO';
            case 'altura_gancho': return 'ALTURA';
            default: return fieldName.toUpperCase();
        }
    }

    calcularParcial(data: any): number {
        const { cantidad, longitud, ancho, altura } = data;
        
        // Si todo está vacío, es 0
        if (cantidad === "" && longitud === "" && ancho === "" && altura === "") return 0;
        
        const c = parseNumericValue(cantidad, 1);
        const l = parseNumericValue(longitud, 1);
        const a = parseNumericValue(ancho, 1);
        const h = parseNumericValue(altura, 1);
        
        return c * l * a * h;
    }
}
