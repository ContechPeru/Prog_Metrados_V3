import { useMemo } from 'react';
import { useMetradosStore } from '../store/useMetradosStore';
import { getEspecialidadPorCodigo } from '../constants/especialidades';

export interface SpecialtyStats {
    name: string;
    // Contractual
    contractualBudget: number;
    contractualExecuted: number;
    // Modificado (PC Valorizables)
    pcBudget: number; // Suponiendo costo 0 inicial o lo que el usuario asigne
    pcExecuted: number;
    // Operativo (No valorizable)
    operationalExecutedQty: number; 
    // Totales Financieros
    totalBudget: number;
    totalExecuted: number;
    progressPercentage: number;
}

export interface DashboardStats {
    totalBudget: number;
    totalExecuted: number;
    progressPercentage: number;
    totalSaldo: number;
    specialtyStats: SpecialtyStats[];
    // Para Curva S (Solo valorizables)
    monthlyProgress: { month: string; cumulativeExecuted: number }[];
}

export const useDashboardStats = (proyecto: 'hospital' | 'contingencia') => {
    const { catalogoHospital, catalogoContingencia, metrados } = useMetradosStore();

    return useMemo(() => {
        const catalogo = proyecto === 'hospital' ? catalogoHospital : catalogoContingencia;
        const metradosProyecto = metrados.filter(m => m.proyecto === proyecto);

        const statsMap: Record<string, SpecialtyStats> = {};

        // Inicializar especialidades
        catalogo.forEach(p => {
            const esp = getEspecialidadPorCodigo(p.codigo);
            if (!statsMap[esp]) {
                statsMap[esp] = {
                    name: esp,
                    contractualBudget: 0,
                    contractualExecuted: 0,
                    pcBudget: 0,
                    pcExecuted: 0,
                    operationalExecutedQty: 0,
                    totalBudget: 0,
                    totalExecuted: 0,
                    progressPercentage: 0
                };
            }

            if (p.es_titulo) return;

            const isPC = p.modificacion === 'PC';
            const valoriza = p.se_valoriza !== false;
            const pu = p.pu_actual || p.precio_unitario || 0;
            const budget = (p.metrado_programado || p.cantidad_presupuesto || 0) * pu;

            if (valoriza) {
                if (isPC) {
                    statsMap[esp].pcBudget += budget;
                } else {
                    statsMap[esp].contractualBudget += budget;
                }
                statsMap[esp].totalBudget += budget;
            }
        });

        // Procesar Metrados Reales
        metradosProyecto.forEach(m => {
            const p = catalogo.find(cat => cat.codigo === m.codigo_partida);
            const esp = getEspecialidadPorCodigo(m.codigo_partida);
            if (!statsMap[esp]) return;

            const valoriza = p?.se_valoriza !== false;
            const pu = p?.pu_actual || p?.precio_unitario || 0;
            const executedValue = m.total * pu;

            if (valoriza) {
                if (p?.modificacion === 'PC') {
                    statsMap[esp].pcExecuted += executedValue;
                } else {
                    statsMap[esp].contractualExecuted += executedValue;
                }
                statsMap[esp].totalExecuted += executedValue;
            } else {
                statsMap[esp].operationalExecutedQty += m.total;
            }
        });

        // Calcular porcentajes finales por especialidad
        const specialtyStats = Object.values(statsMap).map(s => ({
            ...s,
            progressPercentage: s.totalBudget > 0 ? (s.totalExecuted / s.totalBudget) * 100 : 0
        })).sort((a, b) => b.totalBudget - a.totalBudget);

        // Totales Generales (Solo valorizables)
        const totalBudget = specialtyStats.reduce((sum, s) => sum + s.totalBudget, 0);
        const totalExecuted = specialtyStats.reduce((sum, s) => sum + s.totalExecuted, 0);
        const progressPercentage = totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0;

        // Progreso Mensual para Curva S
        const monthlyMap: Record<string, number> = {};
        metradosProyecto.forEach(m => {
            const p = catalogo.find(cat => cat.codigo === m.codigo_partida);
            if (p?.se_valoriza === false) return; // Excluir no-valorizables de la curva financiera

            const date = new Date(m.fecha);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const pu = p?.pu_actual || p?.precio_unitario || 0;
            monthlyMap[key] = (monthlyMap[key] || 0) + (m.total * pu);
        });

        const months = Object.keys(monthlyMap).sort();
        let cumulativeExecuted = 0;
        const monthlyProgress = months.map(month => {
            cumulativeExecuted += monthlyMap[month];
            return { month, cumulativeExecuted };
        });

        return {
            totalBudget,
            totalExecuted,
            progressPercentage,
            totalSaldo: totalBudget - totalExecuted,
            specialtyStats,
            monthlyProgress
        };
    }, [catalogoHospital, catalogoContingencia, metrados, proyecto]);
};
