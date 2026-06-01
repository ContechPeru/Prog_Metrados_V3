import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SimpleSearchInputProps<T> {
    label?: string;
    placeholder: string;
    value: string;
    onChange: (val: string) => void;
    onSelect: (item: T) => void;
    suggestions: T[];
    searchField: keyof T;
    className?: string;
    renderItem?: (item: T) => React.ReactNode;
}

export function SimpleSearchInput<T>({ 
    label, 
    placeholder, 
    value, 
    onChange, 
    onSelect, 
    suggestions, 
    searchField,
    className,
    renderItem
}: SimpleSearchInputProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const filtered = suggestions.filter(p => {
            if (value.trim() === '') return true; // Mostrar todo si está vacío
            const fieldVal = p[searchField];
            return typeof fieldVal === 'string' && fieldVal.toLowerCase().includes(value.toLowerCase());
          }); // Eliminado .slice(0, 5) para mostrar toda la lista

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={wrapperRef} className={`space-y-1 relative ${className}`}>
            {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">{label}</label>}
            <div className="relative">
                <input 
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-[11px] font-bold focus:border-blue-500 outline-none pr-10"
                    value={value}
                    onChange={e => {
                        onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
            </div>

            {isOpen && filtered.length > 0 && (
                <div className="absolute z-[300] w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-40 overflow-auto animate-in fade-in slide-in-from-top-1 duration-200">
                    <ul className="py-1">
                        {filtered.map((item, idx) => (
                            <li 
                                key={idx} 
                                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex flex-col gap-0.5 border-b border-slate-50 last:border-0"
                                onClick={() => {
                                    onSelect(item);
                                    setIsOpen(false);
                                }}
                            >
                                {renderItem ? renderItem(item) : (
                                    <span className="text-[11px] font-bold text-slate-800 line-clamp-1">
                                        {String(item[searchField])}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
