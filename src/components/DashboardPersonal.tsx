import { useState, useMemo } from 'react';
import { usePersonalStore, Personal } from '../store/usePersonalStore';
import { useMetradosStore } from '../store/useMetradosStore';
import { useAuthStore } from '../store/useAuthStore';
import { Users, X, Plus, Edit2, Save, Trash2, Search, ChevronRight, ChevronLeft } from 'lucide-react';

interface DashboardPersonalProps {
    onClose: () => void;
    isReadOnly?: boolean;
}

const CATEGORIAS = ['OPERARIO', 'OFICIAL', 'PEON'];
const SEXOS = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }];

const inputCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white transition";
const labelCls = "text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block";
const reqStar  = <span className="text-red-500 ml-0.5">*</span>;

export function DashboardPersonal({ onClose, isReadOnly }: DashboardPersonalProps) {
    const { personal, updateWorker, deleteWorker, addWorker } = usePersonalStore();
    const { especialidades } = useMetradosStore();
    const { user } = useAuthStore();

    const [searchTerm, setSearchTerm]   = useState('');
    const [editingId, setEditingId]     = useState<string | null>(null);
    const [editForm, setEditForm]       = useState<Partial<Personal>>({});
    const [isAdding, setIsAdding]       = useState(false);
    const [sinTelefono, setSinTelefono] = useState(false);
    const [showAllCols, setShowAllCols] = useState(false);

    const espDefecto = useMemo(() => {
        if (!user) return '';
        const esp = especialidades.find(e => e.id === (user as any).especialidad_id);
        return esp?.id || '';
    }, [user, especialidades]);

    const [newWorker, setNewWorker] = useState({
        dni: '', nombre_completo: '', sexo: 'M',
        especialidad_id: espDefecto, cuadrilla: '',
        categoria: 'PEON' as string, telefono: '',
        condicion: 'ACTIVO', oficio: '',
        fecha_ingreso: new Date().toISOString().split('T')[0],
        activo: true,
    });

    const filteredPersonal = useMemo(() => {
        if (!searchTerm) return personal;
        const lower = searchTerm.toLowerCase();
        return personal.filter(p =>
            p.nombre_completo?.toLowerCase().includes(lower) ||
            p.dni?.includes(lower) ||
            p.cuadrilla?.toLowerCase().includes(lower)
        );
    }, [personal, searchTerm]);

    const handleEditClick = (worker: Personal) => {
        setEditingId(worker.id);
        setEditForm({
            especialidad_id: worker.especialidad_id,
            cuadrilla:       worker.cuadrilla,
            categoria:       worker.categoria,
            condicion:       worker.condicion,
            oficio:          worker.oficio,
            telefono:        worker.telefono,
        });
    };

    const handleSaveEdit = async (id: string) => {
        if (isReadOnly) return;
        await updateWorker(id, editForm);
        setEditingId(null);
    };

    const handleAddNew = async () => {
        if (isReadOnly) return;
        if (!newWorker.nombre_completo.trim()) return alert('El nombre es obligatorio');
        if (!newWorker.dni.trim())             return alert('El DNI es obligatorio');
        if (!newWorker.cuadrilla.trim())       return alert('La cuadrilla es obligatoria');
        if (!newWorker.categoria)              return alert('La categoría es obligatoria');
        const payload = { ...newWorker, telefono: sinTelefono ? null : (newWorker.telefono || null) };
        await addWorker(payload as any);
        setIsAdding(false);
        setSinTelefono(false);
        setNewWorker({
            dni: '', nombre_completo: '', sexo: 'M',
            especialidad_id: espDefecto, cuadrilla: '',
            categoria: 'PEON', telefono: '', condicion: 'ACTIVO',
            oficio: '', fecha_ingreso: new Date().toISOString().split('T')[0],
            activo: true,
        });
    };

    const esAdmin = user?.es_admin || user?.es_gerencia;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">

                {/* Header — azul coherente con el sistema */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-400 text-white px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl">
                            <Users size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold tracking-tight">Gestión de Personal y Cuadrillas</h2>
                            <p className="text-blue-100 text-xs">Organiza los obreros, especialidades y cuadrillas.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-300 rounded-full transition-colors duration-400">
                        <X size={18} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-3 items-center justify-between">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" placeholder="Buscar por nombre, DNI o cuadrilla..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/40 outline-none" />
                    </div>
                    {!isReadOnly && (
                        <button onClick={() => setIsAdding(v => !v)}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow transition">
                            <Plus size={15} /> Nuevo Obrero
                        </button>
                    )}
                </div>

                {/* Formulario */}
                {isAdding && (
                    <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">
                            Nuevo obrero — <span className="text-red-500">*</span> obligatorio
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className={labelCls}>DNI {reqStar}</label>
                                <input className={inputCls} placeholder="00000000"
                                    value={newWorker.dni} onChange={e => setNewWorker({ ...newWorker, dni: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className={labelCls}>Apellidos y Nombres {reqStar}</label>
                                <input className={inputCls} placeholder="APELLIDO APELLIDO, Nombre"
                                    value={newWorker.nombre_completo} onChange={e => setNewWorker({ ...newWorker, nombre_completo: e.target.value })} />
                            </div>
                            <div>
                                <label className={labelCls}>Sexo {reqStar}</label>
                                <select className={inputCls} value={newWorker.sexo}
                                    onChange={e => setNewWorker({ ...newWorker, sexo: e.target.value })}>
                                    {SEXOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Especialidad</label>
                                <select className={inputCls} value={newWorker.especialidad_id}
                                    disabled={!esAdmin}
                                    onChange={e => setNewWorker({ ...newWorker, especialidad_id: e.target.value })}>
                                    <option value="">Sin especialidad</option>
                                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                </select>
                                {!esAdmin && <p className="text-[10px] text-blue-500 mt-0.5 italic">Asignada según tu perfil</p>}
                            </div>
                            <div>
                                <label className={labelCls}>Cuadrilla {reqStar}</label>
                                <input className={inputCls} placeholder="Ej: C1"
                                    value={newWorker.cuadrilla} onChange={e => setNewWorker({ ...newWorker, cuadrilla: e.target.value })} />
                            </div>
                            <div>
                                <label className={labelCls}>Categoría {reqStar}</label>
                                <select className={inputCls} value={newWorker.categoria}
                                    onChange={e => setNewWorker({ ...newWorker, categoria: e.target.value })}>
                                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Oficio</label>
                                <input className={inputCls} placeholder="Sin oficio / Polivalente"
                                    value={newWorker.oficio} onChange={e => setNewWorker({ ...newWorker, oficio: e.target.value })} />
                            </div>
                            <div>
                                <label className={labelCls}>Teléfono</label>
                                <input className={inputCls} placeholder="999 999 999"
                                    value={sinTelefono ? '' : newWorker.telefono}
                                    disabled={sinTelefono}
                                    onChange={e => setNewWorker({ ...newWorker, telefono: e.target.value })} />
                                <label className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 cursor-pointer">
                                    <input type="checkbox" checked={sinTelefono}
                                        onChange={e => setSinTelefono(e.target.checked)} className="accent-blue-600" />
                                    Sin número
                                </label>
                            </div>
                            <div>
                                <label className={labelCls}>Condición</label>
                                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                                    {['ACTIVO', 'INACTIVO'].map(c => (
                                        <button key={c} type="button"
                                            onClick={() => setNewWorker({ ...newWorker, condicion: c })}
                                            className={`flex-1 py-2 text-xs font-bold transition ${newWorker.condicion === c
                                                ? c === 'ACTIVO' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                                                : 'bg-white text-slate-400 hover:bg-slate-50'}`}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Fecha de Ingreso</label>
                                <input type="date" className={inputCls}
                                    value={newWorker.fecha_ingreso}
                                    onChange={e => setNewWorker({ ...newWorker, fecha_ingreso: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4 justify-end">
                            <button onClick={() => setIsAdding(false)}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
                                Cancelar
                            </button>
                            <button onClick={handleAddNew}
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow transition">
                                <Save size={15} /> Guardar Obrero
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabla */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-max">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">DNI</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Categoría</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Especialidad</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Cuadrilla</th>
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Condición</th>

                                {/* Columnas extra */}
                                {showAllCols && <>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Sexo</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Oficio</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">F. Ingreso</th>
                                </>}
                                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide text-right">Acciones</th>
                                {/* Toggle columnas */}
                                <th className="px-3 py-3 text-right">
                                    <button onClick={() => setShowAllCols(v => !v)}
                                        className="flex items-center gap-1 text-[10px] font-bold text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition whitespace-nowrap ml-auto">
                                        {showAllCols
                                            ? <><ChevronLeft size={11} /> Ver menos</>
                                            : <><ChevronRight size={11} /> Ver más</>}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPersonal.length === 0 ? (
                                <tr>
                                    <td colSpan={showAllCols ? 12 : 8} className="text-center py-12 text-slate-400 italic text-sm">
                                        Ninguna persona encontrada.
                                    </td>
                                </tr>
                            ) : filteredPersonal.map(worker => {
                                const isEditing = editingId === worker.id;
                                return (
                                    <tr key={worker.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{worker.dni}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{worker.nombre_completo}</td>
                                        <td className="px-4 py-3">
                                            {isEditing ? (
                                                <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                                    value={editForm.categoria || ''}
                                                    onChange={e => setEditForm({ ...editForm, categoria: e.target.value })}>
                                                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            ) : (
                                                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-lg">
                                                    {worker.categoria || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">
                                            {isEditing ? (
                                                <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                                    value={editForm.especialidad_id || ''}
                                                    disabled={!esAdmin}
                                                    onChange={e => setEditForm({ ...editForm, especialidad_id: e.target.value })}>
                                                    <option value="">Sin especialidad</option>
                                                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                                                </select>
                                            ) : (worker.especialidad || <span className="text-slate-300">-</span>)}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing ? (
                                                <input className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-20"
                                                    value={editForm.cuadrilla || ''}
                                                    onChange={e => setEditForm({ ...editForm, cuadrilla: e.target.value })} />
                                            ) : (
                                                <span className="font-mono text-xs text-slate-700">{worker.cuadrilla || '-'}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing ? (
                                                <div className="flex rounded-lg overflow-hidden border border-slate-200">
                                                    {['ACTIVO', 'INACTIVO'].map(c => (
                                                        <button key={c} type="button"
                                                            onClick={() => setEditForm({ ...editForm, condicion: c })}
                                                            className={`px-2 py-1 text-[10px] font-bold transition ${editForm.condicion === c
                                                                ? c === 'ACTIVO' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                                                                : 'bg-white text-slate-400'}`}>
                                                            {c}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    worker.condicion === 'ACTIVO' || !worker.condicion
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'}`}>
                                                    {worker.condicion || 'ACTIVO'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Columnas extra */}
                                        {showAllCols && <>
                                            <td className="px-4 py-3 text-xs text-slate-500">
                                                {worker.sexo === 'M' ? 'Masculino' : worker.sexo === 'F' ? 'Femenino' : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{worker.oficio || '-'}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">{worker.telefono || '-'}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{worker.fecha_ingreso || '-'}</td>
                                        </>}

                                        
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 justify-end">
                                                {!isReadOnly && (isEditing ? (
                                                    <button onClick={() => handleSaveEdit(worker.id)}
                                                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                                        <Save size={13} />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleEditClick(worker)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                        <Edit2 size={13} />
                                                    </button>
                                                ))}
                                                {!isReadOnly && (
                                                    <button onClick={() => deleteWorker(worker.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-3">{/* espacio del toggle */}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 text-center">
                    Mostrando {filteredPersonal.length} de {personal.length} obreros registrados.
                </div>
            </div>
        </div>
    );
}