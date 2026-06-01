import React, { useEffect, useRef, useState } from 'react';
import { X, Send, Upload, Trash2, Check, FileText, AlertTriangle, Calendar, Table, ChevronDown } from 'lucide-react';
import { useComunicadosStore, TipoComunicado } from '../store/useComunicadosStore';
import { useAuthStore } from '../store/useAuthStore';

const TIPOS: { id: TipoComunicado; label: string; color: string; bg: string; border: string }[] = [
    { id: 'urgente',  label: 'Alerta urgente', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-400' },
    { id: 'reunion',  label: 'Reunión',         color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-400' },
    { id: 'pdf',      label: 'Documento PDF',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-400' },
    { id: 'planilla', label: 'Cambio planilla', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-400' },
];

const TipoIcon = ({ tipo, size = 14 }: { tipo: TipoComunicado; size?: number }) => {
    if (tipo === 'urgente')  return <AlertTriangle size={size} />;
    if (tipo === 'reunion')  return <Calendar size={size} />;
    if (tipo === 'pdf')      return <FileText size={size} />;
    if (tipo === 'planilla') return <Table size={size} />;
    return null;
};

const getBorderColor = (tipo: TipoComunicado) => {
    if (tipo === 'urgente')  return 'border-l-red-400';
    if (tipo === 'reunion')  return 'border-l-blue-400';
    if (tipo === 'pdf')      return 'border-l-green-400';
    if (tipo === 'planilla') return 'border-l-amber-400';
    return 'border-l-slate-300';
};

interface Props { proyecto?: string; }

export const Comunicados: React.FC<Props> = ({ proyecto = 'belempampa' }) => {
    const { comunicados, isLoading, fetchComunicados, publicar, eliminar, confirmarVisto, setOpen } = useComunicadosStore();
    const { user } = useAuthStore();
    const isAdmin = user?.roles_apps?.comunicados === 'admin';

    const [tipo, setTipo] = useState<TipoComunicado>('urgente');
    const [titulo, setTitulo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [fechaEvento, setFechaEvento] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [publishing, setPublishing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchComunicados(proyecto); }, [proyecto]);

    const handlePublicar = async () => {
        if (!titulo.trim() || !mensaje.trim() || !user) return;
        setPublishing(true);
        await publicar({
            titulo: titulo.trim(),
            mensaje: mensaje.trim(),
            tipo,
            fecha_evento: fechaEvento || null,
            autor_id: user.id,
            autor_nombre: user.nombre_completo,
            proyecto,
        }, pdfFile);
        setTitulo(''); setMensaje(''); setFechaEvento(''); setPdfFile(null);
        setPublishing(false);
    };

    const yaVisto = (c: typeof comunicados[0]) =>
        (c.vistos || []).some(v => v.usuario_id === user?.id);

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-800">📢 Comunicados</span>
                    <span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        {comunicados.length} publicados
                    </span>
                </div>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Feed */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {isLoading && (
                        <div className="text-center text-slate-400 text-sm py-10">Cargando comunicados...</div>
                    )}
                    {!isLoading && comunicados.length === 0 && (
                        <div className="text-center text-slate-400 text-sm py-10">Sin comunicados publicados.</div>
                    )}
                    {comunicados.map(c => {
                        const t = TIPOS.find(x => x.id === c.tipo)!;
                        const visto = yaVisto(c);
                        return (
                            <div key={c.id} className={`border border-slate-100 border-l-4 ${getBorderColor(c.tipo)} rounded-r-xl rounded-l-none p-4 flex flex-col gap-2 bg-white`}>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${t.bg} ${t.color}`}>
                                        <TipoIcon tipo={c.tipo} size={11} />
                                        {t.label}
                                    </span>
                                    {c.fecha_evento && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            📅 {new Date(c.fecha_evento + 'T12:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    )}
                                    <span className="ml-auto text-[10px] text-slate-400">
                                        {new Date(c.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                                    </span>
                                    {isAdmin && (
                                        <button onClick={() => eliminar(c.id)} className="text-slate-300 hover:text-red-500 transition-colors ml-1">
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                                <div className="font-bold text-slate-800 text-[13px]">{c.titulo}</div>
                                <div className="text-[12px] text-slate-600 leading-relaxed">{c.mensaje}</div>
                                {c.pdf_url && (
                                    <a href={c.pdf_url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-[11px] text-green-700 font-semibold hover:bg-green-100 transition-colors w-fit">
                                        <FileText size={13} /> {c.pdf_nombre || 'Ver documento'}
                                    </a>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-1.5">
                                        {(c.vistos || []).slice(0, 5).map(v => (
                                            <div key={v.usuario_id} title={v.usuario_nombre}
                                                className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[8px] font-black border border-white">
                                                {v.usuario_nombre.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                                            </div>
                                        ))}
                                        <span className="text-[10px] text-slate-400 ml-1">
                                            {(c.vistos || []).length} visto{(c.vistos || []).length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => !visto && user && confirmarVisto(c.id, user.id, user.nombre_completo)}
                                        disabled={visto}
                                        className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                                            visto
                                                ? 'bg-green-50 text-green-700 border-green-300 cursor-default'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-green-400 hover:text-green-700 hover:bg-green-50'
                                        }`}
                                    >
                                        <Check size={11} /> {visto ? 'Visto ✓' : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Panel admin */}
                {isAdmin && (
                    <div className="w-64 border-l border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-3 overflow-y-auto shrink-0">
                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Nuevo comunicado</div>

                        <div className="grid grid-cols-2 gap-1.5">
                            {TIPOS.map(t => (
                                <button key={t.id} onClick={() => setTipo(t.id)}
                                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                        tipo === t.id
                                            ? `${t.bg} ${t.color} ${t.border} border`
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}>
                                    <TipoIcon tipo={t.id} size={11} /> {t.label}
                                </button>
                            ))}
                        </div>

                        <input
                            type="text" placeholder="Título del comunicado"
                            value={titulo} onChange={e => setTitulo(e.target.value)}
                            className="text-[11px] px-2.5 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400 text-slate-800 placeholder:text-slate-300 w-full"
                        />

                        <textarea
                            placeholder="Mensaje detallado..."
                            value={mensaje} onChange={e => setMensaje(e.target.value)}
                            rows={4}
                            className="text-[11px] px-2.5 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400 text-slate-700 placeholder:text-slate-300 w-full resize-none"
                        />

                        <div>
                            <div className="text-[10px] text-slate-400 font-bold mb-1">Fecha del evento</div>
                            <input type="date" value={fechaEvento} onChange={e => setFechaEvento(e.target.value)}
                                className="text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-400 text-slate-700 w-full" />
                        </div>

                        <div>
                            <div className="text-[10px] text-slate-400 font-bold mb-1">Adjuntar PDF (opcional)</div>
                            <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                                onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                            <button onClick={() => fileRef.current?.click()}
                                className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all bg-white">
                                <Upload size={13} />
                                {pdfFile ? pdfFile.name : 'Subir PDF'}
                            </button>
                            {pdfFile && (
                                <button onClick={() => setPdfFile(null)} className="text-[10px] text-red-400 hover:text-red-600 mt-1 w-full text-center">
                                    Quitar archivo
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handlePublicar}
                            disabled={!titulo.trim() || !mensaje.trim() || publishing}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-bold transition-all ${
                                titulo.trim() && mensaje.trim() && !publishing
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            <Send size={13} />
                            {publishing ? 'Publicando...' : 'Publicar comunicado'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};