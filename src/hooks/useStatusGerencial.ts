import { useMemo } from 'react';
import { useMetradosStore } from '../store/useMetradosStore';
import { getEspecialidadPorCodigo } from '../constants/especialidades';

// ─── Datos estáticos del Excel presupuestos_Especialidades_master.xlsx ───
// Orden exacto del Excel. GLP eliminado → incorporado en ELECTROMECÁNICAS.
export const ESPECIALIDADES_MASTER = [
  { n: 1,  key: 'OBRAS PROVISIONALES',      label: 'OBRAS PROVISIONALES',      ppto: 14510000.44,  anterior: 13601877.07 },
  { n: 2,  key: 'SEGURIDAD',                label: 'SEGURIDAD',                ppto:  7173314.90,  anterior:  4800986.23 },
  { n: 3,  key: 'ARQUEOLOGÍA',              label: 'ARQUEOLOGÍA',              ppto:   563409.36,  anterior:   402341.31 },
  { n: 4,  key: 'ESTRUCTURAS',              label: 'ESTRUCTURAS',              ppto: 32036050.65,  anterior: 25422335.27 },
  { n: 5,  key: 'ARQUITECTURA',             label: 'ARQUITECTURA',             ppto: 25470426.84,  anterior:  4648177.31 },
  { n: 6,  key: 'INSTALACIONES SANITARIAS', label: 'INSTALACIONES SANITARIAS', ppto:  4201123.34,  anterior:   623322.65 },
  { n: 7,  key: 'ELÉCTRICAS',              label: 'INSTALACIONES ELÉCTRICAS', ppto:  7849682.50,  anterior:   393216.05 },
  { n: 8,  key: 'ELECTROMECÁNICAS',        label: 'ELECTROMECÁNICAS',         ppto: 23918821.98,  anterior:  1070223.52 }, // GLP (165,130.31) absorbido
  { n: 9,  key: 'COMUNICACIONES',           label: 'COMUNICACIONES',           ppto: 15881266.98,  anterior:   800624.50 },
  { n: 10, key: 'PLAN DE MANEJO AMBIENTAL', label: 'PLAN DE MANEJO AMBIENTAL', ppto:  1525312.59,  anterior:   999324.00 },
  { n: 11, key: 'EQUIPAMIENTO BIOMÉDICO',   label: 'EQUIPAMIENTO BIOMÉDICO',   ppto: 0,            anterior: 0 },
];

export interface StatusGerencialRow {
  n: number;
  label: string;
  ppto: number;
  anterior: number;
  actual: number;
  acumulado: number;
  avancePct: number;
}

export interface StatusGerencialResult {
  rows: StatusGerencialRow[];
  totalPpto: number;
  totalAnterior: number;
  totalActual: number;
  totalAcumulado: number;
  totalAvancePct: number;
  metradosCount: number;
}

/**
 * Extrae la parte de fecha YYYY-MM-DD de un string ISO sin usar new Date(),
 * evitando el bug de timezone offset que desplaza días al mes anterior/siguiente.
 */
export const getDateParts = (fechaStr: string): { y: number; m: number; d: number } | null => {
  const dateOnly = (fechaStr ?? '').split('T')[0]; // "2026-04-15"
  const parts = dateOnly.split('-');
  if (parts.length < 3) return null;
  return { y: parseInt(parts[0], 10), m: parseInt(parts[1], 10), d: parseInt(parts[2], 10) };
};

/**
 * Compara dos strings de fecha "YYYY-MM-DD" lexicográficamente.
 * Retorna true si fecha está dentro del rango [from, to] inclusive.
 */
export const isInRange = (fecha: string, from: string, to: string): boolean => {
  const d = (fecha ?? '').split('T')[0];
  return d >= from && d <= to;
};

/**
 * Calcula el ejecutado real ("Actual") por especialidad
 * filtrando los metrados del rango de fechas seleccionado.
 * Mismo algoritmo que useDashboardStats: metrado.total × pu_actual
 *
 * @param dateFrom - string "YYYY-MM-DD"
 * @param dateTo   - string "YYYY-MM-DD"
 */
export const useStatusGerencial = (
  dateFrom: string,
  dateTo: string,
): StatusGerencialResult => {
  const { catalogoHospital, customPartidas, metrados } = useMetradosStore();

  return useMemo(() => {
    // Unificar catálogos para búsqueda
    const fullCatalogo = [...catalogoHospital, ...customPartidas];

    // ─── Filtrar metrados dentro del rango (sin new Date, sin bug TZ) ───
    const metradosRango = metrados.filter(m => {
      // Si el metrado no tiene proyecto o es hospital, lo incluimos
      const proj = (m.proyecto || 'hospital').toLowerCase();
      if (proj !== 'hospital') return false;
      
      return isInRange(m.fecha ?? '', dateFrom, dateTo);
    });

    // ─── Acumular ejecutado real por clave de especialidad ───
    const ejecutadoMap: Record<string, number> = {};

    metradosRango.forEach(m => {
      // Buscar en catálogo unificado (por ID o por Código)
      const partida = fullCatalogo.find(cat => 
        cat.id === m.partida_id || 
        cat.id === m.custom_partida_id || 
        (cat.codigo === m.codigo_partida && m.codigo_partida !== '')
      );

      if (!partida) return;
      if (partida.es_titulo) return;

      const valoriza = partida.se_valoriza !== false;
      if (!valoriza) return;

      const pu = partida.pu_actual || partida.precio_unitario || 0;
      const valor = (typeof m.total === 'number' ? m.total : 0) * pu;

      const espKey = getEspecialidadPorCodigo(m.codigo_partida || partida.codigo);
      ejecutadoMap[espKey] = (ejecutadoMap[espKey] || 0) + valor;
    });

    // ─── Construir filas en el orden del Excel ───
    const rows: StatusGerencialRow[] = ESPECIALIDADES_MASTER.map(esp => {
      const actual = ejecutadoMap[esp.key] || 0;
      const acumulado = esp.anterior + actual;
      const avancePct = esp.ppto > 0 ? (acumulado / esp.ppto) * 100 : 0;
      return { n: esp.n, label: esp.label, ppto: esp.ppto, anterior: esp.anterior, actual, acumulado, avancePct };
    });

    const totalPpto      = rows.reduce((s, r) => s + r.ppto, 0);
    const totalAnterior  = rows.reduce((s, r) => s + r.anterior, 0);
    const totalActual    = rows.reduce((s, r) => s + r.actual, 0);
    const totalAcumulado = rows.reduce((s, r) => s + r.acumulado, 0);
    const totalAvancePct = totalPpto > 0 ? (totalAcumulado / totalPpto) * 100 : 0;

    return {
      rows, totalPpto, totalAnterior, totalActual, totalAcumulado, totalAvancePct,
      metradosCount: metradosRango.length,
    };
  }, [catalogoHospital, metrados, dateFrom, dateTo]);
};
