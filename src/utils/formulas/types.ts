export type FormulaFieldName = 'cantidad' | 'longitud_area' | 'ancho_empalme' | 'altura_gancho' | 'nro_veces' | 'diametro';

export interface IFormulaHandler {
    id: string;
    
    /**
     * Define si un campo de la UI debe estar bloqueado (o mostrar N/A)
     */
    isFieldLocked(fieldName: FormulaFieldName, metadata?: any): boolean;

    /**
     * Lógica matemática de cálculo del parcial
     */
    calcularParcial(data: {
        cantidad?: number | "";
        longitud?: number | "";
        ancho?: number | "";
        altura?: number | "";
        diametro?: string;
        hvacFactor?: number | null;
        hvacItemType?: string | null;
    }): number;

    /**
     * Etiqueta amigable para el campo (ej: "Largo" vs "Long. Recta")
     */
    getFieldLabel(fieldName: FormulaFieldName, metadata?: any): string;
}
