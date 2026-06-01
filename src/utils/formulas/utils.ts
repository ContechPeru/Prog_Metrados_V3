/**
 * Convierte de manera segura cualquier valor (string, number, vacío) a un número válido.
 * Ideal para procesar inputs controlados de tablas (que devuelven un string de e.target.value) 
 * y que necesitan actuar en multiplicaciones/sumas matemáticas.
 * 
 * @param val El valor entrante (texto, número, null, etc)
 * @param fallback Valor de respaldo si la evaluación falla o es vacía (ej. 1 para multiplicaciones, 0 para sumas)
 * @returns number
 */
export const parseNumericValue = (val: any, fallback: number = 1): number => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'number') {
        return isNaN(val) ? fallback : val;
    }
    if (typeof val === 'string') {
        const tr = val.trim();
        if (tr === '') return fallback;
        const parsed = Number(tr);
        return isNaN(parsed) ? fallback : parsed;
    }
    return fallback;
};
