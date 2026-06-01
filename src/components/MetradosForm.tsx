import React, { useState, useMemo, useEffect } from 'react';
import { SearchCombobox } from './ui/SearchCombobox';
import { Select } from './ui/Select';
import type { Partida } from '../types';
import type { TipoProyecto } from '../App';
import { isAcero, isInstalacion } from '../hooks/useMetradosForm';
import { ESPECIALIDADES_PARTIDA, getEspecialidadPorCodigo } from '../constants/especialidades';
import { Save, Eraser, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { usePersonalStore } from '../store/usePersonalStore';
import { useMetradosStore } from '../store/useMetradosStore';
import { useAuthStore } from '../store/useAuthStore';
import { SimpleSearchInput } from './ui/SimpleSearchInput';
import { PersonalMultiSelect } from './ui/PersonalMultiSelect';

interface MetradosFormProps {
    state: any;
    actions: any;
    onGuardar: () => void;
    proyecto: TipoProyecto;
}

export const RenderModificacionBadge = (modificacionStr?: string) => {
    if (!modificacionStr) {
        return (
            <div className="w-[10px] h-[10px] rounded-full bg-sky-200 shadow-sm border border-sky-300 shrink-0" title="Sin ModificaciÃ³n" />
        );
    }

    const tags = modificacionStr.split('-');

    return (
        <div className="flex items-center gap-1 shrink-0">
            {tags.map((tag, i) => {
                let colorClass = "bg-slate-200 border-slate-300";
                if (tag.startsWith('DD')) colorClass = "bg-red-500 border-red-600";
                if (tag.startsWith('PN')) colorClass = "bg-green-500 border-green-600";
                if (tag.startsWith('MM')) colorClass = "bg-blue-500 border-blue-600";
                if (tag.startsWith('PC')) colorClass = "bg-[#FF69B4] border-[#FF1493]"; // Rosado (Partidas Creadas)

                return (
                    <div key={i} className={`w-[10px] h-[10px] rounded-full border shadow-sm ${colorClass}`} title={tag} />
                );
            })}
        </div>
    );
};

// @ts-ignore
window.RenderModificacionBadge = RenderModificacionBadge;

export const MetradosForm: React.FC<MetradosFormProps> = ({ state, actions, onGuardar, proyecto }) => {
    const { personal } = usePersonalStore();
    const { user } = useAuthStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCostDetail, setShowCostDetail] = useState(false);
    const { catalogoHospital, catalogoContingencia, metrados, hvacCatalog, fetchHvacCatalog, context, especialidades } = useMetradosStore();

    // Flag para habilitar campos especiales de LIQUIDACIONES
    const isLiquidaciones = user?.area?.trim().toUpperCase() === 'LIQUIDACIONES';

    useEffect(() => {
        fetchHvacCatalog();
    }, [fetchHvacCatalog]);

    const bloquesPorFrente: Record<string, string[]> = {
        'F1': ['B1', 'B2', 'B3'],
        'F2': ['B4', 'B11', 'B12', 'B16'],
        'F3': ['B5', 'B7', 'B10'],
        'F4': ['B6', 'B8', 'B9', 'B13', 'B14', 'B15', 'EXT1', 'EXT2', 'EXT3', 'EXT4', 'EXT5', 'EXT6', 'EXT7', 'EXT8', 'EXT9']
    };

    const opcionesBloque = useMemo(() => {
        if (!state.frente) return [''];
        return bloquesPorFrente[state.frente] ? ['', ...bloquesPorFrente[state.frente]] : [''];
    }, [state.frente]);

    // Resetear bloque si ya no es vÃ¡lido para el nuevo frente
    useEffect(() => {
        if (state.bloque && state.frente) {
            const disponibles = bloquesPorFrente[state.frente] || [];
            if (!disponibles.includes(state.bloque)) {
                actions.setBloque('');
            }
        }
    }, [state.frente, state.bloque, actions]);
    
    const uniqueCuadrillas = useMemo(() => {
        const cuadrillas = personal.map(p => p.cuadrilla).filter(c => c && c.trim() !== '' && c !== 'nan');
        return Array.from(new Set(cuadrillas)).sort();
    }, [personal]);
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, nextId: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextId === 'submit') {
                const isAceroFlag = isAcero(state.partidaSeleccionada);
                const isAceroValido = isAceroFlag && state.cantidad !== "" && state.cantidad > 0;
                const isGuardable = state.partidaSeleccionada && (state.total > 0 || isAceroValido);
                if (isGuardable) handleOnGuardar();
            } else {
                const nextEl = document.getElementById(nextId) as HTMLInputElement;
                if (nextEl) {
                    nextEl.focus();
                    if (nextEl.select) nextEl.select();
                }
            }
        }
    };

    const [showNuevaPartidaModal, setShowNuevaPartidaModal] = useState(false);
    const [nuevaPartidaData, setNuevaPartidaData] = useState({ codigo: '', descripcion: '', unidad: 'm', tipo_metrado: 'ESTANDAR' });
    const [modalEspecialidad, setModalEspecialidad] = useState<string>('TODAS');
    const [buscadorActivo, setBuscadorActivo] = useState(false);

    // Generador AutomÃ¡tico de Nomenclatura para Partidas Creadas
    const generarCodigoPartida = (especialidad: string) => {
        const prefijos: Record<string, string> = {
            'ESTRUCTURAS': 'EST',
            'ARQUITECTURA': 'ARQ',
            'INSTALACIONES SANITARIAS': 'INS',
            'ELÃ‰CTRICAS': 'IE',
            'ELECTROMECÃNICAS': 'EM',
            'SEGURIDAD': 'SEG',
            'PLAN DE MANEJO AMBIENTAL': 'PMA',
            'OBRAS PROVISIONALES': 'OP',
            'COMUNICACIONES': 'COM',
            'EQUIPAMIENTO BIOMÃ‰DICO': 'EB',
            'TODAS': 'GEN'
        };
        const prefix = prefijos[especialidad] || 'GEN';
        const rnd = Math.floor(1000 + Math.random() * 9000); // 4 dÃ­gitos aleatorios
        return `PC-${prefix}-${rnd}`;
    };

    const isDateLocked = !useAuthStore.getState().canEditMetrado(user?.nombre_completo || '', state.fecha);

    React.useEffect(() => {
        if (showNuevaPartidaModal) {
            const espInicial = (user?.especialidad && user.especialidad !== 'TODAS') 
                ? user.especialidad 
                : (state.especialidadSeleccionada || 'TODAS');
            
            setModalEspecialidad(espInicial);
            setNuevaPartidaData(prev => ({ ...prev, codigo: generarCodigoPartida(espInicial) }));
        }
    }, [showNuevaPartidaModal, state.especialidadSeleccionada, user]);

    // Actualizar cÃ³digo auto-generado si el usuario con "TODAS" cambia la especialidad en el modal
    React.useEffect(() => {
        if (showNuevaPartidaModal) {
            setNuevaPartidaData(prev => ({ ...prev, codigo: generarCodigoPartida(modalEspecialidad) }));
        }
    }, [modalEspecialidad, showNuevaPartidaModal]);

    const catalogoSugerencias = useMemo(() => {
        if (context.isModoPC) {
            return state.customPartidas;
        }
        return [
            ...(proyecto === 'hospital' ? catalogoHospital : catalogoContingencia),
            ...state.customPartidas
        ];
    }, [proyecto, catalogoHospital, catalogoContingencia, state.customPartidas, context.isModoPC]);

    const modalCatalogoSugerencias = useMemo(() => {
        return catalogoSugerencias.filter((p: Partida) => {
            if (p.es_titulo) return false;
            if (modalEspecialidad === 'TODAS') return true;
            
            const coincideEspecialidad = p.especialidad === modalEspecialidad;
            return coincideEspecialidad;
        });
    }, [catalogoSugerencias, modalEspecialidad]);

    const partidasSugeridasCombo = useMemo(() => {
        return catalogoSugerencias.filter((p: Partida) => {
            if (p.es_titulo) return false;
            if (state.especialidadSeleccionada === 'TODAS') return true;
            const coincideEspecialidad = p.especialidad === state.especialidadSeleccionada;
            return coincideEspecialidad;
        });
    }, [catalogoSugerencias, state.especialidadSeleccionada]);

    const mActualGuardadoMemo = useMemo(() => {
        if (!state.partidaSeleccionada || !showCostDetail) return 0;
        return metrados
            .filter((m: any) => m.codigo_partida === state.partidaSeleccionada.codigo)
            .reduce((sum: number, m: any) => sum + (m.total || 0), 0);
    }, [metrados, state.partidaSeleccionada, showCostDetail]);

    const handleCrearPartida = async () => {
        if (!nuevaPartidaData.codigo || !nuevaPartidaData.descripcion) return;
        
        const nuevaP: Partida = {
            id: `custom-${Date.now()}`, 
            codigo: nuevaPartidaData.codigo,
            descripcion: nuevaPartidaData.descripcion.toUpperCase(), 
            unidad: nuevaPartidaData.unidad,
            jerarquia: [],
            nivel_jerarquia: 1,
            modificacion: 'PC',
            especialidad: modalEspecialidad === 'TODAS' ? getEspecialidadPorCodigo(nuevaPartidaData.codigo) : modalEspecialidad,
            tipo_metrado: nuevaPartidaData.tipo_metrado || 'ESTANDAR'
        };

        const successPartida = await actions.addCustomPartida(nuevaP); 
        if (successPartida) {
            actions.setPartidaSeleccionada(successPartida);
            setShowNuevaPartidaModal(false);
            setNuevaPartidaData({ codigo: '', descripcion: '', unidad: 'm', tipo_metrado: 'ESTANDAR' });
            
            // Si el user acababa de crearla, aseguramos que el store lo inserte en metrados_personalizados
            // pero esto ya lo maneja addMetrado al detectar modificacion === 'PC'
        } else {
            alert('Error al guardar en Supabase.');
        }
    };

    const handleOnGuardar = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onGuardar();
        } finally {
            setTimeout(() => setIsSubmitting(false), 1000);
        }
    };

    

    /* //----------------------------------- Antes del return */
    const [sistValue, setSistValue] = useState('');
    const [numValue, setNumValue] = useState('');
    const [showSistSuggestions, setShowSistSuggestions] = useState(false);

    const SISTEMAS = [
        { abr: 'DW',  nombre: 'DRYWALL' },
        { abr: 'ACB', nombre: 'ACABADOS' },
        { abr: 'CI',  nombre: 'CIMENTACION' },
        { abr: 'ISA', nombre: 'INSTALACIONES SANITARIAS' },
        { abr: 'ACO', nombre: 'ACERO' },
        { abr: 'CE',  nombre: 'CABLEADO ESTRUCTURADO' },
        { abr: 'EQB', nombre: 'BIOMEDICO' },
        { abr: 'VER', nombre: 'ESCALERA METALICA' },
    ];

    const sistemasFiltrados = SISTEMAS.filter(s =>
        sistValue.length > 0 &&
        (s.abr.startsWith(sistValue.toUpperCase()) || 
        s.nombre.includes(sistValue.toUpperCase()))
    );

    // DinÃ¡mico desde Supabase:
    const espMap = useMemo(() => {
        const map: Record<string, string> = {};
        (especialidades || []).forEach(esp => {
            map[esp.nombre] = esp.codigo;
        });
        return map;
    }, [especialidades]);

    const codigoPlano = [
        '2361679',
        'GRC',
        state.bloque || '?',
        state.nivel  || '?',
        espMap[state.especialidadSeleccionada] || '?',
        sistValue    || '?',
        'PLN',
        numValue     || '?',
    ].join('-');


 /* //----------------------------------- Antes del return */





    return (
        <div className="glass-panel rounded-2xl p-4 h-full flex flex-col gap-3 relative">
            {/* Modal para Nueva Partida */}
            {showNuevaPartidaModal && (
                <div className="absolute inset-0 z-[200] bg-white/90 backdrop-blur-sm p-4 flex flex-col justify-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="glass-panel p-5 rounded-2xl shadow-xl border border-blue-100 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Crear Nueva Partida o actividad</h3>
                            <button onClick={() => setShowNuevaPartidaModal(false)} className="text-slate-400 hover:text-red-500 font-bold text-[11px] px-2 cursor-pointer">X</button>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Especialidad de la Partida</label>
                                <Select
                                    value={modalEspecialidad}
                                    onSelect={val => setModalEspecialidad(val)}
                                    options={['TODAS', ...(especialidades || []).map(esp => esp.nombre)]}
                                    className={`bg-white ${user?.especialidad && user.especialidad !== 'TODAS' ? 'opacity-70 pointer-events-none' : ''}`}
                                />
                                {user?.especialidad && user.especialidad !== 'TODAS' && (
                                    <p className="text-[9px] text-blue-500 italic pl-1">Especialidad bloqueada a tu perfil de usuario.</p>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">CÃ³digo Autogenerado</label>
                                <input 
                                    type="text" 
                                    readOnly
                                    value={nuevaPartidaData.codigo} 
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-600 font-mono text-sm px-3 py-2 rounded-lg"
                                />
                            </div>
                            
                            <SimpleSearchInput<Partida> 
                                label="DescripciÃ³n"
                                placeholder="Ej. Suministro de materiales no catalogados..."
                                value={nuevaPartidaData.descripcion}
                                onChange={val => setNuevaPartidaData({...nuevaPartidaData, descripcion: val})}
                                onSelect={(p: Partida) => setNuevaPartidaData({ ...nuevaPartidaData, codigo: p.codigo, descripcion: p.descripcion })}
                                suggestions={modalCatalogoSugerencias}
                                searchField="descripcion"
                                renderItem={(p: Partida) => (
                                    <>
                                        <span className="text-[10px] font-bold text-slate-800 line-clamp-1">{p.descripcion}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-mono text-blue-500 font-bold">{p.codigo}</span>
                                            {/* @ts-ignore */}
                                            {window.RenderModificacionBadge && window.RenderModificacionBadge(p.modificacion)}
                                        </div>
                                    </>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Unidad</label>
                                    <Select 
                                        value={nuevaPartidaData.unidad}
                                        options={['m', 'm2', 'm3', 'kg', 'und', 'glb', 'pto', 'est']}
                                        onSelect={val => setNuevaPartidaData({...nuevaPartidaData, unidad: val})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase" title="LÃ³gica matemÃ¡tica que aplicarÃ¡ la app para esta partida">Tipo de LÃ³gica</label>
                                    <Select 
                                        value={nuevaPartidaData.tipo_metrado}
                                        options={['ESTANDAR', 'ACERO', 'HVAC_DUCTO', 'HVAC_ACCESORIO']}
                                        onSelect={val => setNuevaPartidaData({...nuevaPartidaData, tipo_metrado: val})}
                                    />
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleCrearPartida}
                            disabled={!nuevaPartidaData.codigo || !nuevaPartidaData.descripcion}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all cursor-pointer"
                        >
                            Confirmar y Seleccionar
                        </button>
                    </div>
                </div>
            )}

            {/* Cabecera Compacta */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                {/* <h2 className="text-sm font-bold text-gray-800 tracking-tight uppercase flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full" /> Registro de Metrados
                </h2> */}
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={state.fecha}
                        onChange={e => actions.setFecha(e.target.value)}
                        className="text-[11px] font-mono font-bold text-slate-500 bg-transparent border-none p-0 focus:ring-0 cursor-pointer outline-none"
                    />
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => actions.limpiarCampos(true)}
                            className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-50"
                            title="Limpiar medidas y detalle"
                        >
                            <Eraser size={10} />
                            Limpiar
                        </button>
                       {/*  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200">v5.0</span> */}
                    </div>
                </div>
            </div>

            <div className="space-y-3 flex-grow">
                {/* â”€â”€â”€ PASO 1: ESPECIALIDAD Y BÃšSQUEDA â”€â”€â”€ */}
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Especialidad (Filtro OE)</label>
                        <Select
                            value={state.especialidadSeleccionada}
                            onSelect={val => {
                                actions.setEspecialidadSeleccionada(val);
                                actions.setPartidaSeleccionada(null);
                            }}
                            options={['TODAS', ...(especialidades || []).map(esp => esp.nombre)]}
                            disabled={state.isSpecialtyLocked}
                            className="bg-white/50"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center justify-between pr-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Partida (Buscador)</label>
                            {!buscadorActivo && (
                                <button
                                    onClick={() => setShowNuevaPartidaModal(true)}
                                    className="group flex items-center gap-1 px-2 py-0.5 rounded-lg border border-transparent hover:border-green-300 hover:bg-green-50 transition-all duration-200"
                                    title="Agregar partida personalizada"
                                >
                                    <span className="text-green-500 font-black text-[14px] leading-none">+</span>
                                    <span className="text-[9px] font-black text-green-600 uppercase tracking-wide max-w-0 overflow-hidden group-hover:max-w-[120px] transition-all duration-300 whitespace-nowrap">
                                        Agregar partida
                                    </span>
                                </button>
                            )}
                        </div>
                        <SearchCombobox
                            partidas={partidasSugeridasCombo}
                            value={state.partidaSeleccionada ? state.partidaSeleccionada.descripcion : ''}
                            onSelect={(p: Partida) => {
                                actions.setPartidaSeleccionada(p);
                                actions.setCantidad(1);
                                actions.setLongitud('');
                                actions.setAncho('');
                                actions.setAltura('');
                            }}
                            onAddPartida={() => setShowNuevaPartidaModal(true)}
                            onOpenChange={(open) => setBuscadorActivo(open)}
                        />
                    </div>

                    {state.partidaSeleccionada && (
                        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1">
                            <div className="bg-blue-50/50 px-3 py-2 rounded-xl border border-blue-100 flex items-center justify-between shadow-sm">
                                <span className="text-[10px] text-blue-700 font-mono tracking-wider font-black">
                                    <span className="text-blue-400 opacity-50 mr-1">ID:</span> {state.partidaSeleccionada.codigo}
                                    <span className="mx-3 opacity-20">|</span>
                                    <span className="text-blue-400 opacity-50 mr-1">UNIDAD:</span> {state.partidaSeleccionada.unidad}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setShowCostDetail(!showCostDetail)}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                                    >
                                        {showCostDetail ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                        {showCostDetail ? 'Ocultar Saldo' : 'Ver Saldo'}
                                    </button>
                                    {RenderModificacionBadge(state.partidaSeleccionada.modificacion)}
                                </div>
                            </div>

                            {showCostDetail && (
                                <div className="bg-white border border-blue-100 rounded-xl p-3 shadow-md space-y-4 animate-in zoom-in-95 duration-200">
                                    {(() => {
                                        const p = state.partidaSeleccionada;
                                        
                                        // â”€â”€â”€ PARÃMETROS BASE â”€â”€â”€
                                        const puActual = p.pu_actual || p.precio_unitario || 0;
                                        // La Meta Total es estrictamente el metrado_programado de la tabla catalogo_partidas
                                        const mProgramado = p.metrado_programado || 0;
                                        const mAnteriorAcumulado = p.metrado_anterior_acumulado || p.acumulado_anterior_qty || 0;
                                        const valAnteriorAcumulada = p.valorizacion_anterior || 0;
                                        const valProgramada = p.valorizacion_programada || (mProgramado * puActual);

                                        // â”€â”€â”€ CONTROL FÃSICO â”€â”€â”€
                                        // Sumamos lo ya guardado + lo que el usuario estÃ¡ escribiendo ahora (Tiempo Real)
                                        const mActualGuardado = mActualGuardadoMemo;
                                        
                                        const mActualEnForm = state.totalCalculado || 0;
                                        const mActual = mActualGuardado + mActualEnForm;
                                        
                                        const mAnterior = mAnteriorAcumulado;
                                        const mAcumulado = mAnterior + mActual;
                                        const mSaldo = mProgramado - mAcumulado;
                                        
                                        // CÃ¡lculo de porcentaje sobre el total contractual
                                        const porcentajeTotal = mProgramado > 0 ? (mAcumulado / mProgramado) * 100 : 0;
                                        
                                        // CÃ¡lculo de avance sobre el saldo inicial del periodo (lo que faltaba)
                                        const mMetaPendiente = mProgramado - mAnterior;
                                        const porcentajeRelativo = mMetaPendiente > 0 ? (mActual / mMetaPendiente) * 100 : (mActual > 0 ? 100 : 0);

                                        const isExceeded = mAcumulado > mProgramado && mProgramado > 0;

                                        // â”€â”€â”€ CONTROL FINANCIERO â”€â”€â”€
                                        const valEjecActual = mActual * puActual;
                                        const valEjecTotal = valAnteriorAcumulada + valEjecActual;
                                        const valSaldo = valProgramada - valEjecTotal;

                                        const format = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                                        return (
                                            <>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-tight">
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-400 text-[8px] uppercase tracking-wider">Avance del Proyecto</span>
                                                            <span className="text-slate-700 font-black">META TOTAL: {format(mProgramado)} {p.unidad}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className={`text-base font-black ${isExceeded ? 'text-red-600' : 'text-blue-600'}`}>
                                                                {porcentajeTotal.toFixed(1)}%
                                                            </span>
                                                            <span className="text-[7px] text-slate-400 font-bold uppercase underline">Porcentaje de Avance</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner relative">
                                                        <div 
                                                            className={`h-full transition-all duration-700 ease-out ${isExceeded ? 'bg-red-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`}
                                                            style={{ width: `${Math.min(porcentajeTotal, 100)}%` }}
                                                        />
                                                        {isExceeded && (
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <span className="text-[7px] font-black text-white drop-shadow-sm uppercase">Â¡LÃ­mite Superado!</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 pl-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Control FÃ­sico ({p.unidad})</span>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1.5">
                                                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-center transition-all hover:bg-white hover:shadow-sm">
                                                            <span className="text-[7px] font-bold text-slate-400 block uppercase mb-0.5">Anterior</span>
                                                            <span className="text-[10px] font-black text-slate-600">{format(mAnterior)}</span>
                                                        </div>
                                                        <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100 text-center transition-all hover:bg-white hover:shadow-sm">
                                                            <span className="text-[7px] font-bold text-blue-400 block uppercase mb-0.5">Actual</span>
                                                            <span className="text-[10px] font-black text-blue-700">{format(mActual)}</span>
                                                        </div>
                                                        <div className="bg-slate-900 p-2 rounded-xl text-center shadow-lg transform scale-105 z-10 ring-2 ring-slate-800">
                                                            <span className="text-[7px] font-bold text-slate-400 block uppercase mb-0.5">Acumulado</span>
                                                            <span className="text-[10px] font-black text-white">{format(mAcumulado)}</span>
                                                        </div>
                                                        <div className={`p-2 rounded-xl border text-center transition-all hover:bg-white hover:shadow-sm ${isExceeded ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
                                                            <span className={`text-[8px] font-bold block uppercase mb-0.5 ${isExceeded ? 'text-red-500' : 'text-slate-500'}`}>Saldo (Falta)</span>
                                                            <span className={`text-[11px] font-black ${isExceeded ? 'text-red-600' : 'text-slate-700'}`}>{format(Math.max(0, mSaldo))}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Indicador de Avance del Periodo (Opcional pero Ãºtil para claridad) */}
                                                {mMetaPendiente > 0 && mActual > 0 && (
                                                    <div className="flex items-center justify-between px-2 py-1 bg-blue-50/30 rounded-lg border border-blue-100/50">
                                                        <span className="text-[7px] font-bold text-blue-400 uppercase">Avance sobre lo pendiente:</span>
                                                        <span className="text-[9px] font-black text-blue-600">{porcentajeRelativo.toFixed(1)}%</span>
                                                    </div>
                                                )}

                                                <div className="space-y-1.5 pt-1">
                                                    <div className="flex items-center justify-between pl-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Control Financiero (Soles)</span>
                                                        </div>
                                                        <span className="text-[8px] font-mono font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">APU: S/ {format(puActual)}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Val. Presup.</span>
                                                            <span className="text-[11px] font-black text-slate-700">S/ {format(valProgramada)}</span>
                                                        </div>
                                                        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100 flex justify-between items-center">
                                                            <span className="text-[8px] font-bold text-blue-400 uppercase">Val. Ejec.</span>
                                                            <span className="text-[11px] font-black text-blue-700">S/ {format(valEjecTotal)}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={`p-2 rounded-lg border text-center ${valSaldo < 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                                        <span className={`text-[8px] font-bold uppercase block -mb-0.5 ${valSaldo < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                                            {valSaldo < 0 ? 'PÃ‰RDIDA / MAYOR COSTO' : 'SALDO DISPONIBLE EN SOLES'}
                                                        </span>
                                                        <span className={`text-sm font-black ${valSaldo < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                                            S/ {format(Math.abs(valSaldo))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-px bg-slate-100 mx-2" />

                {/* â”€â”€â”€ PASO 2: UBICACIÃ“N Y ELEMENTO â”€â”€â”€ */}
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <Select
                            label="Frente"
                            value={state.frente}
                            options={['', 'F1', 'F2', 'F3', 'F4', 'F5']}
                            placeholder="Ninguno"
                            onSelect={(val) => actions.setFrente(val)}
                        />
                        <Select
                            label="Bloque"
                            value={state.bloque}
                            options={opcionesBloque}
                            placeholder="Ninguno"
                            onSelect={(val) => actions.setBloque(val)}
                        />
                        <Select
                            label="Nivel"
                            value={state.nivel}
                            options={['', 'ZZ', 'N1', 'N2', 'N3', 'N4', 'AZ']}
                            placeholder="Ninguno"
                            onSelect={(val) => actions.setNivel(val)}
                        />
                    </div>

                    <div className="space-y-2 p-3 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                        <label className="text-[10px] font-bold text-blue-800 uppercase tracking-widest pl-1 mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"/> Cuadrilla / Personal
                        </label>
                        
                        <div className="flex flex-col gap-2 bg-white/60 p-2 rounded-xl border border-blue-50">
                            <div className="flex items-center gap-2">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider w-14 shrink-0 text-right">CÃ³digo:</label>
                                <input
                                    type="text"
                                    list="cdlla-form-list"
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all uppercase"
                                    value={state.cuadrilla === 'VARIOS' ? '' : state.cuadrilla}
                                    onChange={(e) => actions.setCuadrilla(e.target.value.toUpperCase())}
                                    placeholder="Nombre de cuadrilla (Ej: C1)"
                                />
                                <datalist id="cdlla-form-list">
                                    {uniqueCuadrillas.map(c => <option key={c} value={c} />)}
                                </datalist>
                            </div>
                            
                            <div className="flex items-start gap-2">
                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider w-14 shrink-0 text-right pt-2.5">Obreros:</label>
                                <div className="flex-1">
                                    <PersonalMultiSelect 
                                        especialidad={state.especialidadSeleccionada}
                                        selectedIds={state.obreros_ids || []}
                                        onChange={(ids) => actions.setObrerosIds(ids)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Elemento / Agrupador</label>
                            <input
                                type="text"
                                value={state.elemento}
                                onChange={e => actions.setElemento(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl shadow-sm text-xs font-bold text-slate-700 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all h-9"
                                placeholder="Ej. Viga BV-206 Ejes 1-4..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-blue-600 flex items-center gap-1 uppercase tracking-wider pl-1">
                                <span className="text-blue-400 font-black">â†³</span> Detalle {state.hvacConfig ? `Especifico (${state.hvacConfig.category})` : 'EspecÃ­fico'}
                            </label>
                            {state.hvacConfig ? (
                                <SimpleSearchInput 
                                    placeholder={state.hvacConfig.category === 'TODO' ? "Buscar ducto o accesorio..." : `Buscar ${state.hvacConfig.category.toLowerCase()}...`}
                                    value={state.detalle}
                                    onChange={val => actions.setDetalle(val)}
                                    onSelect={(item: any) => {
                                        actions.setDetalle(item.label);
                                        actions.setHvacFactor(item.factor);
                                        actions.setHvacItemType(item.categoria);
                                    }}
                                    suggestions={hvacCatalog}
                                    searchField="label"
                                    className="h-8 shadow-none text-[11px]"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={state.detalle}
                                    onChange={e => actions.setDetalle(e.target.value)}
                                    className="w-full px-4 py-1.5 border border-blue-100 rounded-xl shadow-sm text-[11px] font-bold border-l-4 border-l-blue-500 bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none h-8"
                                    placeholder="Mat. / Esp. / Actividad..."
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* FILA 4: MATEMÃTICA */}
                <div className={`grid gap-1.5 bg-white/50 p-2 rounded-xl border border-slate-100 shadow-sm ${(state.formulaStrategy?.id === 'ACERO' || isInstalacion(state.partidaSeleccionada)) ? 'grid-cols-6' : 'grid-cols-5'}`}>
                    {(() => {
                        const strategy = state.formulaStrategy;
                        if (!strategy) return null;
                        const meta = { hvacItemType: state.hvacItemType, isLiquidaciones };

                        const fieldKeys: ('cantidad' | 'longitud' | 'ancho' | 'altura')[] = ['cantidad', 'longitud', 'ancho', 'altura'];
                        
                        const fields = fieldKeys.map((key) => {
                            const internalKey = key === 'longitud' ? 'longitud_area' : key === 'ancho' ? 'ancho_empalme' : key === 'altura' ? 'altura_gancho' : key;
                            const isLocked = strategy.isFieldLocked(internalKey as any, meta);
                            const label = strategy.getFieldLabel(internalKey as any, meta);

                            const nextIds: any = {
                                cantidad: 'input-longitud',
                                longitud: strategy.isFieldLocked('ancho_empalme', meta) ? 'input-altura' : 'input-ancho',
                                ancho: 'input-altura',
                                altura: 'input-veces'
                            };

                            return (
                                <div key={key} className="space-y-1">
                                    <label className={`text-[9px] font-black uppercase tracking-tighter text-center block leading-[1.1] h-[18px] flex items-end justify-center pb-0.5 ${isLocked ? 'text-slate-300' : 'text-slate-400'}`}>
                                        {label}
                                    </label>
                                    <input
                                        id={`input-${key}`}
                                        type="number"
                                        step="any"
                                        value={state[key]}
                                        disabled={isLocked}
                                        onChange={e => actions[`set${key.charAt(0).toUpperCase() + key.slice(1)}`](e.target.value === "" ? "" : Number(e.target.value))}
                                        onKeyDown={e => handleKeyDown(e, nextIds[key])}
                                        onFocus={e => e.target.select()}
                                        className={`w-full px-1 py-1 border rounded text-[11px] text-right font-mono font-bold outline-none transition-colors ${
                                            isLocked 
                                            ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed' 
                                            : 'border-slate-200 text-slate-700 bg-white focus:border-blue-500'
                                        }`}
                                        placeholder={isLocked ? "N/A" : "-"}
                                    />
                                </div>
                            );
                        });

                        const flagAcero = strategy.id === 'ACERO';
                        const isInstalacionFlag = isInstalacion(state.partidaSeleccionada);
                        
                        let extraFields = [];

                        if (flagAcero || isInstalacionFlag) {
                            const diametros = flagAcero 
                                ? ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '1"']
                                : ['1/2"', '3/4"', '1"', '1 1/4"', '1 1/2"', '2"', '2 1/2"', '3"', '4"', '6"'];
                            
                            extraFields.push(
                                <div key="diametro" className="space-y-1">
                                    <label className={`text-[9px] font-black uppercase tracking-tighter text-center block ${flagAcero ? 'text-orange-400' : 'text-blue-400'}`}>DIÃM</label>
                                    <select
                                        id="input-diametro"
                                        value={state.diametro}
                                        onChange={e => actions.setDiametro(e.target.value)}
                                        onKeyDown={e => handleKeyDown(e as any, 'input-cantidad')}
                                        className={`w-full border rounded text-[10px] font-black h-[26px] text-center outline-none ${
                                            flagAcero 
                                            ? 'border-orange-100 bg-orange-50 text-orange-700 font-bold' 
                                            : 'border-blue-100 bg-blue-50 text-blue-700 font-bold'
                                        }`}
                                    >
                                        {diametros.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            );
                        }

                        // Siempre evaluar y mostrar la casilla de VECES
                        const isVecesLocked = strategy.isFieldLocked('nro_veces', meta);
                        extraFields.push(
                            <div key="veces" className="space-y-1">
                                <label className={`text-[9px] font-black uppercase tracking-tighter text-center block ${isVecesLocked ? 'text-slate-300' : 'text-slate-400'}`}>
                                    VECES
                                </label>
                                <input
                                    id="input-veces"
                                    type="number"
                                    value={state.nroVeces}
                                    disabled={isVecesLocked}
                                    onChange={e => actions.setNroVeces(e.target.value === "" ? "" : Number(e.target.value))}
                                    onKeyDown={e => handleKeyDown(e, 'submit')}
                                    onFocus={e => e.target.select()}
                                    className={`w-full px-1 py-1 border rounded text-[11px] text-right font-mono font-bold outline-none transition-colors ${
                                        isVecesLocked
                                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                        : 'border-slate-200 text-slate-700 bg-white focus:border-blue-500'
                                    }`}
                                    placeholder={isVecesLocked ? "1" : "1"}
                                />
                            </div>
                        );

                        return [...fields, ...extraFields];
                    })()}
                </div>

                {/* RESULTADOS INTEGRADOS */}
                <div className="flex items-center justify-between px-2 -mb-1">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Parcial</span>
                            <span className="text-sm font-bold text-slate-700 font-mono">{state.parcial.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                            <span className="text-xl font-black text-blue-900 font-mono -mt-1">
                                {state.total.toFixed(2)}
                                {state.hvacFactor !== null && (
                                    <span className="text-[10px] text-blue-400 ml-1 font-bold">
                                        (x{state.hvacFactor.toFixed(3)})
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* //-----------------------------------------CODIGO DE PLANO */}
            {/* â”€â”€â”€ CÃ“DIGO DE PLANO â”€â”€â”€ */}
            {/* â”€â”€â”€ CÃ“DIGO DE PLANO â”€â”€â”€ */}
            {/* â”€â”€â”€ CÃ“DIGO DE PLANO â”€â”€â”€ */}
            <div className="space-y-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                    CÃ³digo de Plano
                </label>
                <div className="grid grid-cols-4 gap-1.5">

                    {/* CUI â€” static */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">CUI</label>
                        <input type="text" value="2361679" readOnly
                            className="w-full px-1 py-1 border border-slate-200 rounded-lg text-[11px] text-center font-mono font-bold text-slate-400 bg-slate-100 outline-none uppercase cursor-not-allowed"
                        />
                    </div>

                    {/* ENTIDAD â€” static */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">ENTIDAD</label>
                        <input type="text" value="GRC" readOnly
                            className="w-full px-1 py-1 border border-slate-200 rounded-lg text-[11px] text-center font-mono font-bold text-slate-400 bg-slate-100 outline-none uppercase cursor-not-allowed"
                        />
                    </div>

                    {/* BLOQUE â€” vinculado */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">BLOQUE</label>
                        <input type="text" value={state.bloque || 'â€”'} readOnly
                            className="w-full px-1 py-1 border border-slate-200 rounded-lg text-[11px] text-center font-mono font-bold text-slate-400 bg-slate-100 outline-none uppercase cursor-not-allowed"
                        />
                    </div>

                    {/* NIVEL â€” vinculado */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">NIVEL</label>
                        <input type="text" value={state.nivel || 'â€”'} readOnly
                            className="w-full px-1 py-1 border border-slate-200 rounded-lg text-[11px] text-center font-mono font-bold text-slate-400 bg-slate-100 outline-none uppercase cursor-not-allowed"
                        />
                    </div>

                    {/* ESP. â€” vinculado */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">ESP.</label>
                        <input type="text" value={espMap[state.especialidadSeleccionada] || 'â€”'} readOnly
                            className="w-full px-1 py-1 border border-slate-200 rounded-lg text-[11px] text-center font-mono font-bold text-slate-400 bg-slate-100 outline-none uppercase cursor-not-allowed"
                        />
                    </div>

                    {/* SIST. â€” autocomplete */}
                    <div className="space-y-1 relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">SIST.</label>
                        <input
                            type="text"
                            value={sistValue}
                            placeholder="ACB"
                            autoComplete="off"
                            onChange={e => { setSistValue(e.target.value.toUpperCase()); setShowSistSuggestions(true); }}
                            onBlur={() => setTimeout(() => setShowSistSuggestions(false), 150)}
                            onFocus={() => setShowSistSuggestions(true)}
                            className="w-full px-1 py-1 border border-slate-200 rounded-lg text-[11px] text-center font-mono font-bold text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all uppercase"
                        />
                        {/* Dropdown sugerencias */}
                        {showSistSuggestions && sistemasFiltrados.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-blue-200 rounded-xl shadow-xl overflow-hidden">
                                {sistemasFiltrados.map(s => (
                                    <button
                                        key={s.abr}
                                        type="button"
                                        onMouseDown={() => { setSistValue(s.abr); setShowSistSuggestions(false); }}
                                        className="w-full px-2 py-1.5 text-left hover:bg-blue-50 transition-colors flex items-center gap-2"
                                    >
                                        <span className="text-[11px] font-black text-blue-700 font-mono w-10 shrink-0">{s.abr}</span>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase">{s.nombre}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* TIPO DOC. â€” static */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">TIPO DOC.</label>
                        <input type="text" value="PLN" readOnly
                            className="w-full px-1 py-1 border border-slate-200 rounded-lg text-[11px] text-center font-mono font-bold text-slate-400 bg-slate-100 outline-none uppercase cursor-not-allowed"
                        />
                    </div>

                    {/* NUM â€” editable */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">NUM</label>
                        <input
                            type="text"
                            value={numValue}
                            placeholder="276"
                            onChange={e => setNumValue(e.target.value.toUpperCase())}
                            className="w-full px-1 py-1 border border-slate-200 rounded-lg text-[11px] text-center font-mono font-bold text-slate-700 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-50 outline-none transition-all uppercase"
                        />
                    </div>

                </div>

                {/* â”€â”€ PREVIEW cÃ³digo completo â”€â”€ */}
                <div className="mt-2 px-2 py-1.5 bg-slate-100 rounded-xl flex items-center gap-2 overflow-x-auto">
                    <span className="text-[9px] font-black text-slate-800 uppercase shrink-0">CÃ³digo:</span>
                    <span className="text-[11px] font-black font-mono tracking-wider whitespace-nowrap">
                        {codigoPlano.split('-').map((parte, i) => {
                            const isPlaceholder = parte === '?';
                            return (
                                <span key={i}>
                                    {i > 0 && <span className="text-slate-600 mx-0.5">-</span>}
                                    <span className={isPlaceholder ? 'text-slate-600' : 'text-slate-800'}>
                                        {parte}
                                    </span>
                                </span>
                            );
                        })}
                    </span>
                </div>
            </div>
            

{/* //------------------------------------ HASTA AQUI ---------------------------------- */}



            {isDateLocked && (
                <div className="bg-red-50 border border-red-200 p-2 rounded-lg flex items-center gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-[10px] font-bold text-red-700 uppercase tracking-tight">Periodo de metrados bloqueado / fuera de fecha</span>
                </div>
            )}

            <button
                id="submit"
                onClick={handleOnGuardar}
                disabled={isSubmitting || isDateLocked || !state.partidaSeleccionada || (state.total === 0 && !(state.formulaStrategy?.id === 'ACERO' && state.cantidad !== "" && state.cantidad > 0))}
                className={`w-full py-3 rounded-xl font-black text-[11px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all shadow-md ${(isSubmitting || isDateLocked || !state.partidaSeleccionada || (state.total === 0 && !(state.formulaStrategy?.id === 'ACERO' && state.cantidad !== "" && state.cantidad > 0)))
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg active:scale-[0.98]'
                    }`}
            >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'GUARDANDO...' : (isDateLocked ? 'FECHA BLOQUEADA' : 'REGISTRAR METRADO')}
            </button>
        </div>
    );
};


