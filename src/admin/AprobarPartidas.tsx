import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useMetradosStore } from '../store/useMetradosStore';
import { X, Check, Clock, Search } from 'lucide-react';

interface PartidaPendiente {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  tipo_metrado: string;
  estado_aprobacion: string;
  precio_unitario: number | null;
  especialidad: string;
  creado_en: string;
  creado_por_nombre?: string;
}

export const AprobarPartidas = ({ onClose }: { onClose: () => void }) => {
  const [partidas, setPartidas] = useState<PartidaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editando, setEditando] = useState<Record<string, { precio: string; descripcion: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { especialidades } = useMetradosStore();

  const fetchPendientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partidas')
      .select(`*, especialidades(nombre)`)
      .or('estado_aprobacion.eq.PENDIENTE,precio_unitario.is.null')
      .eq('es_personalizada', true)
      .order('creado_en', { ascending: false });

    if (!error && data) {
      setPartidas(data.map((p: any) => ({
        ...p,
        especialidad: p.especialidades?.nombre || p.especialidades?.codigo || '—',
      })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchPendientes(); }, []);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  const iniciarEdicion = (p: PartidaPendiente) => {
    setEditando(prev => ({
      ...prev,
      [p.id]: { precio: p.precio_unitario?.toString() || '', descripcion: p.descripcion }
    }));
  };

  const aprobar = async (id: string) => {
    const edit = editando[id];
    if (!edit) return;
    const precio = parseFloat(edit.precio);
    if (isNaN(precio) || precio <= 0) {
      setToast('⚠️ Ingresa un precio válido mayor a 0');
      return;
    }
    setGuardando(id);
    const { error } = await supabase
      .from('partidas')
      .update({
        precio_unitario: precio,
        descripcion: edit.descripcion,
        estado_aprobacion: 'APROBADO',
        aprobado_en: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      setToast('✅ Partida aprobada correctamente');
      useMetradosStore.getState().fetchCatalogoMaestro();
      useMetradosStore.getState().fetchCustomPartidas();
      setEditando(prev => { const n = { ...prev }; delete n[id]; return n; });
      fetchPendientes();
    } else {
      setToast('❌ Error al aprobar: ' + error.message);
    }
    setGuardando(null);
  };

  const filtradas = partidas.filter(p =>
    p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.especialidad.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-black text-slate-800">Aprobar Partidas Pendientes</h2>
            <p className="text-xs text-slate-400 font-medium">Partidas creadas por metradores que requieren precio y aprobación</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Buscador */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, descripción o especialidad..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando partidas...</div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Check size={32} className="text-green-400" />
              <p className="text-slate-500 text-sm font-medium">No hay partidas pendientes de aprobación</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtradas.map(p => {
                const edit = editando[p.id];
                return (
                  <div key={p.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{p.codigo}</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{p.especialidad}</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            <Clock size={10} /> PENDIENTE
                          </span>
                        </div>

                        {edit ? (
                          <input
                            className="w-full text-sm font-medium text-slate-700 border border-blue-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-50 mb-2"
                            value={edit.descripcion}
                            onChange={e => setEditando(prev => ({ ...prev, [p.id]: { ...prev[p.id], descripcion: e.target.value } }))}
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-700 mb-1">{p.descripcion}</p>
                        )}

                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span>Unidad: <strong>{p.unidad}</strong></span>
                          <span>Tipo: <strong>{p.tipo_metrado}</strong></span>
                          <span>Creado: <strong>{new Date(p.creado_en).toLocaleDateString('es-PE')}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {edit ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-500">S/</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={edit.precio}
                                onChange={e => setEditando(prev => ({ ...prev, [p.id]: { ...prev[p.id], precio: e.target.value } }))}
                                className="w-28 text-sm font-black text-right border border-blue-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-50"
                                autoFocus
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditando(prev => { const n = { ...prev }; delete n[p.id]; return n; })}
                                className="px-3 py-1.5 text-[11px] font-bold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50"
                              >Cancelar</button>
                              <button
                                onClick={() => aprobar(p.id)}
                                disabled={guardando === p.id}
                                className="px-3 py-1.5 text-[11px] font-black text-white bg-green-500 hover:bg-green-600 rounded-lg flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check size={12} />
                                {guardando === p.id ? 'Guardando...' : 'Aprobar'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            onClick={() => iniciarEdicion(p)}
                            className="px-3 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-all"
                          >
                            Poner precio y aprobar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {filtradas.length} partida{filtradas.length !== 1 ? 's' : ''} pendiente{filtradas.length !== 1 ? 's' : ''}
          </span>
          {toast && <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">{toast}</span>}
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};