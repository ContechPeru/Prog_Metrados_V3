import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useMetradosStore } from '../store/useMetradosStore';
import { 
    X, CheckCircle, AlertTriangle, Search, ChevronDown, ChevronUp,
    ArrowRightCircle, DollarSign, Copy, Trash2, RefreshCcw, Info, Pencil
} from 'lucide-react';

interface PartidaPC {
    id: string;
    codigo: string;
    descripcion: string;
    unidad: string;
    modificacion: string;
    especialidad?: string;
    tipo_metrado?: string;
    precio_unitario?: number;
    metrado_programado?: number;
    creado_por?: string;
    created_at?: string;
    // Calculados desde metrados
    total_registros: number;
    total_acumulado: number;
    valorizado_aprox: number;
}

interface GestionPartidasPCProps {
    onClose: () => void;
    isReadOnly?: boolean;
}

const MODIFICACIONES = ['PC-OF', 'MM5', 'MM6', 'PN4', 'PN5', 'PN6', 'ET', 'AD'];

export const GestionPartidasPC: React.FC<GestionPartidasPCProps> = ({ onClose, isReadOnly }) => {
    const { catalogoHospital, catalogoContingencia, fetchCatalogoMaestro, fetchCustomPartidas } = useMetradosStore();
    
    const [partidas, setPartidas] = useState<PartidaPC[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Estados del modal de oficialización
    const [modalOfic, setModalOfic] = useState<PartidaPC | null>(null);
    const [oficData, setOficData] = useState({
        pu_actual: 0,
        metrado_programado: 0,
        modificacion: 'PC-OF',
        parent_codigo: '',
        proyecto: 'hospital' as 'hospital' | 'contingencia',
    });
    const [oficLoading, setOficLoading] = useState(false);
    const [oficResult, setOficResult] = useState<{ ok: boolean; msg: string } | null>(null);

    // Estados del modal de edición de PU
    const [modalPU, setModalPU] = useState<PartidaPC | null>(null);
    const [nuevoPU, setNuevoPU] = useState(0);
    const [puLoading, setPuLoading] = useState(false);

    // Detector de duplicados
    const [duplicados, setDuplicados] = useState<{ custom: PartidaPC; enCatalogo: boolean }[]>([]);

    // Estado modal Renombrar Código
    const [modalRenombrar, setModalRenombrar] = useState<PartidaPC | null>(null);
    const [renombreCodigo, setRenombreCodigo] = useState('');
    const [renombreDescripcion, setRenombreDescripcion] = useState('');
    const [renombreLoading, setRenombreLoading] = useState(false);
    const [renombreResult, setRenombreResult] = useState<{ ok: boolean; msg: string } | null>(null);

    // ─── Carga de datos ─────────────────────────────────────────────────────
    const cargarPartidas = async () => {
        setLoading(true);
        try {
            // 1. Obtener todas las partidas personalizadas
            const { data: pcs, error: errPc } = await (supabase.from('partidas_personalizadas') as any)
                .select('*').order('codigo') as any;
            if (errPc) throw errPc;

            // 2. Obtener totales agrupados desde metrados
            const { data: totales, error: errTot } = await (supabase.from('metrados') as any)
                .select('custom_partida_id, total')
                .not('custom_partida_id', 'is', null) as any;
            if (errTot) throw errTot;

            // Agrupar totales por custom_partida_id
            const totalesMap: Record<string, { registros: number; suma: number }> = {};
            (totales || []).forEach((m: any) => {
                if (!totalesMap[m.custom_partida_id]) {
                    totalesMap[m.custom_partida_id] = { registros: 0, suma: 0 };
                }
                totalesMap[m.custom_partida_id].registros++;
                totalesMap[m.custom_partida_id].suma += (m.total || 0);
            });

            // 3. Combinar
            const resultado: PartidaPC[] = (pcs || []).map((pc: any) => {
                const t = totalesMap[pc.id] || { registros: 0, suma: 0 };
                const pu = pc.precio_unitario || 0;
                return {
                    ...pc,
                    total_registros: t.registros,
                    total_acumulado: t.suma,
                    valorizado_aprox: t.suma * pu,
                };
            });

            setPartidas(resultado);

            // 4. Detectar duplicados en catálogo
            const allCatalogo = [...catalogoHospital, ...catalogoContingencia];
            const codigosCat = new Set(allCatalogo.map(p => p.codigo.trim().toUpperCase()));
            const dups = resultado.map(pc => ({
                custom: pc,
                enCatalogo: codigosCat.has(pc.codigo.trim().toUpperCase())
            })).filter(d => d.enCatalogo);
            setDuplicados(dups);

        } catch (e: any) {
            console.error('Error cargando partidas PC:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { cargarPartidas(); }, []);

    // ─── Filtrado ────────────────────────────────────────────────────────────
    const partidasFiltradas = useMemo(() => {
        const q = busqueda.toLowerCase();
        return partidas.filter(p =>
            p.codigo.toLowerCase().includes(q) ||
            p.descripcion.toLowerCase().includes(q)
        );
    }, [partidas, busqueda]);

    // ─── Oficializar ─────────────────────────────────────────────────────────
    const handleAbrirOficializacion = (pc: PartidaPC) => {
        setModalOfic(pc);
        setOficResult(null);
        setOficData({
            pu_actual: pc.precio_unitario || 0,
            metrado_programado: pc.metrado_programado || 0,
            modificacion: 'PC-OF',
            parent_codigo: '',
            proyecto: 'hospital',
        });
    };

    const handleConfirmarOficializacion = async () => {
        if (!modalOfic || isReadOnly) return;
        setOficLoading(true);
        setOficResult(null);
        try {
            // Buscar proyecto_id
            const { data: proyectos } = await (supabase.from('proyectos') as any)
                .select('id, codigo') as any;
            const proyCode = oficData.proyecto === 'hospital' ? 'HOSP' : 'CONT';
            const proyId = proyectos?.find((p: any) => p.codigo === proyCode)?.id;
            if (!proyId) throw new Error('Proyecto no encontrado en BD');

            // Buscar parent_id por código
            let parentId: string | null = null;
            if (oficData.parent_codigo) {
                const { data: parentRow } = await (supabase.from('catalogo_partidas') as any)
                    .select('id').eq('codigo', oficData.parent_codigo.trim()).maybeSingle() as any;
                parentId = parentRow?.id || null;
            }

            // Llamar a la función SQL
            const metradoAntAcum = modalOfic.total_acumulado;
            const valAntAcum = metradoAntAcum * (oficData.pu_actual || 0);

            const { data, error } = await (supabase.rpc as any)('oficializar_partida_pc', {
                p_custom_id: modalOfic.id,
                p_proyecto_id: proyId,
                p_parent_id: parentId,
                p_pu_actual: oficData.pu_actual,
                p_metrado_prog: oficData.metrado_programado,
                p_metrado_ant_acum: metradoAntAcum,
                p_valorizacion_ant: valAntAcum,
                p_modificacion: oficData.modificacion,
            });

            if (error) throw error;

            setOficResult({ ok: true, msg: `✅ ${modalOfic.codigo} oficializada correctamente. Nuevo ID: ${data}` });
            await cargarPartidas();
            await fetchCatalogoMaestro();
            await fetchCustomPartidas();

            setTimeout(() => {
                setModalOfic(null);
                setOficResult(null);
            }, 3000);

        } catch (e: any) {
            setOficResult({ ok: false, msg: `❌ Error: ${e.message}` });
        } finally {
            setOficLoading(false);
        }
    };

    // ─── Editar PU ───────────────────────────────────────────────────────────
    const handleGuardarPU = async () => {
        if (!modalPU || isReadOnly) return;
        setPuLoading(true);
        try {
            const { error } = await (supabase.from('partidas_personalizadas') as any)
                .update({ precio_unitario: nuevoPU })
                .eq('id', modalPU.id);
            if (error) throw error;
            await cargarPartidas();
            setModalPU(null);
        } catch (e: any) {
            alert('Error actualizando PU: ' + e.message);
        } finally {
            setPuLoading(false);
        }
    };

    // ─── Eliminar PC (sin metrados) ──────────────────────────────────────────
    const handleEliminarPC = async (pc: PartidaPC) => {
        if (isReadOnly) return;
        if (pc.total_registros > 0) {
            alert(`No se puede eliminar: tiene ${pc.total_registros} metrados registrados. Oficialízala primero.`);
            return;
        }
        if (!confirm(`¿Eliminar la partida PC "${pc.codigo} - ${pc.descripcion}"? Esta acción es irreversible.`)) return;
        const { error } = await (supabase.from('partidas_personalizadas') as any).delete().eq('id', pc.id);
        if (error) { alert('Error: ' + error.message); return; }
        await cargarPartidas();
        await fetchCustomPartidas();
    };

    // ─── Renombrar Código + Sincronizar Metrados ──────────────────────────────
    const handleAbrirRenombrar = (pc: PartidaPC) => {
        setModalRenombrar(pc);
        setRenombreCodigo(pc.codigo);
        setRenombreDescripcion(pc.descripcion);
        setRenombreResult(null);
    };

    const handleConfirmarRenombre = async () => {
        if (!modalRenombrar || isReadOnly) return;
        const codigoNuevo = renombreCodigo.trim().toUpperCase();
        const descNueva = renombreDescripcion.trim().toUpperCase();
        if (!codigoNuevo) return;

        setRenombreLoading(true);
        setRenombreResult(null);
        try {
            // 1. Actualizar codigo + descripcion en partidas_personalizadas
            const { error: errPc } = await (supabase.from('partidas_personalizadas') as any)
                .update({ codigo: codigoNuevo, descripcion: descNueva })
                .eq('id', modalRenombrar.id);
            if (errPc) throw errPc;

            // 2. Sincronizar metrados: actualizar codigo_partida y descripcion_partida
            // para todos los registros vinculados por custom_partida_id
            const { error: errM, count } = await (supabase.from('metrados') as any)
                .update({
                    codigo_partida: codigoNuevo,
                    descripcion_partida: descNueva,
                })
                .eq('custom_partida_id', modalRenombrar.id);
            if (errM) throw errM;

            setRenombreResult({
                ok: true,
                msg: `✅ Código actualizado a "${codigoNuevo}". ${count ?? modalRenombrar.total_registros} metrados sincronizados.`
            });
            await cargarPartidas();
            await fetchCustomPartidas();

            setTimeout(() => { setModalRenombrar(null); setRenombreResult(null); }, 2500);
        } catch (e: any) {
            setRenombreResult({ ok: false, msg: `❌ Error: ${e.message}` });
        } finally {
            setRenombreLoading(false);
        }
    };

    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="fixed inset-0 z-[500] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-600 to-pink-500 text-white">
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-widest">Gestión de Partidas Creadas (PC)</h2>
                        <p className="text-[11px] text-pink-100 font-medium mt-0.5">
                            {partidas.length} partidas personalizadas · {duplicados.length > 0 ? `⚠️ ${duplicados.length} posibles duplicadas` : '✅ Sin duplicados'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={cargarPartidas} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Recargar">
                            <RefreshCcw size={16} />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Búsqueda */}
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3">
                    <Search size={14} className="text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código o descripción..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        className="flex-1 text-sm outline-none text-slate-700 placeholder-slate-300"
                        autoFocus
                    />
                    {busqueda && <button onClick={() => setBusqueda('')} className="text-slate-300 hover:text-slate-500"><X size={14} /></button>}
                </div>

                {/* Alerta de duplicados */}
                {duplicados.length > 0 && (
                    <div className="mx-6 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                        <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-[12px] font-bold text-amber-800">Duplicados detectados en catálogo oficial</p>
                            <p className="text-[11px] text-amber-600 mt-0.5">
                                {duplicados.map(d => d.custom.codigo).join(', ')} — ya existen en <code>catalogo_partidas</code>.
                                Usa el script SQL <code>0004_fix_OE1111.21_duplicado.sql</code> para limpiarlos.
                            </p>
                        </div>
                    </div>
                )}

                {/* Tabla */}
                <div className="flex-1 overflow-auto px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando...</div>
                    ) : partidasFiltradas.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
                            {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay partidas personalizadas creadas'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {partidasFiltradas.map(pc => {
                                const isDup = duplicados.some(d => d.custom.id === pc.id);
                                const isExpanded = expandedId === pc.id;

                                return (
                                    <div
                                        key={pc.id}
                                        className={`border rounded-xl overflow-hidden transition-all ${isDup ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}`}
                                    >
                                        {/* Row principal */}
                                        <div className="flex items-center gap-3 px-4 py-3">
                                            {/* Punto PC rosado */}
                                            <div className="w-3 h-3 rounded-full bg-pink-500 border-2 border-pink-300 shrink-0" title="Partida Creada (PC)" />

                                            {/* Código + Descripción */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-blue-600 font-mono">{pc.codigo}</span>
                                                    {isDup && <span className="text-[9px] bg-amber-100 text-amber-700 border border-amber-200 rounded px-1 py-0.5 font-bold">DUPLICADO</span>}
                                                    <span className="text-[9px] text-slate-400 font-mono">{pc.unidad}</span>
                                                </div>
                                                <p className="text-[12px] text-slate-700 font-medium truncate mt-0.5">{pc.descripcion}</p>
                                            </div>

                                            {/* Stats */}
                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="text-right">
                                                    <span className="block text-[9px] text-slate-400 uppercase">Registros</span>
                                                    <span className={`text-[13px] font-black ${pc.total_registros > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                                                        {pc.total_registros}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[9px] text-slate-400 uppercase">Acumulado</span>
                                                    <span className={`text-[13px] font-black font-mono ${pc.total_acumulado > 0 ? 'text-blue-700' : 'text-slate-300'}`}>
                                                        {fmt(pc.total_acumulado)}
                                                    </span>
                                                </div>
                                                {(pc.precio_unitario || 0) > 0 && (
                                                    <div className="text-right">
                                                        <span className="block text-[9px] text-slate-400 uppercase">Valorizado</span>
                                                        <span className="text-[13px] font-black font-mono text-emerald-600">
                                                            S/{fmt(pc.valorizado_aprox)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Acciones */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {!isReadOnly && (
                                                    <>
                                                        <button
                                                            onClick={() => handleAbrirRenombrar(pc)}
                                                            className="p-1.5 rounded-lg hover:bg-violet-50 text-violet-500 transition-colors"
                                                            title="Renombrar código (sincroniza sus metrados)"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setModalPU(pc); setNuevoPU(pc.precio_unitario || 0); }}
                                                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                                            title="Asignar Precio Unitario"
                                                        >
                                                            <DollarSign size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAbrirOficializacion(pc)}
                                                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                            title="Oficializar al catálogo"
                                                        >
                                                            <ArrowRightCircle size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEliminarPC(pc)}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                                                            title={pc.total_registros > 0 ? 'No se puede eliminar (tiene metrados)' : 'Eliminar partida'}
                                                            disabled={pc.total_registros > 0}
                                                        >
                                                            <Trash2 size={14} className={pc.total_registros > 0 ? 'opacity-30' : ''} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : pc.id)}
                                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                                                >
                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Detalle expandido */}
                                        {isExpanded && (
                                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 grid grid-cols-3 gap-3 text-[11px]">
                                                <div><span className="text-slate-400 uppercase tracking-wide font-bold">PU Asignado:</span> <span className="font-black text-slate-700">S/{fmt(pc.precio_unitario || 0)}</span></div>
                                                <div><span className="text-slate-400 uppercase tracking-wide font-bold">Meta:</span> <span className="font-black text-slate-700">{fmt(pc.metrado_programado || 0)} {pc.unidad}</span></div>
                                                <div><span className="text-slate-400 uppercase tracking-wide font-bold">Especialidad:</span> <span className="font-black text-slate-700">{pc.especialidad || '—'}</span></div>
                                                <div><span className="text-slate-400 uppercase tracking-wide font-bold">Tipo Metrado:</span> <span className="font-black text-slate-700">{pc.tipo_metrado || 'ESTANDAR'}</span></div>
                                                <div><span className="text-slate-400 uppercase tracking-wide font-bold">Creado por:</span> <span className="font-black text-slate-700">{pc.creado_por || '—'}</span></div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-400 uppercase tracking-wide font-bold">UUID:</span>
                                                    <span className="font-mono text-[9px] text-slate-500 truncate">{pc.id}</span>
                                                    <button onClick={() => navigator.clipboard.writeText(pc.id)} className="shrink-0 text-slate-300 hover:text-slate-600">
                                                        <Copy size={10} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer resumen */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                        <b className="text-slate-700">{partidas.length}</b> total ·
                        <b className="text-blue-600 ml-1">{partidas.filter(p => p.total_registros > 0).length}</b> con metrados ·
                        <b className="text-slate-300 ml-1">{partidas.filter(p => p.total_registros === 0).length}</b> sin uso
                    </span>
                    <span className="text-pink-500 font-bold">● Color rosado = Partida Creada en Campo</span>
                </div>
            </div>

            {/* ─── MODAL: ASIGNAR PU ─────────────────────────────────────────────── */}
            {modalPU && (
                <div className="fixed inset-0 z-[600] bg-black/50 flex items-center justify-center p-4" onClick={() => setModalPU(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 uppercase">Asignar Precio Unitario</h3>
                            <button onClick={() => setModalPU(null)}><X size={16} className="text-slate-400" /></button>
                        </div>
                        <div className="bg-blue-50 rounded-xl px-4 py-3">
                            <p className="text-[11px] font-black text-blue-700">{modalPU.codigo}</p>
                            <p className="text-[11px] text-blue-500 mt-0.5">{modalPU.descripcion}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Precio Unitario (S/)</label>
                            <input
                                type="number"
                                step="0.001"
                                value={nuevoPU}
                                onChange={e => setNuevoPU(parseFloat(e.target.value) || 0)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>
                        <div className="bg-slate-50 rounded-lg px-3 py-2 text-[11px] text-slate-500">
                            Valorizado aprox: <b className="text-emerald-600">S/{fmt(modalPU.total_acumulado * nuevoPU)}</b>
                            ({fmt(modalPU.total_acumulado)} {modalPU.unidad} × S/{fmt(nuevoPU)})
                        </div>
                        <button
                            onClick={handleGuardarPU}
                            disabled={puLoading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                            {puLoading ? 'Guardando...' : 'Guardar PU'}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── MODAL: OFICIALIZAR ─────────────────────────────────────────────── */}
            {modalOfic && (
                <div className="fixed inset-0 z-[600] bg-black/50 flex items-center justify-center p-4" onClick={() => !oficLoading && setModalOfic(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase">Oficializar Partida PC</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Moverá la partida al catálogo oficial con todos sus metrados</p>
                            </div>
                            <button onClick={() => setModalOfic(null)} disabled={oficLoading}><X size={16} className="text-slate-400" /></button>
                        </div>

                        {/* Info de la partida */}
                        <div className="bg-pink-50 rounded-xl px-4 py-3 border border-pink-100">
                            <p className="text-[10px] font-black text-pink-500 uppercase">Partida a oficializar</p>
                            <p className="text-[13px] font-black text-slate-800 mt-1">{modalOfic.codigo}</p>
                            <p className="text-[11px] text-slate-500">{modalOfic.descripcion}</p>
                            <div className="flex gap-4 mt-2 text-[11px]">
                                <span className="text-slate-500">{modalOfic.total_registros} registros</span>
                                <span className="text-blue-600 font-bold">Acumulado: {fmt(modalOfic.total_acumulado)} {modalOfic.unidad}</span>
                            </div>
                        </div>

                        {/* Formulario */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Proyecto</label>
                                <select
                                    value={oficData.proyecto}
                                    onChange={e => setOficData(d => ({ ...d, proyecto: e.target.value as any }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                >
                                    <option value="hospital">Hospital (HOSP)</option>
                                    <option value="contingencia">Contingencia (CONT)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Modificación</label>
                                <select
                                    value={oficData.modificacion}
                                    onChange={e => setOficData(d => ({ ...d, modificacion: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                >
                                    {MODIFICACIONES.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">PU Actual (S/)</label>
                                <input
                                    type="number" step="0.001"
                                    value={oficData.pu_actual}
                                    onChange={e => setOficData(d => ({ ...d, pu_actual: parseFloat(e.target.value) || 0 }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Meta / Metrado Prog.</label>
                                <input
                                    type="number" step="0.01"
                                    value={oficData.metrado_programado}
                                    onChange={e => setOficData(d => ({ ...d, metrado_programado: parseFloat(e.target.value) || 0 }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                    Código Padre (Parent) en Catálogo
                                    <span title="Ej: OE.1.1.1 — nodo padre en catalogo_partidas. Déjalo vacío si va en raíz.">
                                        <Info size={10} className="text-slate-300" />
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: OE.1.1.1 (opcional)"
                                    value={oficData.parent_codigo}
                                    onChange={e => setOficData(d => ({ ...d, parent_codigo: e.target.value.toUpperCase() }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Resumen calculado */}
                        <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1 text-[11px]">
                            <p className="font-bold text-slate-600 uppercase tracking-wide">Qué se registrará:</p>
                            <div className="grid grid-cols-2 gap-1 text-slate-500 mt-1">
                                <span>Metrado Anterior Acumulado:</span>
                                <span className="font-black text-slate-700">{fmt(modalOfic.total_acumulado)} {modalOfic.unidad}</span>
                                <span>Valorización Anterior:</span>
                                <span className="font-black text-emerald-600">S/{fmt(modalOfic.total_acumulado * oficData.pu_actual)}</span>
                                <span>PU Actual:</span>
                                <span className="font-black text-slate-700">S/{fmt(oficData.pu_actual)}</span>
                                <span>Meta Total:</span>
                                <span className="font-black text-slate-700">{fmt(oficData.metrado_programado)} {modalOfic.unidad}</span>
                            </div>
                        </div>

                        {/* Advertencia */}
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                            <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-amber-700">
                                Esta acción es <b>irreversible</b>. Se insertará en <code>catalogo_partidas</code>,
                                se reasignarán <b>{modalOfic.total_registros} metrados</b> y se eliminará de <code>partidas_personalizadas</code>.
                            </p>
                        </div>

                        {/* Resultado */}
                        {oficResult && (
                            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-[12px] font-bold ${oficResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {oficResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                {oficResult.msg}
                            </div>
                        )}

                        <button
                            onClick={handleConfirmarOficializacion}
                            disabled={oficLoading || !!oficResult?.ok}
                            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <ArrowRightCircle size={16} />
                            {oficLoading ? 'Oficializando...' : 'Confirmar Oficialización'}
                        </button>
                    </div>
                </div>
            )}
            {/* ─── MODAL: RENOMBRAR CÓDIGO ──────────────────────────────────────────── */}
            {modalRenombrar && (
                <div className="fixed inset-0 z-[600] bg-black/50 flex items-center justify-center p-4" onClick={() => !renombreLoading && setModalRenombrar(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase">✏️ Renombrar Código PC</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Sincroniza automáticamente todos los metrados vinculados</p>
                            </div>
                            <button onClick={() => setModalRenombrar(null)} disabled={renombreLoading}><X size={16} className="text-slate-400" /></button>
                        </div>

                        <div className="bg-violet-50 rounded-xl px-4 py-3 border border-violet-100">
                            <p className="text-[10px] font-black text-violet-500 uppercase">Código actual</p>
                            <p className="text-[13px] font-black font-mono text-slate-800">{modalRenombrar.codigo}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{modalRenombrar.total_registros} metrados vinculados serán actualizados</p>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Nuevo Código</label>
                                <input
                                    type="text"
                                    value={renombreCodigo}
                                    onChange={e => setRenombreCodigo(e.target.value.toUpperCase())}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold outline-none focus:border-violet-500 uppercase"
                                    placeholder="Ej: OE.2.3.7.99"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Nueva Descripción (opcional)</label>
                                <input
                                    type="text"
                                    value={renombreDescripcion}
                                    onChange={e => setRenombreDescripcion(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-violet-500"
                                    placeholder="Descripción de la partida..."
                                />
                            </div>
                        </div>

                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            <AlertTriangle size={12} className="text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-amber-700">
                                Se actualizará el <b>código</b> y la <b>descripción</b> de la partida Y de todos sus
                                <b> {modalRenombrar.total_registros} metrados</b> registrados (campo <code>codigo_partida</code>).
                            </p>
                        </div>

                        {renombreResult && (
                            <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-[12px] font-bold ${renombreResult.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {renombreResult.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                {renombreResult.msg}
                            </div>
                        )}

                        <button
                            onClick={handleConfirmarRenombre}
                            disabled={renombreLoading || !renombreCodigo.trim() || renombreCodigo.trim() === modalRenombrar.codigo}
                            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Pencil size={14} />
                            {renombreLoading ? 'Actualizando...' : 'Confirmar Renombre y Sincronizar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
