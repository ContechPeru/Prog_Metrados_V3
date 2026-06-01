// LEGACY — mantenido solo para compatibilidad con getOficiosPorEspecialidad
// Las especialidades reales vienen de Supabase via useMetradosStore().especialidades

export const ESPECIALIDADES_PARTIDA = [
    { nombre: 'TODAS', prefijos: ['OE'] },
];

export const getEspecialidadPorCodigo = (codigo: string): string => {
    return '';
};

export const getOficiosPorEspecialidad = (especialidad: string): string[] => {
    switch (especialidad) {
        case 'ESTRUCTURAS':
            return ['CONCRETO', 'ACERO', 'FIERRERO', 'ALBAÑIL', 'SOLDADURA'];
        case 'ARQUITECTURA':
            return ['DRYWALL', 'CARPINTERO', 'ENCHAPADO', 'TARRAJEO', 'PINTURA', 'ASENTADO', 'ALBAÑIL'];
        case 'INSTALACIONES SANITARIAS':
            return ['GASFITERIA', 'SANITARIO'];
        case 'INSTALACIONES ELÉCTRICAS':
        case 'INSTALACIONES ELECTROMECÁNICAS':
            return ['ELECTROMECÁNICO', 'SOLDADURA'];
        case 'OBRAS PROVISIONALES':
            return ['GUARDIAN', 'PEON'];
        case 'PLAN DE MANEJO AMBIENTAL':
            return ['MEDIO AMBIENTE', 'SSOMA', 'VOLANTE DE RIEGO'];
        default:
            return [];
    }
};