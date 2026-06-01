import React, { useEffect } from 'react';
import { X, Check, FileText, AlertTriangle, Calendar, Table } from 'lucide-react';
import { useComunicadosStore } from '../store/useComunicadosStore';
import { useAuthStore } from '../store/useAuthStore';

export const ComunicadoModal: React.FC = () => {
    const { comunicados, modalVisto, setModalVisto, confirmarVisto } = useComunicadosStore();
    const { user } = useAuthStore();

    const pendientes = comunicados.filter(c =>
        !(c.vistos || []).some(v => v.usuario_id === user?.id)
    );

    useEffect(() => {
        if (pendientes.length > 0 && !modalVisto) {
            setTimeout(() => setModalVisto(true), 800);
        }
    }, [pendientes.length]);

    if (!modalVisto || pendientes.length === 0) return null;

    const c = pendientes[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">
                <div className={`px-5 py-3 flex items-center justify-between ${
                    c.tipo === 'urgente' ? 'bg-red-50 border-b border-red-100' :
                    c.tipo === 'reunion' ? 'bg-blue-50 border-b border-blue-100' :
                    c.tipo === 'pdf'     ? 'bg-green-50 border-b border-green-100' :
                    'bg-amber-50 border-b border-amber-100'
                }`}>
                    <div className="flex items-center gap-2 text-[12px] font-bold">
                        {c.tipo === 'urgente'  && <><AlertTriangle size={14} className="text-red-600" /><span className="text-red-700">Alerta urgente</span></>}
                        {c.tipo === 'reunion'  && <><Calendar size={14} className="text-blue-600" /><span className="text-blue-700">Aviso de reunión</span></>}
                        {c.tipo === 'pdf'      && <><FileText size={14} className="text-green-600" /><span className="text-green-700">Documento oficial</span></>}
                        {c.tipo === 'planilla' && <><Table size={14} className="text-amber-600" /><span className="text-amber-700">Cambio en planilla</span></>}
                        {pendientes.length > 1 && (
                            <span className="ml-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                +{pendientes.length - 1} más
                            </span>
                        )}
                    </div>
                    <button onClick={() => setModalVisto(false)} className="text-slate-400 hover:text-slate-700">
                        <X size={15} />
                    </button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3">
                    <div className="font-bold text-slate-800 text-[15px]">{c.titulo}</div>
                    <div className="text-[13px] text-slate-600 leading-relaxed">{c.mensaje}</div>
                    {c.fecha_evento && (
                        <div className="text-[11px] text-slate-500 font-medium">
                            📅 {new Date(c.fecha_evento + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </div>
                    )}
                    {c.pdf_url && (
                        <a href={c.pdf_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-700 font-semibold hover:bg-green-100 transition-colors">
                            <FileText size={14} /> {c.pdf_nombre || 'Ver documento adjunto'}
                        </a>
                    )}
                </div>

                <div className="px-5 pb-4 flex gap-2">
                    <button onClick={() => setModalVisto(false)}
                        className="flex-1 py-2 rounded-lg border border-slate-200 text-[12px] text-slate-500 font-semibold hover:bg-slate-50 transition-all">
                        Ver luego
                    </button>
                    <button
                        onClick={() => {
                            if (user) confirmarVisto(c.id, user.id, user.nombre_completo);
                            setModalVisto(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold transition-all">
                        <Check size={13} /> Confirmar recepción
                    </button>
                </div>
            </div>
        </div>
    );
};