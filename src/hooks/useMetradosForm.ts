import { useState, useMemo, useEffect } from 'react';
import type { Partida, Metrado } from '../types';
import { getEspecialidadPorCodigo } from '../constants/especialidades';
import { usePersonalStore } from '../store/usePersonalStore';
import { useMetradosStore } from '../store/useMetradosStore';
import { useAuthStore } from '../store/useAuthStore';
import { calcularParcial, calcularTotal, isAcero as isAceroUtil, isInstalacion as isInstalacionUtil } from '../utils/metradosCalculations';
import { formulaRegistry } from '../utils/formulas/registry';
import { getCanonicalSpecialtyName } from '../utils/normalization';

export const isAcero = isAceroUtil;
export const isInstalacion = isInstalacionUtil;

export const getHvacCategory = (partida: Partida | null): string | null => {
    if (!partida) return null;
    
    // Ahora basado puramente en tipo_metrado de Supabase
    if (partida.tipo_metrado === 'HVAC_DUCTO') return 'DUCTO';
    if (partida.tipo_metrado === 'HVAC_ACCESORIO') return 'ACCESORIO';

    return null;
};

export const useMetradosForm = () => {
    const { context, setContext, customPartidas, addCustomPartida, especialidades } = useMetradosStore();
    const { user, isReadOnlyMetrados } = useAuthStore();

    const getLocalDateString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [fecha, setFecha] = useState<string>(getLocalDateString());

    const frente = context.frente;
    const bloque = context.bloque;
    const nivel = context.nivel;
    const cuadrilla = context.cuadrilla || 'VARIOS'; // Fallback legacy
    const obreros_ids = context.obreros_ids || [];

    const [partidaSeleccionada, setPartidaSeleccionada] = useState<Partida | null>(null);
    const [elemento, setElemento] = useState<string>('');
    const [detalle, setDetalle] = useState<string>('');
    const [hvacFactor, setHvacFactor] = useState<number | null>(null);
    const [hvacItemType, setHvacItemType] = useState<string | null>(null); // 'TEE', 'REDUCCION', 'CODO', 'DUCTO'
    const [diametro, setDiametro] = useState<string>('5/8"');

    const [cantidad, setCantidad] = useState<number | "">("");
    const [longitud, setLongitud] = useState<number | "">("");
    const [ancho, setAncho] = useState<number | "">("");
    const [altura, setAltura] = useState<number | "">("");
    const [nroVeces, setNroVeces] = useState<number | "">("");

    const isReadOnly = isReadOnlyMetrados();

    const isSpecialtyLocked = useMemo(() => {
        if (isReadOnly) return false; // El lector no está atascado en una especialidad

        const role = user?.roles_apps?.metrados;
        if (!role) return false;
        const r = role.trim().toUpperCase();
        // Roles que NO bloquean (dan libertad total)
        const rolesLibres = ['TODAS', 'TODOS', 'ADMIN', 'SUPERVISOR', 'MASTER', 'LECTOR'];
        return !rolesLibres.includes(r);
    }, [user?.roles_apps?.metrados, isReadOnly]);

    const initialSpecialty = isSpecialtyLocked
        ? getCanonicalSpecialtyName(user?.especialidad_nombre || user?.especialidad || '', especialidades)
        : 'TODAS';

    const [especialidadSeleccionada, setEspecialidadSeleccionada] = useState<string>(initialSpecialty);

    useEffect(() => {
        if (!isSpecialtyLocked) return;

        const resolved = getCanonicalSpecialtyName(
            user?.especialidad_nombre || user?.especialidad || '',
            especialidades
        );

        if (resolved && resolved !== especialidadSeleccionada) {
            setEspecialidadSeleccionada(resolved);
        }
    }, [isSpecialtyLocked, user?.especialidad_nombre, user?.especialidad, especialidades, especialidadSeleccionada]);

    const parcial = useMemo(() => {
        return calcularParcial({
            partida: partidaSeleccionada,
            cantidad, longitud, ancho, altura,
            diametro, hvacFactor, hvacItemType
        });
    }, [cantidad, longitud, ancho, altura, partidaSeleccionada, diametro, hvacFactor, hvacItemType]);

    const hvacConfig = useMemo(() => {
        const category = getHvacCategory(partidaSeleccionada);
        if (!category) return null;

        return {
            category,
            isAccessory: category === 'ACCESORIO',
            isDuct: category === 'DUCTO'
        };
    }, [partidaSeleccionada]);

    const total = useMemo(() => {
        return calcularTotal(parcial, nroVeces);
    }, [parcial, nroVeces]);

    const formulaStrategy = useMemo(() => {
        return formulaRegistry.get(partidaSeleccionada?.tipo_metrado);
    }, [partidaSeleccionada]);

    const limpiarCampos = (totalReset: boolean = false) => {
        if (totalReset) {
            setElemento('');
        }
        setDetalle('');
        setHvacFactor(null);
        setHvacItemType(null);
        setCantidad('');
        setLongitud('');
        setAncho('');
        setAltura('');
        setNroVeces('');
    };

    const procesarRegistro = (): Metrado | null => {
        if (!partidaSeleccionada) return null;

        const isCustom = partidaSeleccionada.modificacion === 'PC';
        
        // Obtener el personal desde el store usando los IDs seleccionados explícitamente
        const personalStoreData = usePersonalStore.getState().personal;
        const personalDeCuadrilla = personalStoreData.filter(p => (context.obreros_ids || []).includes(p.id));
        
        // Formatear obreros
        const obrero_nombre_concatenado = personalDeCuadrilla.length > 0 
            ? personalDeCuadrilla.map(p => `${p.nombre_formateado} (${p.categoria || 'Sin Cat'})`).join(' / ')
            : undefined;

        const isValidUUID = (id: string | undefined) => id && id.length === 36;

        const nuevoMetrado: Metrado = {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + Math.random().toString(36).substring(2)),
            fecha: fecha,
            frente,
            bloque,
            nivel,
            cuadrilla: context.cuadrilla || undefined,
            obreros_ids: context.obreros_ids || [],
            obrero_nombre: obrero_nombre_concatenado,
            partida_id: (!isCustom && isValidUUID(partidaSeleccionada.id)) ? partidaSeleccionada.id : undefined,
            custom_partida_id: (isCustom && isValidUUID(partidaSeleccionada.id)) ? partidaSeleccionada.id : undefined,
            codigo_partida: partidaSeleccionada.codigo,
            descripcion_partida: partidaSeleccionada.descripcion,
            elemento,
            detalle,
            diametro: (isAcero(partidaSeleccionada) || isInstalacion(partidaSeleccionada)) ? diametro : undefined,
            cantidad,
            longitud_area: longitud,
            ancho_empalme: ancho,
            altura_gancho: altura,
            parcial,
            nro_veces: nroVeces,
            total,
            unidad: partidaSeleccionada.unidad,
            jerarquia: partidaSeleccionada.jerarquia,
            nivelJerarquia: partidaSeleccionada.nivel_jerarquia,
            modificacion: partidaSeleccionada.modificacion,
            tipo_metrado: partidaSeleccionada.tipo_metrado,
            hvac_factor: hvacFactor,
            hvac_item_type: hvacItemType,
            especialidad: (() => {
                const esp = partidaSeleccionada.especialidad;
                console.log('especialidad raw:', esp, '| codigo:', partidaSeleccionada.codigo);
                return esp || getEspecialidadPorCodigo(partidaSeleccionada.codigo);
            })(),
            autor_usuario: user?.nombre_completo || "UserWeb",
            created_at: new Date().toISOString(),
        };

        limpiarCampos();
        return nuevoMetrado;
    };

    const actions = useMemo(() => ({
        setFecha,
        setFrente: (val: string) => setContext({ frente: val }),
        setBloque: (val: string) => setContext({ bloque: val }),
        setNivel: (val: string) => setContext({ nivel: val }),
        setCuadrilla: (val: string) => {
            setContext({ cuadrilla: val });
            const cuadrillaUpper = val.trim().toUpperCase();
            if (cuadrillaUpper && cuadrillaUpper !== 'VARIOS') {
                const allPersonal = usePersonalStore.getState().personal;
                const obrerosDeCuadrilla = allPersonal.filter(p => {
                    if (p.cuadrilla?.toUpperCase() !== cuadrillaUpper) return false;
                    
                    // Aquí usamos el valor actual desde el store para evitar dependencia circular en el memo
                    const currentEsp = useMetradosStore.getState().context.especialidad; 
                    if (currentEsp && currentEsp !== 'TODAS') {
                        const pEsp = (p.especialidad || '').toUpperCase();
                        const sEsp = currentEsp.toUpperCase();
                        if (pEsp.includes(sEsp) || sEsp.includes(pEsp) || pEsp === 'OBRERO' || pEsp === 'GENERICO') {
                            return true;
                        }
                        return false;
                    }
                    
                    return true;
                });
                if (obrerosDeCuadrilla.length > 0) {
                    setContext({ obreros_ids: obrerosDeCuadrilla.map(p => p.id) });
                }
            }
        },
        setObrerosIds: (ids: string[]) => setContext({ obreros_ids: ids }),
        setPartidaSeleccionada, setElemento, setDetalle, setDiametro,
        setCantidad, setLongitud, setAncho, setAltura, setNroVeces,
        setEspecialidadSeleccionada, setHvacFactor,
        limpiarCampos, procesarRegistro,
        addCustomPartida,
        setHvacItemType
    }), [setFecha, setContext, setPartidaSeleccionada, setElemento, setDetalle, setDiametro, setCantidad, setLongitud, setAncho, setAltura, setNroVeces, setEspecialidadSeleccionada, setHvacFactor, limpiarCampos, procesarRegistro, addCustomPartida, setHvacItemType]);

    return {
        state: {
            fecha, frente, bloque, nivel, cuadrilla, obreros_ids,
            partidaSeleccionada, elemento, detalle, diametro,
            cantidad, longitud, ancho, altura, nroVeces,
            parcial, total, especialidadSeleccionada, isSpecialtyLocked,
            customPartidas, hvacFactor, hvacConfig, hvacItemType,
            formulaStrategy
        },
        actions
    };
};
