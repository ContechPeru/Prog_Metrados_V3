export type TipoRecurso = "Mano de Obra" | "Materiales" | "Equipos" | "Subcontratos" | string;

export interface RecursoAPU {
    tipo: TipoRecurso;
    descripcion: string;
    unidad: string;
    cuadrilla?: number | string | null;
    cantidad: number;
    precio_unitario: number;
    parcial: number;
}

export interface APU {
    rendimiento_diario: number;
    jornada_horas: number;
    costo_directo_unitario: number;
    recursos: RecursoAPU[];
}

export interface Partida {
    id: string;
    codigo: string;
    descripcion: string;
    unidad: string;
    jerarquia?: string[];
    es_titulo?: boolean;
    parent_id?: string | null;
    nivel_jerarquia?: number;
    modificacion?: string;
    proyecto?: 'hospital' | 'contingencia' | string;
    especialidad?: string;
    tipo_metrado?: 'ESTANDAR' | 'ACERO' | 'HVAC_DUCTO' | 'HVAC_ACCESORIO' | string;
    apu?: APU | null;
    is_template?: boolean;
    is_elemento_virtual?: boolean;
    precio_unitario?: number;
    cantidad_presupuesto?: number;
    acumulado_anterior_qty?: number;
    // Campos de seguimiento financiero (V21)
    metrado_anterior_acumulado?: number;
    valorizacion_anterior?: number;
    pu_actual?: number;
    metrado_programado?: number;
    valorizacion_programada?: number;
    metrado_anterior?: number;
    presupuesto_anterior?: number;
    // Control de valorización selectiva (V25)
    se_valoriza?: boolean;
}

export interface Metrado {
    id: string;
    fecha: string;
    frente: string;
    bloque: string;
    nivel: string;
    cuadrilla?: string;
    obreros_ids?: string[];
    obrero_nombre?: string;
    partida_id?: string;
    custom_partida_id?: string;
    codigo_partida: string;
    descripcion_partida: string;
    elemento?: string | null;
    detalle: string;
    diametro?: string;
    cantidad: number | "";
    longitud_area: number | "";
    ancho_empalme: number | "";
    altura_gancho: number | "";
    parcial: number;
    nro_veces: number | "";
    total: number;
    unidad: string;
    jerarquia?: string[];
    autor_usuario: string;
    created_at: any;
    hvac_item_id?: string;
    es_titulo?: boolean;
    parent_id?: string;
    nivelJerarquia?: number;
    modificacion?: string;
    proyecto?: string;
    especialidad?: string;
    hvac_factor?: number | null;
    hvac_item_type?: string | null;
    tipo_metrado?: 'ESTANDAR' | 'ACERO' | 'HVAC_DUCTO' | 'HVAC_ACCESORIO' | string;
}

export interface User {
    id: string;
    dni_username: string;
    nombre_completo: string;
    correo?: string | null;
    area?: string | null;
    cargo?: string | null;
    especialidad?: string | null;
    roles_apps: {
        metrados?: string;
        admin_presupuesto?: boolean;
        [key: string]: any;
    };
    es_administrador_presupuesto?: boolean;
    es_gerencia?: boolean;
    created_at?: string;
}
