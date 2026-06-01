import React, { useState, useMemo, useRef } from 'react';
import { 
    X, Search, Database, ShieldCheck, Edit, Plus, 
    Settings2, Trash2, Layers, ListFilter, Save,
    RotateCcw, FileSpreadsheet, CheckCircle2
} from 'lucide-react';
import { useMetradosStore } from '../store/useMetradosStore';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Partida } from '../types';
import { supabase } from '../lib/supabase';

interface AdminPresupuestoProps {
    onClose: () => void;
}

export const AdminPresupuesto: React.FC<AdminPresupuestoProps> = ({ onClose }) => {
    const { catalogoHospital, catalogoContingencia, updateCatalogoPartida } = useMetradosStore();
    const [activeTab, setActiveTab] = useState<'partidas' | 'logs'>('partidas');
    const [activeProject, setActiveProject] = useState<'hospital' | 'contingencia'>('hospital');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<Partida>>({});
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    
    // Filters for Sidebar
    const [filterTipo, setFilterTipo] = useState<string>('ALL');
    const [filterValoriza, setFilterValoriza] = useState<'ALL' | 'SI' | 'NO'>('ALL');

    const parentRef = useRef<HTMLDivElement>(null);

    const currentCatalog = useMemo(() => {
        let raw = activeProject === 'hospital' ? catalogoHospital : catalogoContingencia;
        
        // Search Filter
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            raw = raw.filter(p => p.codigo.toLowerCase().includes(s) || p.descripcion.toLowerCase().includes(s));
        }

        // Tipo Filter
        if (filterTipo !== 'ALL') {
            raw = raw.filter(p => p.tipo_metrado === filterTipo);
        }

        // Valoriza Filter
        if (filterValoriza !== 'ALL') {
            const v = filterValoriza === 'SI';
            raw = raw.filter(p => (p.se_valoriza ?? true) === v);
        }

        return raw;
    }, [activeProject, catalogoHospital, catalogoContingencia, searchTerm, filterTipo, filterValoriza]);

    const rowVirtualizer = useVirtualizer({
        count: currentCatalog.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48, // Ultra-compact Power BI style
        overscan: 20,
    });

    const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
            const { data } = await (supabase.from('logs_maestro_presupuesto') as any)
                .select('*')
                .order('fecha', { ascending: false })
                .limit(100);
            if (data) setLogs(data);
        } catch (e) {
            console.error('Error fetching logs:', e);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleEditStart = (p: Partida) => {
        setEditingId(p.id);
        setEditValues({
            descripcion: p.descripcion,
            pu_actual: p.pu_actual || p.precio_unitario || 0,
            tipo_metrado: p.tipo_metrado,
            se_valoriza: p.se_valoriza ?? true
        });
    };

    const handleSaveEdit = async (id: string) => {
        const success = await updateCatalogoPartida(id, editValues, activeProject);
        if (success) {
            setEditingId(null);
        } else {
            alert("Error al guardar cambios en el servidor");
        }
    };

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(num);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4">
            {/* Power BI Studio Container */}
            <div className="bg-[#F3F2F1] w-full max-w-[1600px] h-[95vh] rounded shadow-2xl flex border border-slate-300 overflow-hidden font-sans text-slate-800">
                
                {/* 1. SIDE NAVIGATOR (Studio Filters) */}
                <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
                    <div className="p-6 border-b border-slate-100 flex flex-col gap-1">
                        <div className="flex items-center gap-3 text-[#005A9C]">
                            <ShieldCheck size={24} />
                            <h2 className="text-sm font-black uppercase tracking-tight">Admin Studio</h2>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-9">Management Console</span>
                    </div>

                    <div className="flex-1 overflow-auto p-4 space-y-8">
                        {/* Tab Switcher */}
                        <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200 mb-6">
                            <button 
                                onClick={() => setActiveTab('partidas')}
                                className={`flex-1 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'partidas' ? 'bg-white text-[#005A9C] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Catálogo
                            </button>
                            <button 
                                onClick={() => { setActiveTab('logs'); fetchLogs(); }}
                                className={`flex-1 py-2 rounded text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white text-[#005A9C] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Bitácora
                            </button>
                        </div>

                        {/* Project Slicer */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Database size={12} /> Dataset de Proyecto
                            </label>
                            <div className="space-y-1">
                                <button 
                                    onClick={() => setActiveProject('hospital')}
                                    className={`w-full text-left px-4 py-2.5 rounded text-[11px] font-bold flex items-center justify-between transition-all ${activeProject === 'hospital' ? 'bg-[#005A9C] text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    Hospital <CheckCircle2 size={14} className={activeProject === 'hospital' ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <button 
                                    onClick={() => setActiveProject('contingencia')}
                                    className={`w-full text-left px-4 py-2.5 rounded text-[11px] font-bold flex items-center justify-between transition-all ${activeProject === 'contingencia' ? 'bg-[#005A9C] text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    Contingencia <CheckCircle2 size={14} className={activeProject === 'contingencia' ? 'opacity-100' : 'opacity-0'} />
                                </button>
                            </div>
                        </div>

                        {/* Filters Slicers */}
                        {activeTab === 'partidas' && (
                            <div className="space-y-6 pt-4 border-t border-slate-100">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Layers size={12} /> Tipo de Metrado
                                    </label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2.5 text-[11px] font-bold focus:ring-2 focus:ring-[#005A9C]/20 outline-none"
                                        value={filterTipo}
                                        onChange={(e) => setFilterTipo(e.target.value)}
                                    >
                                        <option value="ALL">TODOS LOS TIPOS</option>
                                        <option value="ESTANDAR">ESTÁNDAR</option>
                                        <option value="ACERO">ACERO</option>
                                        <option value="HVAC_DUCTO">DUCTOS HVAC</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <ListFilter size={12} /> Criterio Valorización
                                    </label>
                                    <div className="flex gap-1 bg-slate-100 p-1 rounded border border-slate-200">
                                        {(['ALL', 'SI', 'NO'] as const).map(v => (
                                            <button 
                                                key={v}
                                                onClick={() => setFilterValoriza(v)}
                                                className={`flex-1 py-2 rounded text-[9px] font-black uppercase transition-all ${filterValoriza === v ? 'bg-[#107C41] text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                {v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-[#F8F9FA]">
                        <button 
                            onClick={onClose}
                            className="w-full py-2.5 rounded text-[11px] font-black uppercase text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-all flex items-center justify-center gap-2"
                        >
                            <X size={14} /> Minimizar Panel
                        </button>
                    </div>
                </aside>

                {/* 2. DATA GRID AREA */}
                <main className="flex-1 flex flex-col min-w-0 bg-white">
                    {/* Control Toolbar */}
                    <div className="bg-[#FFFFFF] border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-20">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1 max-w-xl group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#005A9C] transition-colors" size={14} />
                                <input 
                                    type="text"
                                    placeholder="Buscar por código, WBS o descripción..."
                                    className="w-full pl-10 pr-4 py-2 bg-[#F8F9FA] border border-slate-200 rounded-sm text-[12px] font-medium focus:ring-2 focus:ring-[#005A9C]/10 focus:border-[#005A9C]/50 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="h-6 w-px bg-slate-200 mx-2"></div>
                            <button className="flex items-center gap-2 h-9 px-4 bg-white border border-slate-200 rounded-sm text-[11px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all group">
                                <FileSpreadsheet size={14} className="text-[#107C41]" />
                                Export Excel
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="bg-[#005A9C] hover:bg-[#004A81] text-white h-9 px-6 rounded-sm text-[11px] font-black uppercase flex items-center gap-2 shadow-sm transition-all active:scale-95">
                                <Plus size={16} strokeWidth={3} />
                                Nuevo Ítem
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative flex flex-col">
                        {activeTab === 'partidas' ? (
                            <div className="flex-1 flex flex-col relative overflow-hidden">
                                {/* Grid Header (Sticky) */}
                                <div className="bg-slate-100 px-6 py-3 border-b border-slate-300 grid grid-cols-12 gap-4 text-[9px] font-black text-slate-500 uppercase tracking-widest z-10 sticky top-0">
                                    <div className="col-span-1 border-r border-slate-200">WBS Code</div>
                                    <div className="col-span-1 text-center border-r border-slate-200">Valoriza</div>
                                    <div className="col-span-5 border-r border-slate-200 pl-2">Descripción de la Partida</div>
                                    <div className="col-span-1 text-center border-r border-slate-200">Unid.</div>
                                    <div className="col-span-1 text-center border-r border-slate-200">Tipo</div>
                                    <div className="col-span-2 text-right border-r border-slate-200 pr-4 italic">Precio Unit. (S/)</div>
                                    <div className="col-span-1 text-center">Acción</div>
                                </div>

                                <div 
                                    ref={parentRef}
                                    className="flex-1 overflow-auto bg-[#FBFBFA]"
                                >
                                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                                        {rowVirtualizer.getVirtualItems().map((vRow) => {
                                            const p = currentCatalog[vRow.index];
                                            const isEditing = editingId === p.id;

                                            return (
                                                <div
                                                    key={p.id}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: `${vRow.size}px`,
                                                        transform: `translateY(${vRow.start}px)`,
                                                    }}
                                                    className={`border-b border-slate-200 flex items-center px-6 transition-all ${p.es_titulo ? 'bg-slate-200/40' : 'hover:bg-[#EBF3FB] group bg-white'}`}
                                                >
                                                    <div className="grid grid-cols-12 w-full items-center gap-4 text-[11px]">
                                                        {/* WBS */}
                                                        <div className="col-span-1 font-mono font-black text-slate-400 group-hover:text-[#005A9C] uppercase tracking-tighter truncate">{p.codigo}</div>
                                                        
                                                        {/* VALORIZA CONTROL */}
                                                        <div className="col-span-1 flex justify-center">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-4 h-4 cursor-pointer accent-[#107C41]"
                                                                    checked={editValues.se_valoriza}
                                                                    onChange={(e) => setEditValues({...editValues, se_valoriza: e.target.checked})}
                                                                />
                                                            ) : (
                                                                !p.es_titulo && (
                                                                    <div 
                                                                        className={`w-2 h-2 rounded-full ${p.se_valoriza !== false ? 'bg-[#107C41]' : 'bg-slate-300'}`}
                                                                        title={p.se_valoriza !== false ? 'Partida Valorizable' : 'Operativo (No financiero)'}
                                                                    />
                                                                )
                                                            )}
                                                        </div>

                                                        {/* DESCRIPTION */}
                                                        <div className="col-span-5 flex items-center gap-2 truncate">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="text"
                                                                    className="w-full bg-white border border-[#005A9C] outline-none px-2 py-1 text-[11px] font-bold shadow-sm"
                                                                    value={editValues.descripcion}
                                                                    onChange={(e) => setEditValues({...editValues, descripcion: e.target.value.toUpperCase()})}
                                                                />
                                                            ) : (
                                                                <span className={`truncate ${p.es_titulo ? 'font-black uppercase tracking-tight text-slate-800' : 'font-bold text-slate-600'}`}>
                                                                    {p.descripcion}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* UNIDAD */}
                                                        <div className="col-span-1 text-center font-serif italic text-slate-400 uppercase">{p.unidad}</div>
                                                        
                                                        {/* TIPO */}
                                                        <div className="col-span-1 text-center">
                                                            {isEditing ? (
                                                                <select 
                                                                    className="w-full bg-white border border-[#005A9C] text-[10px] font-black uppercase outline-none"
                                                                    value={editValues.tipo_metrado}
                                                                    onChange={(e) => setEditValues({...editValues, tipo_metrado: e.target.value})}
                                                                >
                                                                    <option value="ESTANDAR">EST</option>
                                                                    <option value="ACERO">ACR</option>
                                                                    <option value="HVAC_DUCTO">DCT</option>
                                                                </select>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                                    {p.tipo_metrado?.substring(0,3) || 'EST'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* PRECIO UNITARIO */}
                                                        <div className="col-span-2 text-right pr-4">
                                                            {isEditing ? (
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <span className="text-[9px] text-[#005A9C] font-black">S/</span>
                                                                    <input 
                                                                        type="number"
                                                                        className="w-24 text-right bg-white border border-[#005A9C] px-2 py-1 text-[11px] font-mono font-black outline-none"
                                                                        value={editValues.pu_actual}
                                                                        onChange={(e) => setEditValues({...editValues, pu_actual: parseFloat(e.target.value) || 0})}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <span className={`font-mono font-black text-[13px] ${p.se_valoriza !== false ? 'text-slate-700 group-hover:text-[#005A9C]' : 'text-slate-300'}`}>
                                                                    {formatNumber(p.pu_actual || p.precio_unitario || 0)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* ACTIONS */}
                                                        <div className="col-span-1 flex justify-center gap-1">
                                                            {isEditing ? (
                                                                <>
                                                                    <button onClick={() => handleSaveEdit(p.id)} className="bg-[#107C41] text-white p-1.5 rounded-sm hover:bg-[#0E6A38]">
                                                                        <Save size={14} />
                                                                    </button>
                                                                    <button onClick={() => setEditingId(null)} className="bg-slate-400 text-white p-1.5 rounded-sm hover:bg-slate-500">
                                                                        <RotateCcw size={14} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                !p.es_titulo && (
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button 
                                                                            onClick={() => handleEditStart(p)}
                                                                            className="text-[#005A9C] hover:bg-[#005A9C] hover:text-white p-1.5 rounded-sm transition-all"
                                                                            title="Editar Parámetros"
                                                                        >
                                                                            <Edit size={14} />
                                                                        </button>
                                                                        <button className="text-slate-300 hover:bg-red-50 hover:text-red-600 p-1.5 rounded-sm transition-all">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col">
                                <div className="bg-slate-900 px-10 py-5 grid grid-cols-12 gap-4 text-[9px] font-black text-slate-500 uppercase tracking-widest z-10">
                                    <div className="col-span-2">Timestamp</div>
                                    <div className="col-span-2">System User</div>
                                    <div className="col-span-1 text-center">Operation</div>
                                    <div className="col-span-1 text-center">Reference</div>
                                    <div className="col-span-6">Audit Trace Details</div>
                                </div>
                                <div className="flex-1 overflow-auto p-4 space-y-1 bg-[#F3F2F1]">
                                    {isLoadingLogs ? (
                                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                                            <div className="w-8 h-8 border-2 border-[#005A9C] border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Bitácora...</span>
                                        </div>
                                    ) : logs.map((log) => (
                                        <div 
                                            key={log.id} 
                                            className="grid grid-cols-12 gap-4 px-6 py-2.5 bg-white border border-slate-200 text-[11px] items-center hover:border-[#005A9C]/50 transition-all"
                                        >
                                            <div className="col-span-2 text-slate-400 font-mono tracking-tighter">
                                                {new Date(log.fecha).toLocaleString()}
                                            </div>
                                            <div className="col-span-2 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[8px] font-black text-[#005A9C]">
                                                    {log.usuario_nombre.substring(0,1)}
                                                </div>
                                                <span className="font-black text-slate-600 uppercase tracking-tight truncate">{log.usuario_nombre}</span>
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                <span className={`px-2 py-0.5 rounded-sm text-[8px] font-black tracking-widest uppercase border ${log.accion === 'EDIT' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                    {log.accion}
                                                </span>
                                            </div>
                                            <div className="col-span-1 text-center font-black text-[#005A9C] font-mono text-[10px]">
                                                {log.codigo_partida}
                                            </div>
                                            <div className="col-span-6 text-slate-500 font-medium leading-relaxed italic border-l border-slate-100 pl-4">
                                                {log.detalle}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Bottom Status Ribbon */}
            <div className="fixed bottom-8 right-12 z-[130] flex items-center gap-4 bg-slate-900 border border-slate-700 px-6 py-3 rounded-full text-white shadow-2xl">
                <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
                    <div className="w-2 h-2 rounded-full bg-[#107C41] animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Dataset</span>
                </div>
                <div className="flex gap-4">
                    <span className="text-[11px] font-bold text-slate-300">Items: <span className="text-white font-black">{currentCatalog.length}</span></span>
                    <Settings2 size={16} className="text-slate-500 cursor-pointer hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
};
