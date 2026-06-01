import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
    value: string;
    options: string[];
    onSelect: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export const Select: React.FC<SelectProps> = ({ value, options, onSelect, placeholder = "Seleccionar...", label, className, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} className={`relative w-full ${className}`}>
            {label && <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase tracking-widest pl-1">{label}</label>}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-3 py-1.5 border rounded-xl text-[11px] text-left flex justify-between items-center transition-all duration-300 outline-none
                    ${disabled ? 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-75' : 
                      isOpen
                        ? 'border-blue-400 ring-4 ring-blue-50 bg-white shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                    }
                `}
            >
                <span className={value ? "text-slate-800 font-bold" : "text-slate-400 font-medium"}>
                    {value || placeholder}
                </span>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 origin-top">
                    <ul className="py-1 p-1">
                        {options.map((option) => (
                            <li
                                key={option}
                                className={`px-4 py-2 text-[11px] cursor-pointer rounded-lg transition-all duration-200 flex items-center justify-between
                                    ${value === option
                                        ? 'bg-blue-600 text-white font-black shadow-lg shadow-blue-200'
                                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                                    }
                                `}
                                onClick={() => {
                                    onSelect(option);
                                    setIsOpen(false);
                                }}
                            >
                                {option || placeholder}
                                {value === option && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
