import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { Partida } from '../../types';

interface SearchComboboxProps {
    partidas: Partida[];
    onSelect: (partida: Partida) => void;
    onAddPartida?: () => void;
    value: string;
    onOpenChange?: (open: boolean) => void;
}

export const SearchCombobox: React.FC<SearchComboboxProps> = ({ partidas, onSelect, onAddPartida, value, onOpenChange }) => {
    const [query, setQuery] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sincronizar valor externo (ej. cuando cambia la especialidad o se limpia desde afuera)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    const filteredPartidas = React.useMemo(() => {
        return (query || "").trim() === ''
            ? partidas
            : partidas.filter((partida) => {
                const searchTokens = (query || "").toLowerCase().split(' ').filter(token => token.trim() !== '');
                const descLower = (partida.descripcion || "").toLowerCase();
                const codLower = (partida.codigo || "").toLowerCase();
                // Coincidencia booleana AND: todos los tokens deben aparecer
                return searchTokens.every(token => descLower.includes(token) || codLower.includes(token));
            });
    }, [query, partidas]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                onOpenChange?.(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} className="relative w-full group">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <input
                    type="text"
                    className="w-full pl-10 pr-10 h-[34px] rounded-xl border border-slate-200 bg-white shadow-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all text-[11px] outline-none font-bold text-slate-700"
                    placeholder="Buscar por cÃ³digo o descripciÃ³n..."
                    value={query || ""}
                    onFocus={(e) => {
                        e.target.select();
                        setIsOpen(true);
                        onOpenChange?.(true);
                    }}
                    onClick={() => setIsOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                />
                <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[110] w-full mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-auto animate-in fade-in zoom-in-95 duration-200 origin-top">
                    {filteredPartidas.length === 0 ? (
                        <div className="p-4 flex flex-col items-center gap-3">
                            <div className="text-[11px] text-slate-400 text-center font-medium italic">Ninguna partida encontrada.</div>
                            {onAddPartida && (
                                <button
                                    onClick={onAddPartida}
                                    className="w-full py-2.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 hover:text-white transition-all border border-blue-100 border-dashed"
                                >
                                    + Crear nueva partida
                                </button>
                            )}
                        </div>
                    ) : (
                        <ul className="py-1.5 p-1">
                            {filteredPartidas.map((partida) => (
                                <li
                                    key={partida.id}
                                    className={`px-4 py-3 cursor-pointer flex gap-3 items-start rounded-xl transition-all duration-200 group/item border-b border-slate-50 last:border-0 ${
                                        (!partida.precio_unitario || partida.estado_aprobacion === 'PENDIENTE')
                                            ? 'bg-amber-50/50 hover:bg-amber-100'
                                            : 'hover:bg-blue-600 hover:text-white'
                                    }`}
                                    onClick={() => {
                                        onSelect(partida);
                                        setQuery(partida.descripcion);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-bold leading-tight block">
                                                {partida.descripcion || "Sin Descripción"}
                                            </span>
                                            {(!partida.precio_unitario || partida.estado_aprobacion === 'PENDIENTE') && (
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 uppercase tracking-wide shrink-0">
                                                    ⏳ Pendiente
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                                        <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 group-hover/item:bg-blue-500 group-hover/item:text-white group-hover/item:border-blue-400 border border-slate-100 px-2 py-0.5 rounded-md flex-shrink-0 transition-colors">
                                            {partida.codigo}
                                        </span>
                                        {/* @ts-ignore - Asumiendo que RenderModificacionBadge estarÃ¡ disponible */}
                                        {window.RenderModificacionBadge && window.RenderModificacionBadge(partida.modificacion)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

