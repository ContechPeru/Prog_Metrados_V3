import { IFormulaHandler, FormulaFieldName } from '../types';
import { parseNumericValue } from '../utils';

export const PESOS_ACERO: Record<string, number> = {
    "1/4": 0.254,
    "3/8": 0.560,
    "1/2": 0.994,
    "5/8": 1.550,
    "3/4": 2.240,
    "1": 3.970
};

export class AceroStrategy implements IFormulaHandler {
    id = "ACERO";

    isFieldLocked(fieldName: FormulaFieldName, metadata?: { isLiquidaciones?: boolean }): boolean {
        if (fieldName === 'ancho_empalme') {
            // Para usuarios de LIQUIDACIONES, el empalme está HABILITADO
            // Para el resto, sigue siendo N/A (bloqueado)
            return !metadata?.isLiquidaciones;
        }
        return false;
    }

    getFieldLabel(fieldName: FormulaFieldName, metadata?: { isLiquidaciones?: boolean }): string {
        switch (fieldName) {
            case 'longitud_area': return 'LONG. RECTA';
            case 'altura_gancho': return 'GANCHOS';
            case 'ancho_empalme':
                // Mostrar label descriptivo cuando está habilitado
                return metadata?.isLiquidaciones ? 'EMPALME' : 'N/A';
            default: return fieldName.toUpperCase();
        }
    }

    calcularParcial(data: any): number {
        const { cantidad, longitud, ancho, altura, diametro } = data;
        
        const c = parseNumericValue(cantidad, 0);
        const longitudRecta = parseNumericValue(longitud, 0);
        const longitudEmpalme = parseNumericValue(ancho, 0); // Empalme (solo LIQUIDACIONES)
        const longitudGancho = parseNumericValue(altura, 0);
        
        // Limpiar diámetro para buscar en tabla
        const d = (diametro || '1/2"').replace('"', '').trim();
        const factorKg = PESOS_ACERO[d] || 0;
        
        // Longitud total = Recta + Empalme (si aplica) + Gancho
        const longitudTotal = longitudRecta + longitudEmpalme + longitudGancho;

        if (c === 0 && longitudTotal === 0) return 0;
        return c * longitudTotal * factorKg;
    }
}
