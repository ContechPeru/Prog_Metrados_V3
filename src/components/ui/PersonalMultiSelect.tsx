import React, { useState, useRef, useEffect, useMemo } from 'react';
import { usePersonalStore } from '../../store/usePersonalStore';
import { getOficiosPorEspecialidad } from '../../constants/especialidades';
import { X, UserPlus, Search } from 'lucide-react';
import type { Personal } from '../../store/usePersonalStore';

interface PersonalMultiSelectProps {
    especialidad: string;
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

export const PersonalMultiSelect: React.FC<PersonalMultiSelectProps> = ({ especialidad, selectedIds, onChange }) => {
    const { personal } = usePersonalStore();
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cerrar si hace click afuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filtrar personal basado en especialidad (oficios) y en la búsqueda de nombre
    const filteredPersonal = useMemo(() => {
        let options = personal;

        // Filtro por especialidad
        if (especialidad && especialidad !== 'TODAS') {
            const oficiosPermitidos = getOficiosPorEspecialidad(especialidad);
            options = options.filter(p => {
                // 1. Prioridad: Coincidencia directa de la columna 'especialidad' en la BD
                if (p.especialidad && p.especialidad.toUpperCase() === especialidad.toUpperCase()) {
                    return true;
                }
                
                // 2. Fallback: Búsqueda por Oficios Clásicos
                if (oficiosPermitidos.length > 0 && p.oficio) {
                    const of = p.oficio.toUpperCase();
                    return oficiosPermitidos.some(op => of.includes(op)) || of.includes('VOLANTE');
                }
                
                return false;
            });
        }

        // Filtro por nombre (búsqueda)
        if (search) {
            const term = search.toLowerCase();
            options = options.filter(p => 
                p.nombre_completo.toLowerCase().includes(term) || 
                (p.dni && p.dni.includes(term))
            );
        }

        // Excluir los que ya están seleccionados
        return options.filter(p => !selectedIds.includes(p.id)).slice(0, 30); // Max 30 para rendimiento
    }, [personal, especialidad, search, selectedIds]);

    const selectedPersonal = useMemo(() => {
        return selectedIds.map(id => personal.find(p => p.id === id)).filter(Boolean) as Personal[];
    }, [personal, selectedIds]);

    const handleSelect = (p: Personal) => {
        onChange([...selectedIds, p.id]);
        setSearch('');
        // No cerramos para seguir añadiendo
    };

    const handleRemove = (idToRemove: string) => {
        onChange(selectedIds.filter(id => id !== idToRemove));
    };

    return (
        <div className="w-full relative flex flex-col gap-2" ref={containerRef}>
            {/* Buscador */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-blue-400" />
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={`Buscar obrero por nombre... (${especialidad})`}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-blue-200 rounded-xl text-[11px] font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all placeholder:font-normal placeholder:text-slate-400 h-9"
                />
            </div>

            {/* Dropdown de opciones */}
            {isOpen && (
                <div className="absolute top-10 left-0 w-full z-50 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                    {filteredPersonal.length === 0 ? (
                        <div className="p-4 text-center text-[11px] font-bold text-slate-400">
                            No se encontraron obreros disponibles para esta especialidad.
                        </div>
                    ) : (
                        <div className="p-1">
                            {filteredPersonal.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => handleSelect(p)}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer rounded-lg flex items-center justify-between group transition-colors"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-700 group-hover:text-blue-800 tracking-tight">
                                            {p.nombre_completo}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-400">{p.oficio || 'Sin Oficio'}</span>
                                            {p.cuadrilla && p.cuadrilla !== 'nan' && (
                                                <span className="text-[9px] px-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 font-bold">
                                                    {p.cuadrilla}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <UserPlus className="w-4 h-4 text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Burbujas Acumuladas */}
            {selectedPersonal.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {selectedPersonal.map((p) => (
                        <div 
                            key={p.id} 
                            className="bg-white border border-blue-200 shadow-sm rounded-lg pl-2 pr-1 py-1 flex items-center gap-2 animate-in fade-in zoom-in"
                        >
                            <div className="flex flex-col leading-tight">
                                <span className="text-[10px] font-black text-blue-900 tracking-tight">{p.nombre_completo}</span>
                                <span className="text-[9px] font-bold text-slate-400">{p.categoria || p.oficio || 'Obrero'}</span>
                            </div>
                            <button 
                                onClick={() => handleRemove(p.id)}
                                className="w-5 h-5 rounded hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-slate-300 transition-colors"
                                title="Quitar"
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
