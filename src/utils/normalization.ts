/**
 * Funciones de normalización para datos inconsistentes
 * Usadas para filtrado y comparación de valores en toda la aplicación
 */

/**
 * Normaliza nombres de autores/usuarios a un formato consistente
 * - Reemplaza NBSP (U+00A0) con espacios
 * - Colapsa espacios múltiples a uno solo
 * - Trimea inicio/final
 * - Convierte a UPPERCASE para comparaciones
 * 
 * @param name Nombre a normalizar
 * @returns Nombre normalizado en UPPERCASE
 * 
 * @example
 * normalizeAuthorName("juan garcia") → "JUAN GARCIA"
 * normalizeAuthorName(" JUAN\u00a0GARCIA ") → "JUAN GARCIA"
 * normalizeAuthorName("juan  garcia") → "JUAN GARCIA"
 */
export const normalizeAuthorName = (name: string): string => {
    return (name || '')
        .toString()
        .normalize("NFD")               // Descomponer caracteres combinados (acentos)
        .replace(/[\u0300-\u036f]/g, "") // Eliminar los acentos
        .replace(/\u00a0/g, ' ')         // NBSP → espacio regular
        .replace(/\s+/g, ' ')             // Múltiples espacios → 1 espacio
        .trim()                           // Eliminar espacios inicio/fin
        .toUpperCase();                   // Convertir a UPPERCASE
};

/**
 * Normaliza valores de especialidad para comparación
 * @param specialty Especialidad a normalizar
 * @returns Especialidad normalizada
 */
export const normalizeSpecialty = (specialty: string): string => {
    if (!specialty) return '';
    return specialty
        .toString()
        .normalize("NFD")               // Descomponer caracteres combinados (acentos)
        .replace(/[\u0300-\u036f]/g, "") // Eliminar los acentos
        .trim()
        .toUpperCase();
};

/**
 * Normaliza códigos de partida
 * @param codigo Código a normalizar
 * @returns Código normalizado
 */
export const normalizePartidaCode = (codigo: string): string => {
    if (!codigo) return '';
    return codigo
        .toString()
        .trim()
        .toUpperCase();
};

/**
 * Valida si una especialidad es válida para filtrado
 * Excluye valores genéricos como "TODAS", "GENERAL", "HOSPITAL", "CONTINGENCIA"
 * 
 * @param specialty Especialidad a validar
 * @returns true si es una especialidad válida/específica
 */
export const isValidSpecialty = (specialty: string): boolean => {
    if (!specialty) return false;
    
    const normalized = normalizeSpecialty(specialty);
    const invalidSpecialties = ['TODAS', 'GENERAL', 'HOSPITAL', 'CONTINGENCIA', ''];
    
    return !invalidSpecialties.includes(normalized);
};

/**
 * Compara dos nombres para igualdad después de normalización
 * @param name1 Primer nombre
 * @param name2 Segundo nombre
 * @returns true si son iguales después de normalización
 */
export const autorNamesAreEqual = (name1: string, name2: string): boolean => {
    return normalizeAuthorName(name1) === normalizeAuthorName(name2);
};

/**
 * Compara dos especialidades para igualdad después de normalización
 * @param specialty1 Primera especialidad
 * @param specialty2 Segunda especialidad
 * @returns true si son iguales después de normalización
 */
export const specialtiesAreEqual = (specialty1: string, specialty2: string): boolean => {
    return normalizeSpecialty(specialty1) === normalizeSpecialty(specialty2);
};

/**
 * Devuelve el nombre canonizado de una especialidad a partir de código o nombre.
 * Si el valor ya es el nombre correcto, lo retorna tal cual.
 * Si el valor es un código válido y existe en la lista de especialidades, retorna el nombre asociado.
 */
export const getCanonicalSpecialtyName = (
    specialty: string,
    especialidades: { id: string; codigo: string; nombre: string }[] = []
): string => {
    const normalized = normalizeSpecialty(specialty);
    if (!normalized) return '';
    if (normalized === 'TODAS' || normalized === 'TODOS') return 'TODAS';

    const matchByNombre = especialidades.find(e => normalizeSpecialty(e.nombre) === normalized);
    if (matchByNombre) return matchByNombre.nombre;

    const matchByCodigo = especialidades.find(e => normalizeSpecialty(e.codigo) === normalized);
    if (matchByCodigo) return matchByCodigo.nombre;

    const codigoToNombre: Record<string, string> = {
        OP:   'OBRAS PROVISIONALES',
        EST:  'ESTRUCTURAS',
        ARQ:  'ARQUITECTURA',
        IISS: 'INSTALACIONES SANITARIAS',
        IIEE: 'INSTALACIONES ELECTRICAS',
        IIEM: 'INSTALACIONES ELECTROMECANICAS',
        TIC:  'INSTALACIONES DE COMUNICACIONES',
        GLP:  'INSTALACIONES DE GAS LICUADO DE PETROLEO',
        PMA:  'PLAN DE MANEJO AMBIENTAL',
    };

    return codigoToNombre[normalized] || specialty.trim().toUpperCase();
};

/**
 * Compara dos códigos de partida para igualdad
 * @param code1 Primer código
 * @param code2 Segundo código
 * @returns true si son iguales después de normalización
 */
export const partidaCodesAreEqual = (code1: string, code2: string): boolean => {
    return normalizePartidaCode(code1) === normalizePartidaCode(code2);
};
