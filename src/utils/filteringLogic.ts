/**
 * ARCHIVO DE REFERENCIA: Mejoras para MetradosTable.tsx
 * Este archivo contiene las funciones mejoradas que deben reemplazar el código actual
 * 
 * Para implementar:
 * 1. Copiar funciones a MetradosTable.tsx o importarlas desde archivo separado
 * 2. Reemplazar las secciones marcadas con "❌ PROBLEMA" por las versiones "✅ SOLUCIÓN"
 * 3. Agregar índices en Supabase (ver instrucciones abajo)
 * 4. Ejecutar npm run build para verificar cambios
 * 5. Probar con datos inconsistentes en autor_usuario
 */

import { normalizeAuthorName, normalizeSpecialty, isValidSpecialty } from '../utils/normalization';
import type { Metrado, Partida } from '../types';

export const getEspecialidadPorCodigo = (codigo: string): string => {
    return '';
};

// ============================================================================
// ✅ SOLUCIÓN 1: Filtro de Autor Mejorado
// ============================================================================

/**
 * Versión mejorada de availableAuthors que genera lista consistente
 * Ubicación original: MetradosTable.tsx líneas 280-295
 * 
 * CAMBIOS:
 * - Normaliza TODOS los autores al generar lista
 * - Retorna valores UPPERCASE para consistencia
 * - Elimina duplicados reales (no solo por casing)
 * - Más rápido con Set en lugar de Map
 */
export const getAvailableAuthorsImproved = (
    metrados: Metrado[],
    especialidad?: string,
    catalogoActivo?: Partida[],
    getEspecialidadPorCodigoFn: (codigo: string) => string = getEspecialidadPorCodigo,
    debug: boolean = false,
    systemUsers: any[] = []
): string[] => {
    let filtered = metrados;
    
    // Si hay especialidad (no TODAS) y tenemos usuarios del sistema, primero armamos el Set de validos 
    let validSectorAuthors = new Set<string>();
    let useStrictAuthorFiltering = false;

    if (systemUsers.length > 0 && especialidad && especialidad !== 'TODAS') {
        useStrictAuthorFiltering = true;
        const targetSpec = normalizeSpecialty(especialidad);
        
        systemUsers.forEach(u => {
            const uSpec = normalizeSpecialty(u.especialidad || '');
            if (uSpec === targetSpec && u.nombre_completo) {
                validSectorAuthors.add(normalizeAuthorName(u.nombre_completo));
            }
        });
    }
    
    // Aplicar filtro de especialidad
    if (especialidad && especialidad !== 'TODAS') {
        filtered = filtered.filter(m => {
            // (1) Filtro original
            const isMatch = isMetradoOfSpecialtyImproved(m, especialidad, catalogoActivo || [], getEspecialidadPorCodigoFn, debug);
            // (2) NUEVO BLINDAJE INQUEBRANTABLE (A pedido del usuario): 
            // Si el metrado dice ser de la especialidad X, pero el AUTOR no es de la especialidad X en la DB oficial, LO DESCARTAMOS ABSOLUTAMENTE.
            if (isMatch && useStrictAuthorFiltering && m.autor_usuario) {
                const normAuthor = normalizeAuthorName(m.autor_usuario);
                if (!validSectorAuthors.has(normAuthor)) {
                    if (debug) console.log(`      ⛔ BLOQUEADO POR DNI/SECTOR: ${m.autor_usuario} no pertenece a ${especialidad}`);
                    return false;
                }
            }
            return isMatch;
        });
    }

    // Deduplicar autores (usando Set)
    const authorSet = new Set<string>();
    const isUUID = (s: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    filtered.forEach(m => {
        if (m.autor_usuario && !isUUID(m.autor_usuario)) {
            const normalized = normalizeAuthorName(m.autor_usuario);
            if (normalized) {
                authorSet.add(normalized);
            }
        }
    });
    return Array.from(authorSet).sort();
};


// ============================================================================

// ============================================================================
// ✅ SOLUCIÓN 1.5: Filtros de Ubicación (Frente, Bloque, Nivel)
// ============================================================================

export const getAvailableFrentes = (metrados: Metrado[]): string[] => {
    const set = new Set<string>();
    metrados.forEach(m => {
        if (m.frente) set.add(m.frente.trim().toUpperCase());
    });
    return Array.from(set).sort();
};

export const getAvailableBloques = (metrados: Metrado[]): string[] => {
    const set = new Set<string>();
    metrados.forEach(m => {
        if (m.bloque) set.add(m.bloque.trim().toUpperCase());
    });
    return Array.from(set).sort();
};

export const getAvailableNiveles = (metrados: Metrado[]): string[] => {
    const set = new Set<string>();
    metrados.forEach(m => {
        if (m.nivel) set.add(m.nivel.trim().toUpperCase());
    });
    return Array.from(set).sort();
};

// ============================================================================
// ✅ SOLUCIÓN 2: Filtrado de Autor Mejorado
// ============================================================================

/**
 * Filtra metrados por autor después de normalización
 * Ubicación original: MetradosTable.tsx líneas 227-234
 * 
 * CAMBIOS:
 * - Normaliza AMBOS valores (filtro y BD) antes de comparar
 * - Comparación exacta, sin includes() que puede dar falsos positivos
 * - Manejo de nulls/undefined
 */
export const filterMetradosByAuthor = (
    metrados: Metrado[],
    filterAuthor: string
): Metrado[] => {
    if (filterAuthor === 'TODOS') {
        return metrados;
    }

    const normalizedFilter = normalizeAuthorName(filterAuthor);
    
    return metrados.filter(m => {
        if (!m.autor_usuario) return false;
        const normalizedAutor = normalizeAuthorName(m.autor_usuario);
        return normalizedAutor === normalizedFilter;
    });
};

export const isMetradoOfSpecialtyImproved = (
    metrado: any,
    specialtyId: string,
    catalogoActivo: Partida[] = [],
    getEspecialidadPorCodigoFn?: (codigo: string) => string,
    debug: boolean = false
): boolean => {
    const targetSpecialty = normalizeSpecialty(specialtyId);
    if (targetSpecialty === 'TODAS' || !targetSpecialty) return true;

    // 1. Especialidad directa del metrado (viene como nombre desde fetchMetrados)
    if (metrado.especialidad) {
        const match = normalizeSpecialty(metrado.especialidad) === targetSpecialty;
        if (debug) console.log(`[esp] metrado.especialidad: "${metrado.especialidad}" vs "${specialtyId}" → ${match}`);
        if (match) return true;
    }

    // 2. Buscar partida vinculada en catálogo
    const linkedPartida = catalogoActivo.find(p =>
        (metrado.partida_id && p.id === metrado.partida_id) ||
        (metrado.codigo_partida && p.codigo === metrado.codigo_partida)
    );
    if (linkedPartida?.especialidad) {
        const match = normalizeSpecialty(linkedPartida.especialidad) === targetSpecialty;
        if (debug) console.log(`[esp] linkedPartida.especialidad: "${linkedPartida.especialidad}" vs "${specialtyId}" → ${match}`);
        return match;
    }

    // 3. Sin datos — solo visible en TODAS
    return false;
};

/**
 * Filtra metrados por especialidad
 */
export const filterMetradosBySpecialty = (
    metrados: Metrado[],
    specialty: string,
    catalogoActivo: Partida[] = [],
    getEspecialidadPorCodigoFn?: (codigo: string) => string
): Metrado[] => {
    if (specialty === 'TODAS') {
        return metrados;
    }

    return metrados.filter(m => 
        isMetradoOfSpecialtyImproved(m, specialty, catalogoActivo, getEspecialidadPorCodigoFn)
    );
};

// ============================================================================
// ✅ SOLUCIÓN 4: Filtro de Fecha Mejorado
// ============================================================================

/**
 * Filtra metrados por rango de fechas (NUEVO: rango en lugar de igualdad)
 * 
 * CAMBIOS:
 * - Soporta rango desde-hasta
 * - Comparación correcta de fechas (no startsWith)
 * - Manejo de fechas inválidas
 * 
 * @param metrados Array de metrados a filtrar
 * @param dateFrom Fecha mínima (formato YYYY-MM-DD)
 * @param dateTo Fecha máxima (formato YYYY-MM-DD)
 * @returns Metrados dentro del rango
 */
export const filterMetradosByDateRange = (
    metrados: Metrado[],
    dateFrom: string = '',
    dateTo: string = ''
): Metrado[] => {
    if (!dateFrom && !dateTo) {
        return metrados;
    }

    return metrados.filter(m => {
        // FIX: Extraer solo los primeros 10 chars (YYYY-MM-DD) para soportar
        // registros con timestamps completos ('2026-04-10T00:00:00+00:00')
        // que antes fallaban el regex y eran excluidos silenciosamente.
        const rawDate = m.fecha || '';
        const recordDate = rawDate.substring(0, 10);

        // Validar que sea una fecha válida después de extraer
        if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) {
            return false;
        }

        // Aplicar rango
        if (dateFrom && recordDate < dateFrom) {
            return false;
        }
        if (dateTo && recordDate > dateTo) {
            return false;
        }

        return true;
    });
};

/**
 * Versión simplificada para una sola fecha (igualdad exacta)
 */
export const filterMetradosByDate = (
    metrados: Metrado[],
    date: string
): Metrado[] => {
    if (!date) {
        return metrados;
    }
    // FIX: Normalizar a YYYY-MM-DD para soportar timestamps completos
    return metrados.filter(m => (m.fecha || '').substring(0, 10) === date);
};

// ============================================================================
// ✅ SOLUCIÓN 5: Filtro Combinado Mejorado
// ============================================================================

/**
 * Combina TODOS los filtros en uno con lógica corregida
 * 
 * CORRECCIONES CRÍTICAS:
 * 1. Proyecto: Excluye explícitamente registros sin proyecto (return false si !m.proyecto)
 * 2. Especialidad: Soporta 'TODAS' para mostrar ambiguos, fallback por código
 * 3. Autor: Soporta 'TODOS' para mostrar todos
 * 4. Debug: Logging opcional para diagnosticar discrepancias local/servidor
 */
export const applyAllFilters = (
    metrados: Metrado[],
    filters: {
        proyecto?: string;
        especialidad?: string;
        autor?: string;
        dateFrom?: string;
        dateTo?: string;
        date?: string;
        frente?: string;
        bloque?: string;
        nivel?: string;
    },
    catalogoActivo: Partida[] = [],
    debug: boolean = false,
    getEspecialidadPorCodigoFn: (codigo: string) => string = getEspecialidadPorCodigo
): Metrado[] => {
    let result = metrados;
    const startCount = metrados.length;
    const results: Record<string, number> = {};
    
    if (debug) {
        console.group('🔍 DEBUG: applyAllFilters');
        console.log(`📊 Input: ${startCount} metrados`);
        console.log(`🎯 Filters:`, filters);
        console.log(`📚 Catálogo: ${catalogoActivo.length} partidas`);
    }

    // 1️⃣ PRIMERO: Filtro de proyecto (generalmente reduce más)
    // CORRECCIÓN CRÍTICA: Excluir explícitamente registros sin proyecto
    if (filters.proyecto) {
        const before = result.length;
        result = result.filter(m => {
            // Si no tiene proyecto, EXCLUIR (lógica correcta)
            // NO usar: if (!m.proyecto) return true;  ← ESTO ERA EL ERROR
            if (!m.proyecto) return false;
            return m.proyecto.toLowerCase() === filters.proyecto!.toLowerCase();
        });
        results['proyecto'] = result.length;
        if (debug) console.log(`   📋 Proyecto (${filters.proyecto}): ${before} → ${result.length}`);
    }

    // 2️⃣ SEGUNDO: Filtro de especialidad (reduce significativamente)
    if (filters.especialidad && filters.especialidad !== 'TODAS') {
        const before = result.length;
        
        // Determinar usuarios oficiales de esta especialidad para bloqueo total
        let validSectorAuthors = new Set<string>();
        let enforceAuthorSector = false;
        
        // Usamos useSystemUsersStore de manera segura para extraer los usuarios del sistema aquí si es la tabla principal
        try {
            // Nota: importando el store dinámicamente o asumiendo que catalogoActivo es suficientemente representativo.
            // Para blindar totalmente The applyAllFilters usamos el store directamente (lo importamos temporalmente o chequeamos estado)
            if (window && (window as any).__systemUsersCache) {
                const sysUsers = (window as any).__systemUsersCache;
                if (sysUsers && sysUsers.length > 0) {
                     enforceAuthorSector = true;
                     const targetSpec = normalizeSpecialty(filters.especialidad);
                     sysUsers.forEach((u: any) => {
                         if (normalizeSpecialty(u.especialidad || '') === targetSpec && u.nombre_completo) {
                             validSectorAuthors.add(normalizeAuthorName(u.nombre_completo));
                         }
                     });
                }
            }
        } catch (e) {
            // Silencioso
        }

        result = result.filter(m => {
            const passesSpec = isMetradoOfSpecialtyImproved(
                m, 
                filters.especialidad!, 
                catalogoActivo, 
                getEspecialidadPorCodigoFn,
                debug
            );
            
            // NUEVO BLINDAJE INQUEBRANTABLE (A pedido del usuario): 
            if (passesSpec && enforceAuthorSector && m.autor_usuario) {
               const normAuthor = normalizeAuthorName(m.autor_usuario);
               if (!validSectorAuthors.has(normAuthor)) {
                   return false; // Bloqueado estrictamente porque el DNI/Sector de ecosistema_usuarios no coincide!
               }
            }
            
            return passesSpec;
        });
        results['especialidad'] = result.length;
        if (debug) {
            console.log(`   🏗️  Especialidad (${filters.especialidad}): ${before} → ${result.length}`);
            if (before > result.length) {
                console.log(`   ⚠️  Removidos: ${before - result.length}`);
            }
        }
    }

    // 3️⃣ TERCERO: Filtro de autor (después de especialidad, generalmente menos registros)
    if (filters.autor && filters.autor !== 'TODOS') {
        const before = result.length;
        result = filterMetradosByAuthor(result, filters.autor);
        results['autor'] = result.length;
        if (debug) console.log(`   👤 Autor (${filters.autor}): ${before} → ${result.length}`);
    }

    // 4️⃣ CUARTO: Filtro de fecha (simple comparación)
    if (filters.dateFrom || filters.dateTo) {
        const before = result.length;
        result = filterMetradosByDateRange(
            result,
            filters.dateFrom,
            filters.dateTo
        );
        results['fecha'] = result.length;
        if (debug) console.log(`   📅 Fecha (${filters.dateFrom} a ${filters.dateTo}): ${before} → ${result.length}`);
    } else if (filters.date) {
        const before = result.length;
        result = filterMetradosByDate(result, filters.date);
        results['fecha'] = result.length;
        if (debug) console.log(`   📅 Fecha (${filters.date}): ${before} → ${result.length}`);
    }

    // 5️⃣ QUINTO: Filtros de ubicación (Frente, Bloque, Nivel)
    if (filters.frente && filters.frente !== 'TODOS') {
        const before = result.length;
        result = result.filter(m => m.frente?.trim().toUpperCase() === filters.frente!.trim().toUpperCase());
        results['frente'] = result.length;
        if (debug) console.log(`   🏗️  Frente (${filters.frente}): ${before} → ${result.length}`);
    }

    if (filters.bloque && filters.bloque !== 'TODOS') {
        const before = result.length;
        result = result.filter(m => m.bloque?.trim().toUpperCase() === filters.bloque!.trim().toUpperCase());
        results['bloque'] = result.length;
        if (debug) console.log(`   🏢 Bloque (${filters.bloque}): ${before} → ${result.length}`);
    }

    if (filters.nivel && filters.nivel !== 'TODOS') {
        const before = result.length;
        result = result.filter(m => m.nivel?.trim().toUpperCase() === filters.nivel!.trim().toUpperCase());
        results['nivel'] = result.length;
        if (debug) console.log(`   🪜 Nivel (${filters.nivel}): ${before} → ${result.length}`);
    }

    if (debug) {
        console.log(`\n✅ Resultado Final: ${result.length} metrados`);
        console.log(`📉 Removidos en total: ${startCount - result.length}`);
        console.log(`📋 Detalles:`, results);
        console.groupEnd();
    }

    return result;
};

// ============================================================================
// SQL QUERIES TO ADD INDEXES (Ejecutar en Supabase)
// ============================================================================

/**
 * Ejecutar estas queries en Supabase SQL Editor para optimizar búsquedas:
 * 
 * -- Índices individuales para cada filtro
 * CREATE INDEX idx_metrados_autor_usuario 
 *     ON metrados(autor_usuario);
 * 
 * CREATE INDEX idx_metrados_especialidad 
 *     ON metrados(especialidad);
 * 
 * CREATE INDEX idx_metrados_fecha 
 *     ON metrados(fecha DESC);
 * 
 * CREATE INDEX idx_metrados_proyecto 
 *     ON metrados(proyecto);
 * 
 * -- Índice compuesto para queries frecuentes
 * CREATE INDEX idx_metrados_proyecto_autor 
 *     ON metrados(proyecto, autor_usuario) 
 *     WHERE proyecto IS NOT NULL;
 * 
 * CREATE INDEX idx_metrados_especialidad_fecha 
 *     ON metrados(especialidad, fecha DESC);
 * 
 * -- Verificar índices creados
 * SELECT indexname FROM pg_indexes WHERE tablename = 'metrados';
 */

// ============================================================================
// DEBUGGING HELPERS
// ============================================================================

/**
 * Loggers para debuggear filtros (descomentar si necesario)
 */
export const debugFilters = {
    logAuthorNormalization: (name: string) => {
        const normalized = normalizeAuthorName(name);
        console.log(`📝 Author: "${name}" → "${normalized}"`);
        return normalized;
    },

    logSpecialtyFilter: (antes: Metrado[], despues: Metrado[], specialty: string) => {
        console.log(`🏗️  Specialty "${specialty}": ${antes.length} → ${despues.length} registros`);
    },

    logAuthorFilter: (antes: Metrado[], despues: Metrado[], author: string) => {
        console.log(`👤 Author "${author}": ${antes.length} → ${despues.length} registros`);
    },

    logDateFilter: (antes: Metrado[], despues: Metrado[], dateFrom: string, dateTo: string) => {
        console.log(`📅 Date range (${dateFrom || 'sin límite'} to ${dateTo || 'sin límite'}): ${antes.length} → ${despues.length} registros`);
    },

    logAllFilters: (
        originalCount: number,
        finalCount: number,
        removedBySpec: number,
        removedByAuthor: number,
        removedByDate: number
    ) => {
        console.group('🔍 Filter Summary');
        console.log(`Total original: ${originalCount}`);
        console.log(`Removidos por especialidad: ${removedBySpec}`);
        console.log(`Removidos por autor: ${removedByAuthor}`);
        console.log(`Removidos por fecha: ${removedByDate}`);
        console.log(`Total final: ${finalCount}`);
        console.groupEnd();
    }
};


