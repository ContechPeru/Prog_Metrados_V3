import React, { useMemo } from 'react';
import type { Metrado, Partida } from '../types';
import { Download, Trash2, Loader2, Users } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RenderModificacionBadge } from './MetradosForm';
import { useMetradosStore } from '../store/useMetradosStore';
import { usePersonalStore } from '../store/usePersonalStore';
import { useAuthStore } from '../store/useAuthStore';
import { useSystemUsersStore } from '../store/useSystemUsersStore';
import { formulaRegistry } from '../utils/formulas/registry';
import { applyAllFilters, getAvailableAuthorsImproved, getEspecialidadPorCodigo, getAvailableFrentes, getAvailableBloques, getAvailableNiveles } from '../utils/filteringLogic';
import { clientSideExport } from '../utils/excelExport';
import { HardHat, Calculator } from "lucide-react";

interface MetradosTableProps {
    metrados: Metrado[];
    onUpdate?: (id: string, field: keyof Metrado, value: any) => void;
    onGroupUpdate?: (codigoPartida: string, oldElemento: string, newElemento: string) => void;
    onDelete?: (id: string) => void;
    proyecto?: string;
    especialidadSeleccionada?: string;
    onEspecialidadChange?: (val: string) => void;
    isSpecialtyLocked?: boolean;
    isReadOnly?: boolean;
    onInsertar?: () => void;
}

// HELPERS Y CONSTANTES
const getIndentLevel = (codigo: string): number => {
    if (!codigo) return 0;
    const parts = codigo.split('.');
    return Math.max(0, parts.length - 1);
};

const getAuthorInitials = (name: string): string => {
    if (!name || name === 'TODOS' || name === 'TODAS') return 'TODOS';
    return name
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word[0].toUpperCase())
        .join('');
};

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};

// --- COMPONENTES DE FILA MEMOIZADOS PARA PERFORMANCE ---

const TitleRow = React.memo(({ r, getIndentLevel }: any) => (
    <tr className="bg-slate-100 border-b border-slate-200">
        <td className="w-[60px] min-w-[60px] max-w-[60px] px-1 py-1 text-center font-mono text-[9px] text-slate-400 overflow-hidden"></td>
        <td className="w-[85px] min-w-[85px] px-1 py-1 font-mono text-[10px] tracking-wider text-center text-slate-500">
            {r.codigo}
        </td>
        <td colSpan={11} className="px-1 py-1 uppercase text-[10px] font-black tracking-[0.15em] text-slate-600"
            style={{ paddingLeft: `${getIndentLevel(r.codigo) * 0.2 + 0.15}rem` }}>
            {r.descripcion}
        </td>
    </tr>
));

const VirtualElementRow = React.memo(({ r, getIndentLevel, onGroupUpdate, isReadOnly }: any) => (
    <tr className="bg-slate-50/50 border-b border-slate-100 group">
        <td className="w-[60px] min-w-[60px] max-w-[60px] px-1 py-1.5 text-center overflow-hidden"></td>
        <td className="w-[85px] min-w-[85px] px-1 py-1.5 text-left"></td>
        <td className="px-1 py-1.5" colSpan={11} style={{ paddingLeft: `${getIndentLevel(r.codigo_partida) * 0.2 + 0.25}rem` }}>
            <div className="flex items-center gap-2">
                <span className="text-blue-300 font-black text-[10px]">â–¼</span>
                <input
                    type="text"
                    value={r.descripcion}
                    onChange={(e) => onGroupUpdate?.(r.codigo_partida, r.descripcion, e.target.value.toUpperCase())}
                    onFocus={(e) => e.target.select()}
                    readOnly={isReadOnly}
                    className={`w-full bg-transparent border-none p-0 focus:ring-0 text-slate-600 text-[11px] font-bold uppercase tracking-wider placeholder:text-slate-300 ${isReadOnly ? 'cursor-default opacity-70' : ''}`}
                />
            </div>
        </td>
    </tr>
));

const HeaderRow = React.memo(({ r, partidaTotals, showCostView, getIndentLevel, formatNumber }: any) => {
    const qtySistema = partidaTotals[r.codigo] || 0;
    const qtyAnterior = r.metrado_anterior_acumulado || r.acumulado_anterior_qty || 0;
    const totalPeriodo = qtySistema;
    const totalAcumulado = qtySistema + qtyAnterior;
    const hasMetrados = totalAcumulado > 0;

    const precio = r.pu_actual || r.precio_unitario || 0;
    const presupuesto = r.metrado_programado || r.cantidad_presupuesto || 0;
    const saldoFisico = presupuesto - totalAcumulado;
    const costoEjecutado = totalAcumulado * precio;
    const saldoMonetario = saldoFisico * precio;

    return (
        <tr className={`${hasMetrados ? 'bg-blue-50/50' : 'bg-white'} border-b border-slate-100 font-semibold group`}>
            <td className="w-[60px] min-w-[60px] max-w-[60px] px-1 py-1 text-center overflow-hidden"></td>
            <td className="w-[85px] min-w-[85px] px-1 py-1 text-center" style={{ paddingLeft: `${getIndentLevel(r.codigo) * 0.2 + 0.1}rem` }}>
                <span className="font-mono text-[10px] text-blue-500 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                    {r.codigo}
                </span>
            </td>
            <td className="px-1 py-1" style={{ paddingLeft: `${getIndentLevel(r.codigo) * 0.2 + 0.15}rem` }}>
                <div className="flex items-center gap-2">
                    {RenderModificacionBadge(r.modificacion)}
                    <span className="text-slate-700 text-[11px] leading-snug">{r.descripcion}</span>
                    {r.cantidad_presupuesto === 0 && (
                        <span className="bg-red-100 text-red-600 font-bold px-1 py-0.5 rounded text-[9px] border border-red-200" title="Partida Deductiva">DD</span>
                    )}
                </div>
            </td>
            <td className="w-[30px] min-w-[30px] px-1 py-1 text-center text-slate-400 font-bold text-[10px]">{r.unidad}</td>
            {!showCostView ? (
                <td colSpan={7} className="px-1 py-1 border-l border-slate-100/50">
                    {r.precio_unitario > 0 && (
                        <div className="w-full h-full flex justify-end items-center pr-3 gap-2">
                            <span className="bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200 shadow-sm">S/ {r.precio_unitario.toFixed(2)}</span>
                            <span className="bg-blue-600 text-white font-black px-2 py-0.5 rounded text-[11px] border border-blue-700 shadow-sm">
                                S/ {formatNumber(totalPeriodo * precio)}
                            </span>
                        </div>
                    )}
                </td>
            ) : (
                <>
                    <td className="w-[65px] min-w-[65px] px-1 py-1 text-center text-[11px] border-l border-slate-100 bg-financial-value font-mono">S/ {precio.toFixed(2)}</td>
                    <td className="w-[80px] min-w-[80px] px-1 py-1 text-center text-[11px] border-l border-blue-100 bg-financial-progress font-mono font-bold">{formatNumber(totalAcumulado)}</td>
                    <td className="w-[80px] min-w-[80px] px-1 py-1 text-center text-[11px] border-l border-blue-100 bg-financial-progress font-mono text-slate-500/70">{formatNumber(presupuesto)}</td>
                    <td className={`w-[80px] min-w-[80px] px-1 py-1 text-center text-[11px] border-l border-amber-100 bg-financial-pending font-mono font-bold ${saldoFisico < 0 ? 'text-red-500' : 'text-amber-800'}`}>{formatNumber(saldoFisico)}</td>
                    <td className="w-[80px] min-w-[80px] px-1 py-1 text-center text-[11px] border-l border-amber-100 bg-financial-pending font-mono italic text-amber-700/80">S/ {formatNumber(saldoMonetario)}</td>
                    <td className="w-[85px] min-w-[85px] px-1 py-1 text-center text-[11px] border-l border-emerald-200 bg-current-month font-mono font-black text-emerald-800 shadow-sm">S/ {formatNumber(totalPeriodo * precio)}</td>
                    <td className="w-[85px] min-w-[85px] px-1 py-1 text-center text-[12px] border-l border-emerald-200 bg-financial-value font-mono font-black text-emerald-700">S/ {formatNumber(costoEjecutado)}</td>
                    <td className="w-[70px] min-w-[70px] border-l border-slate-100/50"></td>
                </>
            )}
            <td className={`w-[85px] min-w-[85px] px-2 py-1 text-right font-black text-[12px] border-l border-slate-100/50 ${showCostView ? 'text-emerald-700 bg-emerald-50/50' : 'text-blue-600'}`}>
                {hasMetrados ? (showCostView ? `S/ ${formatNumber(totalPeriodo * precio)}` : formatNumber(totalPeriodo)) : '-'}
            </td>
        </tr>
    );
});

const getCuadrillaLabel = (ids?: string[]) => {
    if (!ids || ids.length === 0) return null;
    const personal = usePersonalStore.getState().personal;
    
    let opCounter = 0;
    let ofCounter = 0;
    let peonCounter = 0;
    let mstCounter = 0;
    
    ids.forEach(id => {
       const p = personal.find(x => x.id === id);
       if (!p) return;
       const cat = (p.categoria || '').toUpperCase();
       if (cat.includes('OPERARIO')) opCounter++;
       else if (cat.includes('OFICIAL')) ofCounter++;
       else if (cat.includes('PEON') || cat.includes('PEÃ“N')) peonCounter++;
       else if (cat.includes('MAESTRO')) mstCounter++;
    });
    
    const parts = [];
    if (mstCounter > 0) parts.push(`${mstCounter}MST`);
    if (opCounter > 0) parts.push(`${opCounter}OP`);
    if (ofCounter > 0) parts.push(`${ofCounter}OF`);
    if (peonCounter > 0) parts.push(`${peonCounter}P`);
    
    if (parts.length === 0) return null;
    return parts.join('+');
};

const RecordRow = React.memo(({ r, onUpdate, onDelete, showCostView, formatNumber, handleKeyDown, isReadOnly }: any) => {
    const strategy = formulaRegistry.get(r.tipo_metrado);
    const meta = { hvacItemType: r.hvac_item_type };
    const cuadrillaResumen = getCuadrillaLabel(r.obreros_ids);

    return (
        <tr className="hover:bg-blue-50/20 border-b border-slate-100 group">
            <td className="w-[60px] min-w-[60px] max-w-[60px] px-1 py-1.5 text-center overflow-hidden">
                <input type="date" className={`metrado-input w-full text-center bg-transparent border-none p-0 focus:ring-0 text-slate-400 font-bold text-[9px] uppercase tracking-tighter ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                    value={r.fecha} onChange={(e) => onUpdate?.(r.id, 'fecha', e.target.value)}
                    onFocus={(e) => e.target.select()} readOnly={isReadOnly} disabled={isReadOnly} />
            </td>
            <td className="w-[85px] min-w-[85px] px-0.5 py-1.5">
                <div className="flex items-center justify-center gap-0.5">
                    <div className="w-1 min-w-[4px] h-1 rounded-full bg-slate-300 shrink-0"></div>
                    <input type="text" className={`metrado-input text-[8px] text-slate-600 font-medium uppercase bg-slate-100 border border-slate-200 px-0.5 py-0.5 rounded shrink-0 w-[18px] text-center ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                        value={r.frente} onChange={(e) => onUpdate?.(r.id, 'frente', e.target.value)} onFocus={(e) => e.target.select()} readOnly={isReadOnly} disabled={isReadOnly} />
                    <input type="text" className={`metrado-input text-[8px] text-slate-600 font-medium uppercase bg-slate-100 border border-slate-200 px-0.5 py-0.5 rounded shrink-0 w-[18px] text-center ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                        value={r.bloque} onChange={(e) => onUpdate?.(r.id, 'bloque', e.target.value)} onFocus={(e) => e.target.select()} readOnly={isReadOnly} disabled={isReadOnly} />
                    <input type="text" className={`metrado-input text-[8px] text-slate-600 font-medium uppercase bg-slate-100 border border-slate-200 px-0.5 py-0.5 rounded shrink-0 w-[18px] text-center ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                        value={r.nivel} onChange={(e) => onUpdate?.(r.id, 'nivel', e.target.value)} onFocus={(e) => e.target.select()} readOnly={isReadOnly} disabled={isReadOnly} />
                </div>
            </td>
            <td className="px-1 py-1.5">
                <div className="flex items-center gap-1.5 w-full">
                    <input type="text" className="metrado-input w-12 bg-slate-200/90 border border-slate-300 px-1 py-0.5 rounded text-slate-500 text-[9px] font-black uppercase shrink-0 text-center"
                        value={r.cuadrilla || ''} readOnly />
                    {r.elemento && <span className="text-blue-400 font-black text-[12px] shrink-0">â†³</span>}
                    <input type="text" className={`metrado-input w-20 bg-blue-50/50 border border-blue-100 px-1.5 py-0.5 rounded focus:ring-1 focus:ring-blue-500/30 text-blue-800 text-[10px] font-bold uppercase shrink-0 text-center ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                        value={r.elemento || ''} onChange={(e) => onUpdate?.(r.id, 'elemento', e.target.value.toUpperCase())} onFocus={(e) => e.target.select()} readOnly={isReadOnly} disabled={isReadOnly} />
                    <div className="relative flex-1 flex flex-row items-center w-full min-w-0">
                        <input type="text" className={`metrado-input w-full bg-transparent border-none p-0 focus:ring-0 text-slate-700 text-[11px] font-medium ${isReadOnly ? 'cursor-default opacity-70' : ''} ${cuadrillaResumen ? 'pr-[65px]' : ''}`}
                            value={r.detalle || ''} onChange={(e) => onUpdate?.(r.id, 'detalle', e.target.value)} onKeyDown={handleKeyDown} readOnly={isReadOnly} disabled={isReadOnly} />
                        {cuadrillaResumen && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600 font-mono tracking-tighter bg-blue-50/90 border border-blue-100 px-1 py-0.5 rounded shadow-sm opacity-90 pointer-events-none whitespace-nowrap">
                                {cuadrillaResumen}
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-2 py-1.5 text-center text-slate-300">-</td>
            {!showCostView ? (
                <>
                    <td className="px-1 py-1.5 text-center border-l border-slate-200/60">
                        {strategy.isFieldLocked('cantidad', meta) ? <span className="text-[9px] font-bold text-slate-300">N/A</span> :
                            <input type="text" className={`metrado-input w-full text-center bg-transparent border-none p-0 focus:ring-0 text-slate-600 text-[11px] ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                value={r.cantidad} onChange={(e) => onUpdate?.(r.id, 'cantidad', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} readOnly={isReadOnly} disabled={isReadOnly} />}
                    </td>
                    <td className="px-1 py-1.5 text-center border-l border-slate-200/60">
                        {strategy.isFieldLocked('longitud_area', meta) ? <span className="text-[9px] font-bold text-slate-300">N/A</span> :
                            <input type="text" className={`metrado-input w-full text-center bg-transparent border-none p-0 focus:ring-0 text-slate-600 text-[11px] ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                value={r.longitud_area} onChange={(e) => onUpdate?.(r.id, 'longitud_area', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} readOnly={isReadOnly} disabled={isReadOnly} />}
                    </td>
                    <td className="px-1 py-1.5 text-center border-l border-slate-200/60">
                        {strategy.isFieldLocked('ancho_empalme', meta) ? <span className="text-[9px] font-bold text-slate-300">N/A</span> :
                            <input type="text" className={`metrado-input w-full text-center bg-transparent border-none p-0 focus:ring-0 text-slate-600 text-[11px] ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                value={r.ancho_empalme} onChange={(e) => onUpdate?.(r.id, 'ancho_empalme', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} readOnly={isReadOnly} disabled={isReadOnly} />}
                    </td>
                    <td className="px-1 py-1.5 text-center border-l border-slate-200/60">
                        {strategy.isFieldLocked('altura_gancho', meta) ? <span className="text-[9px] font-bold text-slate-300">N/A</span> :
                            <input type="text" className={`metrado-input w-full text-center bg-transparent border-none p-0 focus:ring-0 text-slate-600 text-[11px] ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                value={r.altura_gancho} onChange={(e) => onUpdate?.(r.id, 'altura_gancho', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} readOnly={isReadOnly} disabled={isReadOnly} />}
                    </td>
                    <td className="px-2 py-1.5 text-center font-semibold text-slate-500 text-[11px] border-l border-slate-200/60">{formatNumber(r.parcial)}</td>
                    <td className="px-1 py-1.5 text-center border-l border-slate-200/60">
                        {strategy.isFieldLocked('nro_veces', meta) ? <span className="text-[9px] font-bold text-slate-300">1</span> :
                            <input type="text" className={`metrado-input w-full text-center bg-transparent border-none p-0 focus:ring-0 text-slate-500 font-bold text-[11px] ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                value={r.nro_veces} onChange={(e) => onUpdate?.(r.id, 'nro_veces', e.target.value)} onFocus={(e) => e.target.select()} onKeyDown={handleKeyDown} readOnly={isReadOnly} disabled={isReadOnly} />}
                    </td>
                </>
            ) : (
                <td colSpan={7} className="px-1 py-1.5 text-center border-l border-slate-200/60 text-slate-300 italic text-[10px]">
                    Modo valorizaciÃ³n activado
                </td>
            )}
            <td className="w-[60px] min-w-[60px] px-1 py-1 text-center border-l border-slate-100/50">
                <span className="text-[9px] font-black text-slate-800 uppercase truncate w-full">{(r.autor_usuario || 'User').split(' ')[0]}</span>
            </td>
            <td className="w-[75px] min-w-[75px] px-1.5 py-1.5 text-right font-bold text-slate-800 relative text-[11px] border-l border-slate-200/60">
                <div className="flex items-center justify-end gap-1.5">
                    <span>{r.total.toFixed(2)}</span>
                    {!isReadOnly && (
                        <button onClick={() => onDelete?.(r.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 p-1 rounded-md transition-all">
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
});

/**
 * Genera el array secuencial para el Data Grid con "Tree Pruning".
 * @param activeMetrados Metrados registrados a mostrar.
 * @param partidasCatalogo CatÃ¡logo maestro de partidas del proyecto activo.
 * @param isSummaryMode Si es true, omite el detalle de registros y agrupadores.
 * @param maxLevel Nivel mÃ¡ximo de jerarquÃ­a a mostrar (ej. 1 para OE.1, 2 para OE.1.1). null para mostrar todo.
 */
const getHierarchicalRows = (activeMetrados: Metrado[], partidasCatalogo: Partida[], isSummaryMode: boolean = false, maxLevel: number | null = null): any[] => {
    // 1. Identificar IDs activos de los metrados (UUID de catalogo, UUID custom, o fallback a cÃ³digo)
    const getMetradoTargetId = (m: Metrado) => m.custom_partida_id || m.partida_id || m.codigo_partida.trim().toUpperCase();

    const activeNodeIds = new Set(activeMetrados.map(getMetradoTargetId));
    const activeIds = new Set<string>();

    // OptimizaciÃ³n O(1) Lookup por ID y por parent_id
    const catalogoMap = new Map<string, Partida>();
    partidasCatalogo.forEach(p => {
        // Registrar por UUID
        if (p.id) catalogoMap.set(p.id, p);
        // Fallback para legacy: Registrar tambiÃ©n por cÃ³digo si no colisiona
        catalogoMap.set(p.codigo.trim().toUpperCase(), p);
    });

    // 2. Algoritmo de Rescate de Rama (Bottom-Up):
    // Activamos un nodo si tiene metrados directos O si es ancestro de uno con metrados.
    partidasCatalogo.forEach((node: Partida) => {
        const nodeId = node.id || node.codigo.trim().toUpperCase();
        const legacyCode = node.codigo.trim().toUpperCase();

        if (activeNodeIds.has(nodeId) || activeNodeIds.has(legacyCode)) {
            activeIds.add(nodeId);

            // Subir por la jerarquÃ­a para marcar ancestros como activos
            let parentId = node.parent_id || catalogoMap.get(legacyCode)?.parent_id;
            while (parentId) {
                if (activeIds.has(parentId)) break;
                activeIds.add(parentId);
                const parent = catalogoMap.get(parentId);
                parentId = parent?.parent_id;
            }
        }
    });

    const finalRows: any[] = [];
    const metradosRendered = new Set<string>();

    // 3. Segunda pasada: Construir el array lineal para registros con partida conocida
    partidasCatalogo.forEach((node: Partida) => {
        const nodeId = node.id || node.codigo.trim().toUpperCase();
        if (!activeIds.has(nodeId)) return;

        // FILTRO DE NIVEL (V28)
        if (maxLevel !== null) {
            const currentLevel = getIndentLevel(node.codigo);
            if (currentLevel > maxLevel) return;
        }

        // Filtrar metrados que corresponden a este nodo
        const relatedMetrados = activeMetrados.filter(m => {
            const targetId = getMetradoTargetId(m);
            const matches = targetId === node.id ||
                (m.custom_partida_id && m.custom_partida_id === node.id) ||
                (!m.partida_id && !m.custom_partida_id && m.codigo_partida.trim().toUpperCase() === node.codigo.trim().toUpperCase());
            return matches;
        }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // FIX: Los nodos HOJA (!es_titulo) solo se muestran si tienen metrados reales en el periodo actual.
        // Sin este fix, aparecen headers vacÃ­os con solo datos histÃ³ricos (metrado_anterior_acumulado)
        // cuando se cambia de especialidad, causando el "arrastre visual" entre filtros.
        if (!node.es_titulo && relatedMetrados.length === 0) return;

        // Fila de plantilla (Cabecera)
        finalRows.push({ ...node, is_template: true });

        if (relatedMetrados.length > 0) {
            let lastElemento: string | null | undefined = null;

            relatedMetrados.forEach(m => {
                if (!isSummaryMode) {
                    // LÃ³gica de Agrupador (Elemento Virtual)
                    if (m.elemento && m.elemento !== lastElemento) {
                        finalRows.push({
                            is_template: true,
                            es_titulo: false,
                            is_elemento_virtual: true,
                            codigo: '',
                            descripcion: (m.elemento || '').toString().replace(/NaN/g, ''),
                            codigo_partida: node.codigo,
                            id: `virtual-${m.id}-${m.elemento}`,
                            parcial: 0,
                            total: 0
                        });
                        lastElemento = m.elemento;
                    } else if (!m.elemento && lastElemento !== null) {
                        lastElemento = null;
                    }

                    finalRows.push({ ...m, is_template: false, tipo_metrado: node.tipo_metrado });
                }
                // FIX: Siempre registrar como procesado para que el paso 4 no los trate como huÃ©rfanos
                metradosRendered.add(m.id);
            });
        }
    });

    // 4. RESCATE DE HUÃ‰RFANOS (V13.5): Para los registros que ya no estÃ¡n en el catÃ¡logo
    const orphans = activeMetrados.filter(m => !metradosRendered.has(m.id));
    if (orphans.length > 0) {
        // Agrupar por cÃ³digo para no repetir tÃ­tulos
        const orphansByCode = new Map<string, Metrado[]>();
        orphans.forEach(m => {
            const code = m.codigo_partida?.trim().toUpperCase() || 'SIN_CODIGO';
            if (!orphansByCode.has(code)) orphansByCode.set(code, []);
            orphansByCode.get(code)!.push(m);
        });

        orphansByCode.forEach((metradosDeOrfano, code) => {
            const sample = metradosDeOrfano[0];

            // FILTRO DE NIVEL EN HUÃ‰RFANOS (V28)
            if (maxLevel !== null) {
                const currentLevel = getIndentLevel(code);
                if (currentLevel > maxLevel) return;
            }

            finalRows.push({
                id: `virt-header-${code}`,
                codigo: code === 'SIN_CODIGO' ? 'S/C' : code,
                descripcion: (sample.descripcion_partida || '(Entrada Manual / Sin Item)').toString().replace(/NaN/g, ''),
                unidad: (sample.unidad || 'und').toString().replace(/NaN/g, ''),
                modificacion: 'ET',
                is_template: true,
                es_titulo: false,
                tipo_metrado: sample.tipo_metrado || 'ESTANDAR'
            });

            metradosDeOrfano.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            if (!isSummaryMode) {
                metradosDeOrfano.forEach(m => finalRows.push({ ...m, is_template: false }));
            }
        });
    }

    return finalRows;
};


// Formatea una fecha local sin conversiÃ³n UTC (evita desfase de timezone)
const formatLocalDate = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getCurrentWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Dom, 1=Lun, ..., 6=SÃ¡b
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // Lun + 6 = Dom (semana completa)
    return { from: formatLocalDate(monday), to: formatLocalDate(sunday) };
};

const getPreviousWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() + diffToMonday);
    const lastSunday = new Date(thisMonday);
    lastSunday.setDate(thisMonday.getDate() - 1);
    const lastMonday = new Date(lastSunday);
    lastMonday.setDate(lastSunday.getDate() - 6);
    return { from: formatLocalDate(lastMonday), to: formatLocalDate(lastSunday) };
};

const getSpecificMonthRange = (year: number, month: number) => {
    // Usamos formatLocalDate para evitar el bug de toISOString() con timezone UTC-5
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { from: formatLocalDate(firstDay), to: formatLocalDate(lastDay) };
};

export const MetradosTable = React.memo(({
    metrados, onUpdate, onGroupUpdate, onDelete, proyecto = 'hospital',
    especialidadSeleccionada = 'TODAS', onEspecialidadChange, isSpecialtyLocked,
    isReadOnly = false, onInsertar
}: MetradosTableProps) => {
    const { customPartidas, catalogoHospital, catalogoContingencia, especialidades } = useMetradosStore();

    // Seleccionar el catÃ¡logo de partidas correcto segÃºn el proyecto y sumarle las personalizadas
    const catalogoActivo = useMemo(() => {
        const base = proyecto === 'hospital' ? catalogoHospital : catalogoContingencia;
        return [...base, ...customPartidas];
    }, [proyecto, customPartidas, catalogoHospital, catalogoContingencia]);

    const [filterAuthor, setFilterAuthor] = React.useState('TODOS');
    const { user, canEditMetrado } = useAuthStore();
    const { systemUsers } = useSystemUsersStore();

    // 1. ESTADOS DE FILTROS BÃSICOS
    const [filterFrente, setFilterFrente] = React.useState('TODOS');
    const [filterBloque, setFilterBloque] = React.useState('TODOS');
    const [filterNivel, setFilterNivel] = React.useState('TODOS');

    // 2. ESTADOS DE FECHAS (Deben ir antes de las funciones que los usan)
    const initialDateRange = useMemo(() => getCurrentWeekRange(), []);
    const [filterDateFrom, setFilterDateFrom] = React.useState(initialDateRange.from);
    const [filterDateTo, setFilterDateTo] = React.useState(initialDateRange.to);
    const [activeMonthTab, setActiveMonthTab] = React.useState<string>('week');

    // 3. LÃ“GICA DE MESES DISPONIBLES (Data Real)
    const availableMonths = useMemo(() => {
        const monthsMap = new Map<string, { year: number, month: number, label: string }>();
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

        metrados.forEach(m => {
            if (!m.fecha) return;
            // FIX: Normalizar a YYYY-MM-DD antes de parsear para evitar
            // que fechas con timestamp ('2026-04-10T00:00:00') generen
            // '2026-04-10T00:00:00T00:00:00' al concatenar
            const fechaNorm = m.fecha.substring(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNorm)) return;
            const d = new Date(fechaNorm + 'T00:00:00');
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            if (!monthsMap.has(key)) {
                monthsMap.set(key, {
                    year: d.getFullYear(),
                    month: d.getMonth(),
                    label: `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`
                });
            }
        });

        return Array.from(monthsMap.values()).sort((a, b) => (b.year * 100 + b.month) - (a.year * 100 + a.month));
    }, [metrados]);

    // 4. HANDLERS DE CAMBIO DE PERIODO
    const handleMonthChange = (tabId: string) => {
        if (tabId === 'week') {
            const range = getCurrentWeekRange();
            setFilterDateFrom(range.from);
            setFilterDateTo(range.to);
        } else if (tabId === 'prev-week') {
            const range = getPreviousWeekRange();
            setFilterDateFrom(range.from);
            setFilterDateTo(range.to);
        } else if (tabId === 'all') {
            setFilterDateFrom('');
            setFilterDateTo('');
        } else if (tabId.includes('-')) {
            const [year, month] = tabId.split('-').map(Number);
            const range = getSpecificMonthRange(year, month);
            setFilterDateFrom(range.from);
            setFilterDateTo(range.to);
        }
    };

    // 5. EFECTO DE SINCRONIZACIÃ“N BIDIRECCIONAL (Tabs <-> Inputs)
    React.useEffect(() => {
        const rangeWeek = getCurrentWeekRange();
        const rangePrevWeek = getPreviousWeekRange();
        if (filterDateFrom === rangeWeek.from && filterDateTo === rangeWeek.to) {
            setActiveMonthTab('week');
        } else if (filterDateFrom === rangePrevWeek.from && filterDateTo === rangePrevWeek.to) {
            setActiveMonthTab('prev-week');
        } else if (filterDateFrom === '' && filterDateTo === '') {
            setActiveMonthTab('all');
        } else {
            const matchedMonth = availableMonths.find(m => {
                const range = getSpecificMonthRange(m.year, m.month);
                return range.from === filterDateFrom && range.to === filterDateTo;
            });
            if (matchedMonth) {
                setActiveMonthTab(`${matchedMonth.year}-${String(matchedMonth.month).padStart(2, '0')}`);
            } else {
                setActiveMonthTab('custom');
            }
        }
    }, [filterDateFrom, filterDateTo, availableMonths]);

    const [debugMode] = React.useState(true);
    const FILAS_POR_PAGINA = 25;
    const [paginaActual, setPaginaActual] = React.useState(1);
    const [hasAutoSelectedAuthor, setHasAutoSelectedAuthor] = React.useState(false);

    // Muestra base de metrados filtrada SÃ“LO por proyecto y especialidad para extraer listas consistentes
    const especialidadMetrados = useMemo(() => {
        return applyAllFilters(metrados, { proyecto, especialidad: especialidadSeleccionada }, catalogoActivo, false, getEspecialidadPorCodigo);
    }, [metrados, proyecto, especialidadSeleccionada, catalogoActivo]);

    // Extraer todos los autores Ãºnicos presentes en la vista actual (filtrados por especialidad) y cruzar con la tabla oficial de usuarios del sistema
    const availableAuthors = useMemo(() => {
        return getAvailableAuthorsImproved(metrados, especialidadSeleccionada, catalogoActivo, getEspecialidadPorCodigo, debugMode, systemUsers);
    }, [metrados, especialidadSeleccionada, catalogoActivo, debugMode, systemUsers]);

    // Aplicar Filtro Autor Inteligente ("Si el usuario activo forma parte de la tabla actual y no se ha autoseleccionado aÃºn, selecciÃ³nalo")
    React.useEffect(() => {
        if (!hasAutoSelectedAuthor && metrados.length > 0 && user?.nombre_completo) {
            // Evaluamos si el nombre existe dentro de los autores vÃ¡lidos / disponibles
            if (availableAuthors.includes(user.nombre_completo)) {
                setFilterAuthor(user.nombre_completo);
                setHasAutoSelectedAuthor(true);
            } else if (availableAuthors.length > 0) {
                // Si ya cargaron los autores y no estamos (por ejemplo: no tiene registros esta semana), no hacemos force a un nombre vacÃ­o, pero deshabilitamos autoTrigger
                setHasAutoSelectedAuthor(true);
            }
        }
    }, [user, availableAuthors, metrados.length, hasAutoSelectedAuthor]);

    const availableFrentes = useMemo(() => getAvailableFrentes(especialidadMetrados), [especialidadMetrados]);
    const availableBloques = useMemo(() => getAvailableBloques(especialidadMetrados), [especialidadMetrados]);
    const availableNiveles = useMemo(() => getAvailableNiveles(especialidadMetrados), [especialidadMetrados]);

    // Filtrar metrados por proyecto, especialidad, autor y fecha (OPTIMIZADO)
    // CORRECCIÃ“N: 
    // - Proyecto ahora se aplica en applyAllFilters (no en useMemo separado)
    // - Agregar parÃ¡metro debug para diagnosticar discrepancias local/servidor
    const filteredMetrados = useMemo(() => {
        return applyAllFilters(metrados, {
            proyecto,
            especialidad: especialidadSeleccionada,
            autor: filterAuthor,
            dateFrom: filterDateFrom,
            dateTo: filterDateTo,
            frente: filterFrente,
            bloque: filterBloque,
            nivel: filterNivel,
        }, catalogoActivo, debugMode);
    }, [metrados, proyecto, especialidadSeleccionada, filterAuthor, filterDateFrom, filterDateTo, filterFrente, filterBloque, filterNivel, catalogoActivo, debugMode]);

    const [isExporting, setIsExporting] = React.useState(false);
    const [showCostView, setShowCostView] = React.useState(false);
    const [viewMode, setViewMode] = React.useState<'DETALLE' | 'SUMMARY' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'>('DETALLE');

    // Mapeo automÃ¡tico de Modo -> Summary y MaxLevel
    const { isSummaryActual, maxLevelActual } = useMemo(() => {
        if (viewMode === 'DETALLE') return { isSummaryActual: false, maxLevelActual: null };
        if (viewMode === 'SUMMARY') return { isSummaryActual: true, maxLevelActual: null };
        const levelMatch = viewMode.match(/^L(\d)$/);
        if (levelMatch) {
            return { isSummaryActual: true, maxLevelActual: parseInt(levelMatch[1], 10) };
        }
        return { isSummaryActual: false, maxLevelActual: null };
    }, [viewMode]);

    React.useEffect(() => { setPaginaActual(1); }, [filteredMetrados]);

    const rows = useMemo(() => getHierarchicalRows(filteredMetrados, catalogoActivo, isSummaryActual, maxLevelActual), [filteredMetrados, catalogoActivo, isSummaryActual, maxLevelActual]);

    React.useEffect(() => { setPaginaActual(1); }, [filteredMetrados]);

    // Paginación por partidas completas
    const PARTIDAS_POR_PAGINA = 10;
    const partidas_headers = useMemo(() => {
        const indices: number[] = [];
        rows.forEach((r, i) => {
            if (r.is_template && !r.es_titulo && !r.is_elemento_virtual) indices.push(i);
        });
        return indices;
    }, [rows]);

    const totalPartidas = partidas_headers.length;
    const totalPaginas = Math.max(1, Math.ceil(totalPartidas / PARTIDAS_POR_PAGINA));
    const inicioPartida = (paginaActual - 1) * PARTIDAS_POR_PAGINA;
    const finPartida = Math.min(paginaActual * PARTIDAS_POR_PAGINA, totalPartidas);

    const rowsPaginados = useMemo(() => {
        if (totalPartidas === 0) return rows;
        const desdeIdx = partidas_headers[inicioPartida] ?? 0;
        const hastaIdx = partidas_headers[finPartida] ?? rows.length;
        // Incluir filas de título (es_titulo=true) que aparecen antes del primer header de la página
        let inicio = desdeIdx;
        while (inicio > 0 && rows[inicio - 1]?.es_titulo) inicio--;
        return rows.slice(inicio, hastaIdx);
    }, [rows, partidas_headers, inicioPartida, finPartida, totalPartidas]);

    const totalFilas = rows.length;

    // VIRTUALIZACIÃ“N: Referencia al contenedor con scroll
    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 40, // Altura estimada de fila
        overscan: 10, // CuÃ¡ntas filas cargar fuera de vista
    });

    const virtualItems = virtualizer.getVirtualItems();
    const paddingTop = virtualItems.length > 0 ? virtualItems?.[0]?.start || 0 : 0;
    const paddingBottom = virtualItems.length > 0 ? virtualizer.getTotalSize() - (virtualItems?.[virtualItems.length - 1]?.end || 0) : 0;

    // Calcular totales por partida para las filas de cabecera
    const partidaTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        filteredMetrados.forEach(m => {
            totals[m.codigo_partida] = (totals[m.codigo_partida] || 0) + m.total;
        });
        return totals;
    }, [filteredMetrados]);

    // Calcular resumen de personal (V27)
    const personnelSummary = useMemo(() => {
        const workersMap = new Map<string, string>();
        filteredMetrados.forEach(m => {
            if (m.obrero_nombre) {
                const parts = m.obrero_nombre.split(' / ');
                parts.forEach(p => {
                    const match = p.match(/(.+?)\s*\((.+?)\)/);
                    if (match) {
                        workersMap.set(match[1].trim(), match[2].trim());
                    } else {
                        workersMap.set(p.trim(), 'S/C');
                    }
                });
            }
        });
        return Array.from(workersMap.entries()).map(([nombre, categoria]) => ({ nombre, categoria }));
    }, [filteredMetrados]);

    // Handlers memoizados para evitar re-renderizados innecesarios en componentes memoizados
    const memoizedUpdate = React.useCallback((id: string, field: keyof Metrado, value: any) => {
        onUpdate?.(id, field, value);
    }, [onUpdate]);

    const memoizedGroupUpdate = React.useCallback((codigoPartida: string, oldElemento: string, newElemento: string) => {
        onGroupUpdate?.(codigoPartida, oldElemento, newElemento);
    }, [onGroupUpdate]);

    const memoizedDelete = React.useCallback((id: string) => {
        onDelete?.(id);
    }, [onDelete]);

    const memoizedKeyDown = React.useCallback((e: React.KeyboardEvent) => {
        if (isReadOnly) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            const inputs = Array.from(document.querySelectorAll('.metrado-input')) as HTMLInputElement[];
            const currentIndex = inputs.indexOf(e.target as HTMLInputElement);
            if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
                inputs[currentIndex + 1].select();
            }
        }
    }, []);

    const cantPartidasRegistradas = new Set(filteredMetrados.map(m => m.codigo_partida)).size;

    // CÃ¡lculo del Valorizado Total en Pantalla
    const totalValorizadoOnScreen = useMemo(() => {
        let sum = 0;
        Object.keys(partidaTotals).forEach(codigo => {
            const partida = catalogoActivo.find(p => p.codigo === codigo || p.id === codigo);
            const precio = partida?.pu_actual || partida?.precio_unitario || 0;
            const qtySistema = partidaTotals[codigo] || 0;
            sum += (qtySistema * precio);
        });
        return sum;
    }, [partidaTotals, catalogoActivo]);

    const exportToExcel = async (mode: 'official' | 'master' = 'official') => {
        if (filteredMetrados.length === 0) {
            alert("No hay registros que exportar en la vista actual.");
            return;
        }

        try {
            setIsExporting(true);

            // Client-side execution logic extracted from backend (V35)
            const especialidadExport = especialidadSeleccionada === 'TODAS' ? 'VARIAS' : especialidadSeleccionada;
            const autorExport = getAuthorInitials(filterAuthor);

            await clientSideExport(rows, proyecto, mode, especialidadExport, autorExport);

            console.log(`[INKAIA] ExportaciÃ³n de ${mode} completada localmente.`);
        } catch (error) {
            console.error(error);
            alert("FallÃ³ la exportaciÃ³n directa: " + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="glass-panel overflow-hidden rounded-2xl flex flex-col h-full border border-slate-200 shadow-sm bg-white">
            <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-3 sticky top-0 z-20 backdrop-blur-md">
                {/* FILA 1: TÃTULO, VISTA, FECHAS Y EXPORTACIÃ“N */}
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-800 text-sm tracking-tight shrink-0">Proyecto</h3>
                            <span className="text-slate-300 text-sm">/</span>
                            <span className="text-[13px] font-black text-blue-600 uppercase tracking-tight shrink-0">Belempampa</span>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                        {/* <h3 className="font-bold text-slate-800 text-sm tracking-tight shrink-0">Planilla de Metrados DinÃ¡mica</h3>
                        <div className="h-6 w-px bg-slate-200 mx-1" /> */}

                        {/* Clasificador de Meses / PerÃ­odo - MOVIDO AQUÃ SIN TÃTULO */}
                        <div className="flex items-center px-1.5 py-0.5 bg-indigo-50/50 rounded-lg border border-indigo-100 shadow-sm">
                            <select
                                value={activeMonthTab}
                                onChange={(e) => handleMonthChange(e.target.value)}
                                className="text-[11px] font-black bg-transparent border-none outline-none text-indigo-700 cursor-pointer focus:ring-0 px-0.5 uppercase"
                            >
                                <optgroup label="RÃ¡pidos">
                                    <option value="week">ðŸ“… ESTA SEMANA</option>
                                    <option value="prev-week">âª SEMANA ANTERIOR</option>
                                    <option value="all">ðŸŒ TODO EL TIEMPO</option>
                                </optgroup>
                                <optgroup label="Historial">
                                    {availableMonths.map(m => (
                                        <option key={`${m.year}-${m.month}`} value={`${m.year}-${String(m.month).padStart(2, '0')}`}>
                                            ðŸ“… {m.label.toUpperCase()}
                                        </option>
                                    ))}
                                </optgroup>
                                {activeMonthTab === 'custom' && <option value="custom">ðŸ› ï¸ RANGO</option>}
                            </select>
                        </div>

                        {/* Filtro Fecha (Rango) */}
                        <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Rango:</span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="date"
                                    value={filterDateFrom}
                                    onChange={(e) => setFilterDateFrom(e.target.value)}
                                    className="text-[11px] font-bold bg-transparent border-none outline-none text-slate-700 cursor-pointer"
                                />
                                <span className="text-[11px] text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={filterDateTo}
                                    onChange={(e) => setFilterDateTo(e.target.value)}
                                    className="text-[11px] font-bold bg-transparent border-none outline-none text-slate-700 cursor-pointer"
                                />
                            </div>
                            {(filterDateFrom || filterDateTo) && (
                                <button
                                    onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                                    className="ml-1 w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-500 hover:text-white transition-colors text-[8px]"
                                >âœ•</button>
                            )}
                        </div>
                    </div>

                    <div className="relative flex items-center gap-2">
                        <button
                            onClick={onInsertar}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm bg-lime-500 hover:bg-lime-600 text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Insertar
                        </button>
                        <div className="relative group">
                            <button
                                disabled={isExporting}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer ${isExporting ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800 text-white'}`}
                            >
                                {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                                {isExporting ? 'Exportando...' : 'Exportar'}
                            </button>
                            {!isExporting && (
                                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-150">
                                    <button
                                        onClick={() => exportToExcel('official')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-t-xl transition-colors"
                                    >
                                        <Download size={12} className="text-green-600" />
                                        Exportar Oficial
                                    </button>
                                    <div className="h-px bg-slate-100 mx-2" />
                                    <button
                                        onClick={() => exportToExcel('master')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-b-xl transition-colors"
                                    >
                                        <Download size={12} className="text-blue-600" />
                                        Exportar Maestro
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* FILA 2: FILTROS Y CONTROLES DE VISTA */}
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        {/* Filtro Especialidad */}
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Esp.</span>
                            <select
                                value={especialidadSeleccionada}
                                onChange={(e) => {
                                    onEspecialidadChange?.(e.target.value);
                                    setFilterAuthor('TODOS');
                                    setFilterFrente('TODOS');
                                    setFilterBloque('TODOS');
                                    setFilterNivel('TODOS');
                                }}
                                disabled={isSpecialtyLocked}
                                className={`text-[10px] font-bold border border-slate-200 rounded-lg px-1.5 py-0.5 outline-none transition-all max-w-[120px] ${isSpecialtyLocked
                                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                    : 'bg-white text-slate-700 hover:border-blue-400 cursor-pointer shadow-sm'
                                    }`}
                            >
                                <option value="TODAS">TODAS</option>
                                {(especialidades || []).map(esp => (
                                    <option key={esp.id} value={esp.nombre}>{esp.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro Autor */}
                        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Aut.</span>
                            <select
                                value={filterAuthor}
                                onChange={(e) => setFilterAuthor(e.target.value)}
                                className="text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-slate-700 outline-none cursor-pointer hover:border-blue-400 shadow-sm transition-all max-w-[100px]"
                            >
                                <option value="TODOS">TODOS</option>
                                {availableAuthors.map(author => (
                                    <option key={author} value={author}>{author}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtros de UbicaciÃ³n (Frente, Bloque, Nivel) */}
                        <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                            <select
                                value={filterFrente}
                                onChange={(e) => setFilterFrente(e.target.value)}
                                className="w-[75px] text-[10px] font-bold bg-white border border-slate-200 rounded-md px-1 py-0.5 text-slate-700 outline-none cursor-pointer hover:border-blue-400 shadow-sm transition-all"
                                title="Frente"
                            >
                                <option value="TODOS">FRENTES</option>
                                {availableFrentes.map(frente => (
                                    <option key={frente} value={frente}>{frente.substring(0, 8)}{frente.length > 8 ? '..' : ''}</option>
                                ))}
                            </select>
                            <select
                                value={filterBloque}
                                onChange={(e) => setFilterBloque(e.target.value)}
                                className="w-[75px] text-[10px] font-bold bg-white border border-slate-200 rounded-md px-1 py-0.5 text-slate-700 outline-none cursor-pointer hover:border-blue-400 shadow-sm transition-all"
                                title="Bloque"
                            >
                                <option value="TODOS">BLOQUES</option>
                                {availableBloques.map(bloque => (
                                    <option key={bloque} value={bloque}>{bloque.substring(0, 8)}{bloque.length > 8 ? '..' : ''}</option>
                                ))}
                            </select>
                            <select
                                value={filterNivel}
                                onChange={(e) => setFilterNivel(e.target.value)}
                                className="w-[75px] text-[10px] font-bold bg-white border border-slate-200 rounded-md px-1 py-0.5 text-slate-700 outline-none cursor-pointer hover:border-blue-400 shadow-sm transition-all"
                                title="Nivel"
                            >
                                <option value="TODOS">NIVELES</option>
                                {availableNiveles.map(nivel => (
                                    <option key={nivel} value={nivel}>{nivel.substring(0, 8)}{nivel.length > 8 ? '..' : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* Toggle Medidas/Soles */}
                        <button
                            onClick={() => setShowCostView(!showCostView)}
                            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-black transition-all border shadow-sm cursor-pointer whitespace-nowrap ${showCostView
                                ? 'bg-blue-600 text-white border-blue-700 shadow-blue-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <span>{/* {showCostView ? 'ðŸ‘·' : 'ðŸ’°'} */} {showCostView ? <HardHat size={18} /> : <Calculator size={18} />}</span>
                            <span className="hidden sm:inline">{showCostView ? 'Modo TÃ©cnico (Medidas)' : 'Modo EconÃ³mico (S/)'}</span>
                        </button>
                        {/* <button
                            onClick={() => setShowCostView(!showCostView)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black transition-all border shadow-sm cursor-pointer ${showCostView
                                ? 'bg-blue-600 text-white border-blue-700 shadow-blue-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            title={showCostView ? "Ver en modo TÃ©cnico (Medidas)" : "Ver en modo EconÃ³mico (Soles)"}
                        >
                            <span>{showCostView ? 'ðŸ‘·' : 'ðŸ’°'}</span>
                        </button> */}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Alertas activas */}
                        <button className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all shadow-sm whitespace-nowrap">
                            ðŸ”” <span className="hidden sm:inline">Alertas activas</span>
                        </button>
                        {/* Selector de Vista (JerarquÃ­a) */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50/50 rounded-lg border border-blue-100 shadow-sm">
                    {/* <div className="flex items-center gap-2"> */}
                        {/* Selector de Vista (JerarquÃ­a) */}
                        {/* <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50/50 rounded-lg border border-blue-100 shadow-sm"> */}
                            <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Vista</span>
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value as any)}
                                className="text-[11px] font-bold bg-transparent border-none outline-none text-blue-700 cursor-pointer focus:ring-0 px-0.5"
                            >
                                <optgroup label="Modos">
                                    <option value="DETALLE">ðŸ’Ž Detalle</option>
                                    <option value="SUMMARY">ðŸ“Š Resumen</option>
                                </optgroup>
                                <optgroup label="Niveles OE">
                                    <option value="L1">ðŸ“ N1</option>
                                    <option value="L2">ðŸ“ N2</option>
                                    <option value="L3">ðŸ“ N3</option>
                                    <option value="L4">ðŸ“ N4</option>
                                    <option value="L5">ðŸ“ N5</option>
                                    <option value="L6">ðŸ“ N6</option>
                                </optgroup>
                            </select>
                        </div>

                        {/* LEYENDA INTEGRADA */}
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100/50 rounded-lg border border-slate-200 shadow-sm ml-1">
                            {['PC', 'MM', 'PN', 'DD', 'ET'].map(mod => (
                                <div key={mod} className="flex items-center gap-1" title={
                                    mod === 'PC' ? 'Partida Creada' :
                                        mod === 'MM' ? 'Mayores Metrados' :
                                            mod === 'PN' ? 'Partida Nueva' :
                                                mod === 'DD' ? 'Deductivos' : 'Exp. TÃ©cnico'
                                }>
                                    <div className={`w-1.5 h-1.5 rounded-full ${mod === 'PC' ? 'bg-pink-400' :
                                        mod === 'MM' ? 'bg-blue-400' :
                                            mod === 'PN' ? 'bg-green-400' :
                                                mod === 'DD' ? 'bg-red-400' : 'bg-slate-300'
                                        } shadow-sm border border-white`} />
                                    <span className="text-[8px] font-black text-slate-500">{mod}</span>
                                </div>
                            ))}
                        </div>
                        {/* PAGINACIÓN */}
                        <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm ml-2">
                            <button
                                onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                                disabled={paginaActual === 1}
                                className="text-indigo-500 hover:text-indigo-700 disabled:opacity-30 font-black text-[14px] px-1 leading-none"
                            >‹</button>
                            <span className="text-[10px] font-black text-indigo-700 whitespace-nowrap">
                                {totalPartidas === 0 ? '0' : `${inicioPartida + 1}–${finPartida}`} de {totalPartidas} partidas
                            </span>
                            <button
                                onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                                disabled={paginaActual === totalPaginas || totalFilas === 0}
                                className="text-indigo-500 hover:text-indigo-700 disabled:opacity-30 font-black text-[14px] px-1 leading-none"
                            >›</button>
                        </div>
                    </div>
                </div>
            </div>


            {/* Contenedor con Scroll (VIRTUALIZADO) */}
            <div
                ref={parentRef}
                className="overflow-auto flex-grow min-h-0 scrollbar-thin scrollbar-thumb-slate-200"
            >
                <table className="w-full text-[11px] text-left align-middle border-collapse table-auto">
                    <thead className="text-[11px] text-slate-400 bg-white uppercase whitespace-nowrap sticky top-0 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] z-10 font-bold">
                        <tr className="border-b border-slate-100">
                            <th className="w-[60px] min-w-[60px] px-1 py-3 text-center overflow-hidden">Fecha</th>
                            <th className="w-[85px] min-w-[85px] px-1 py-3 text-center">Item</th>
                            <th className="px-1 py-3 min-w-[200px] text-left">DescripciÃ³n</th>
                            <th className="w-[30px] min-w-[30px] px-0.5 py-3 text-center">Und</th>

                            {!showCostView ? (
                                <>
                                    <th className="w-[50px] min-w-[50px] px-0.5 py-3 text-center text-[10px] border-l border-slate-200">CANT.</th>
                                    <th className="w-[70px] min-w-[70px] px-0.5 py-3 text-center text-[10px] border-l border-slate-200">LONG./AREA</th>
                                    <th className="w-[60px] min-w-[60px] px-0.5 py-3 text-center text-[10px] border-l border-slate-200">ANCHO</th>
                                    <th className="w-[60px] min-w-[60px] px-0.5 py-3 text-center text-[10px] border-l border-slate-200">ALT./GAN.</th>
                                    <th className="w-[75px] min-w-[75px] px-1 py-3 text-center text-[10px] border-l border-slate-200">Parcial</th>
                                    <th className="w-[45px] min-w-[45px] px-0.5 py-3 text-center text-[10px] border-l border-slate-200">Veces</th>
                                </>
                            ) : (
                                <>
                                    <th className="w-[65px] min-w-[65px] px-1 py-3 text-center text-[10px] border-l bg-emerald-100 bg-financial-value transition-all">Precio S/</th>
                                    <th className="w-[80px] min-w-[80px] px-1 py-3 text-center text-[10px] border-l bg-blue-100 bg-financial-progress font-black">Metrado Acum.</th>
                                    <th className="w-[80px] min-w-[80px] px-1 py-3 text-center text-[10px] border-l bg-blue-100 bg-financial-progress">Presupuesto</th>
                                    <th className="w-[80px] min-w-[80px] px-1 py-3 text-center text-[10px] border-l bg-amber-100 bg-financial-pending font-black">Saldo Fis.</th>
                                    <th className="w-[80px] min-w-[80px] px-1 py-3 text-center text-[10px] border-l bg-amber-100 bg-financial-pending">Sald. Mon S/</th>
                                    <th className="w-[85px] min-w-[85px] px-1 py-3 text-center text-[10px] border-l bg-emerald-200 bg-current-month font-black shadow-inner">Val. Mes S/</th>
                                    <th className="w-[85px] min-w-[85px] px-1 py-3 text-center text-[10px] border-l bg-emerald-200 bg-financial-value font-black text-emerald-800">Costo Ejec.</th>
                                </>
                            )}

                            <th className="w-[70px] min-w-[70px] px-1 py-3 text-center text-[10px] border-l border-slate-200">AUTOR</th>
                            <th className="w-[85px] min-w-[85px] px-2 py-3 text-right text-[10px] border-l border-slate-200">Total</th>
                        </tr>
                    </thead>
                    <tbody key={`grid-body-${showCostView}-${viewMode}`} className="bg-white">
                        {paddingTop > 0 && (
                            <tr><td colSpan={20} style={{ height: `${paddingTop}px` }}></td></tr>
                        )}
                        {rowsPaginados.map((r, idx) => {
                        if (!r) return null;
                        const virtualRow = { index: idx };
                            if (!r) return null;

                            // Dispatch a componentes especializados memoizados usando ID Ãºnico (CORRECCIÃ“N IMPORTANTE DE KEYS)
                            if (r.is_template && r.es_titulo) {
                                return (
                                    <TitleRow
                                        key={r.id}
                                        r={r}
                                        getIndentLevel={getIndentLevel}
                                    />
                                );
                            }

                            if (r.is_template && r.is_elemento_virtual) {
                                return (
                                    <VirtualElementRow
                                        key={r.id}
                                        r={r}
                                        getIndentLevel={getIndentLevel}
                                        onGroupUpdate={memoizedGroupUpdate}
                                        isReadOnly={isReadOnly}
                                    />
                                );
                            }

                            if (r.is_template && !r.es_titulo) {
                                return (
                                    <HeaderRow
                                        key={r.id}
                                        r={r}
                                        partidaTotals={partidaTotals}
                                        showCostView={showCostView}
                                        getIndentLevel={getIndentLevel}
                                        formatNumber={formatNumber}
                                    />
                                );
                            }

                            const isRowReadOnly = isReadOnly || !canEditMetrado(r.autor_usuario, r.fecha);
                            return (
                                <RecordRow
                                    key={r.id}
                                    r={r}
                                    onUpdate={memoizedUpdate}
                                    onDelete={memoizedDelete}
                                    showCostView={showCostView}
                                    formatNumber={formatNumber}
                                    handleKeyDown={memoizedKeyDown}
                                    isReadOnly={isRowReadOnly}
                                />
                            );
                        })}
                        {paddingBottom > 0 && (
                            <tr><td colSpan={20} style={{ height: `${paddingBottom}px` }}></td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer de Resumen */}
            <div className="mt-auto p-3 border-t border-slate-200 bg-white flex justify-between items-center z-10">
                <div className="flex items-center gap-5">
                    <div className="flex gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 block"></span> Partidas: {cantPartidasRegistradas}</span>
                        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 block"></span> Registros: {filteredMetrados.length}</span>
                        {personnelSummary.length > 0 && (
                            <span className="flex items-center gap-1.5"><Users size={12} className="text-blue-500" /> Personal: {personnelSummary.length}</span>
                        )}
                    </div>
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded border border-emerald-200 shadow-inner group transition-all hover:bg-emerald-100/50">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80">Valorizado en Vista</span>
                        <span className="text-[14px] font-black tracking-tighter">S/ {formatNumber(totalValorizadoOnScreen)}</span>
                    </div>
                </div>
                <div className="bg-slate-800 text-white px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm">
                    Control de Planilla Web v3.1
                </div>
            </div>


        </div>
    );
});








