import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Edit2, Power, KeyRound, X, Save, Eye, EyeOff, Shield, ChevronDown, UserCheck, UserX, RefreshCw, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usuariosService, type UsuarioCompleto, type CrearUsuarioPayload } from '../services/usuarios.service';
import { useAuthStore } from '../store/useAuthStore';

// ─── Tipos locales ────────────────────────────────────────────────────────────
interface Rol { id: string; codigo: string; nombre: string; }
interface Especialidad { id: string; codigo: string; nombre: string; }
interface Obra { id: string; codigo: string; nombre: string; }

const ROL_COLORS: Record<string, string> = {
    ADMIN:      'bg-red-100 text-red-700 border-red-200',
    RESIDENTE:  'bg-purple-100 text-purple-700 border-purple-200',
    SUPERVISOR: 'bg-blue-100 text-blue-700 border-blue-200',
    JEFE_ESP:   'bg-indigo-100 text-indigo-700 border-indigo-200',
    METRADOR:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    VEDOR:      'bg-amber-100 text-amber-700 border-amber-200',
    GERENCIA:   'bg-pink-100 text-pink-700 border-pink-200',
};

// ─── Modal Formulario ─────────────────────────────────────────────────────────
function UsuarioModal({
    usuario, roles, especialidades, obras, onClose, onSaved
}: {
    usuario: UsuarioCompleto | null;
    roles: Rol[];
    especialidades: Especialidad[];
    obras: Obra[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const esEdicion = !!usuario;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);

    const [form, setForm] = useState({
        dni:             usuario?.dni || '',
        nombre_completo: usuario?.nombre_completo || '',
        correo:          usuario?.correo || '',
        cargo:           usuario?.cargo || '',
        password:        '',
        rol_id:          usuario?.rol_id || '',
        especialidad_id: usuario?.especialidad_id || '',
        obra_id:         usuario?.obra_id || '',
        es_admin:        usuario?.es_admin || false,
        es_gerencia:     usuario?.es_gerencia || false,
        modulos_extra:   {} as Record<string, boolean>,
    });

    const rolSeleccionado = roles.find(r => r.id === form.rol_id);
    const requiereEspecialidad = rolSeleccionado?.codigo === 'METRADOR' || rolSeleccionado?.codigo === 'JEFE_ESP';

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async () => {
        setError('');
        if (!form.dni || !form.nombre_completo || !form.correo || !form.rol_id) {
            setError('DNI, nombre, correo y rol son obligatorios.');
            return;
        }
        if (!esEdicion && !form.password) {
            setError('La contraseña es obligatoria al crear un usuario.');
            return;
        }
        if (requiereEspecialidad && !form.especialidad_id) {
            setError('La especialidad es obligatoria para este rol.');
            return;
        }
        setLoading(true);
        if (esEdicion) {
            const res = await usuariosService.actualizar(usuario!.id, {
                nombre_completo: form.nombre_completo,
                cargo:           form.cargo || null,
                rol_id:          form.rol_id,
                especialidad_id: form.especialidad_id || null,
                obra_id:         form.obra_id || null,
                es_admin:        form.es_admin,
                es_gerencia:     form.es_gerencia,
                modulos_extra:   form.modulos_extra,
            });
            if (!res.success) { setError(res.error || 'Error al actualizar'); setLoading(false); return; }
            if (form.password) {
                await usuariosService.cambiarPassword(usuario!.id, form.password);
            }
        } else {
            const payload: CrearUsuarioPayload = {
                dni:             form.dni,
                nombre_completo: form.nombre_completo,
                correo:          form.correo,
                password:        form.password,
                cargo:           form.cargo,
                rol_id:          form.rol_id,
                especialidad_id: form.especialidad_id || undefined,
                obra_id:         form.obra_id || undefined,
                es_admin:        form.es_admin,
                es_gerencia:     form.es_gerencia,
            };
            const res = await usuariosService.crear(payload);
            if (!res.success) { setError(res.error || 'Error al crear usuario'); setLoading(false); return; }
        }
        setLoading(false);
        onSaved();
    };

    if (!isAdmin() && !isGerencia()) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                Sin permisos para ver este módulo.
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white p-2 rounded-xl">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-slate-800 font-bold text-base">
                                {esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h2>
                            <p className="text-slate-400 text-xs">
                                {esEdicion ? usuario!.correo : 'Completa todos los campos requeridos'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 flex flex-col gap-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Datos personales */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">DNI *</label>
                            <input
                                type="text" maxLength={8}
                                value={form.dni}
                                onChange={e => set('dni', e.target.value)}
                                disabled={esEdicion}
                                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                placeholder="00000000"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cargo</label>
                            <input
                                type="text"
                                value={form.cargo}
                                onChange={e => set('cargo', e.target.value)}
                                className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Metrador de Estructuras"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nombre Completo *</label>
                        <input
                            type="text"
                            value={form.nombre_completo}
                            onChange={e => set('nombre_completo', e.target.value)}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Apellidos y nombres"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Correo *</label>
                        <input
                            type="email"
                            value={form.correo}
                            onChange={e => set('correo', e.target.value)}
                            disabled={esEdicion}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                            placeholder="correo@belempampa.pe"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            {esEdicion ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={form.password}
                                onChange={e => set('password', e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={esEdicion ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Rol y Especialidad */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rol *</label>
                            <div className="relative">
                                <select
                                    value={form.rol_id}
                                    onChange={e => set('rol_id', e.target.value)}
                                    className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                                >
                                    <option value="">Seleccionar...</option>
                                    {roles.map(r => (
                                        <option key={r.id} value={r.id}>{r.nombre}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Especialidad {requiereEspecialidad && '*'}
                            </label>
                            <div className="relative">
                                <select
                                    value={form.especialidad_id}
                                    onChange={e => set('especialidad_id', e.target.value)}
                                    className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                                >
                                    <option value="">Ninguna</option>
                                    {especialidades.map(e => (
                                        <option key={e.id} value={e.id}>{e.nombre}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Obra</label>
                        <div className="relative">
                            <select
                                value={form.obra_id}
                                onChange={e => set('obra_id', e.target.value)}
                                className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                            >
                                <option value="">Sin obra asignada</option>
                                {obras.map(o => (
                                    <option key={o.id} value={o.id}>{o.nombre}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Flags */}
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.es_admin}
                                onChange={e => set('es_admin', e.target.checked)}
                                className="w-4 h-4 rounded accent-blue-600"
                            />
                            <span className="text-sm text-slate-700 font-medium flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5 text-red-500" /> Admin maestro
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.es_gerencia}
                                onChange={e => set('es_gerencia', e.target.checked)}
                                className="w-4 h-4 rounded accent-blue-600"
                            />
                            <span className="text-sm text-slate-700 font-medium">Gerencia</span>
                        </label>
                    </div>
                    {/* Acceso a módulos — solo si NO es Admin ni Gerencia */}
                    {!form.es_admin && !form.es_gerencia && (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                Acceso a módulos adicionales
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { key: 'usuarios',          label: 'Usuarios' },
                                    { key: 'status_gerencial',  label: 'Status Gerencial' },
                                    { key: 'dashboard',         label: 'Dashboard' },
                                    { key: 'admin_maestro',     label: 'Admin Maestro' },
                                    { key: 'comunicados',       label: 'Comunicados' },
                                ].map(mod => (
                                    <label key={mod.key} className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={form.modulos_extra?.[mod.key] ?? false}
                                            onChange={e => set('modulos_extra', {
                                                ...form.modulos_extra,
                                                [mod.key]: e.target.checked
                                            })}
                                            className="w-4 h-4 rounded accent-blue-600"
                                        />
                                        <span className="text-sm text-slate-700">{mod.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition shadow-sm disabled:opacity-60"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading ? 'Guardando...' : (esEdicion ? 'Actualizar' : 'Crear Usuario')}
                    </button>
                </div>
            </div>
        </div>
    );
}

//-----

// ─── Componente Principal ─────────────────────────────────────────────────────
export function UsuariosModule() {
    const { isAdmin, isGerencia } = useAuthStore();
    const [usuarios, setUsuarios] = useState<UsuarioCompleto[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [obras, setObras] = useState<Obra[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filtroRol, setFiltroRol] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [usuarioEditar, setUsuarioEditar] = useState<UsuarioCompleto | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const cargar = useCallback(async () => {
        setLoading(true);
        const [us, rolesData, espData, obrasData] = await Promise.all([
            usuariosService.listar(),
            supabase.from('roles').select('id, codigo, nombre').order('nombre'),
            supabase.from('especialidades').select('id, codigo, nombre').eq('activo', true).order('nombre'),
            supabase.from('obras').select('id, codigo, nombre').eq('activo', true),
        ]);
        setUsuarios(us);
        setRoles(rolesData.data || []);
        setEspecialidades(espData.data || []);
        setObras(obrasData.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const handleToggleActivo = async (u: UsuarioCompleto) => {
        const res = await usuariosService.toggleActivo(u.id, !u.activo);
        if (res.success) {
            showToast(`Usuario ${!u.activo ? 'activado' : 'desactivado'}`);
            cargar();
        } else {
            showToast('Error: ' + res.error);
        }
    };

    const usuariosFiltrados = usuarios.filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
            u.nombre_completo.toLowerCase().includes(q) ||
            u.correo.toLowerCase().includes(q) ||
            u.dni.includes(q);
        const matchRol = !filtroRol || u.rol_codigo === filtroRol;
        return matchSearch && matchRol;
    });

    const initials = (nombre: string) =>
        nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-screen">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 bg-slate-800 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl">
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-sm">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-slate-800 font-bold text-lg leading-tight">Gestión de Usuarios</h1>
                        <p className="text-slate-400 text-xs">{usuarios.length} usuarios registrados</p>
                    </div>
                </div>
                <button
                    onClick={() => { setUsuarioEditar(null); setModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Usuario</span>
                </button>
            </div>

            {/* Filtros */}
            <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre, correo o DNI..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="relative sm:w-48">
                    <select
                        value={filtroRol}
                        onChange={e => setFiltroRol(e.target.value)}
                        className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                    >
                        <option value="">Todos los roles</option>
                        {roles.map(r => <option key={r.id} value={r.codigo}>{r.nombre}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Lista */}
            <div className="flex-1 px-4 sm:px-6 pb-6">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <Users className="w-10 h-10 mb-3 opacity-40" />
                        <p className="font-semibold">No se encontraron usuarios</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {usuariosFiltrados.map(u => (
                            <div
                                key={u.id}
                                className={`bg-white rounded-2xl border transition-all ${
                                    u.activo
                                        ? 'border-slate-200 hover:border-blue-200 hover:shadow-md'
                                        : 'border-slate-100 opacity-60'
                                }`}
                            >
                                <div className="p-4">
                                    {/* Avatar + nombre */}
                                    <div className="flex items-start gap-3">
                                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                                            u.activo ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {initials(u.nombre_completo)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-800 font-bold text-sm truncate">{u.nombre_completo}</p>
                                            <p className="text-slate-400 text-xs truncate">{u.correo}</p>
                                            {u.cargo && <p className="text-slate-500 text-xs truncate mt-0.5">{u.cargo}</p>}
                                        </div>
                                        {!u.activo && (
                                            <span className="shrink-0 text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-lg">
                                                Inactivo
                                            </span>
                                        )}
                                    </div>

                                    {/* Badges */}
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {u.rol_codigo && (
                                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${ROL_COLORS[u.rol_codigo] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                {u.rol_nombre}
                                            </span>
                                        )}
                                        {u.especialidad_nombre && (
                                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 truncate max-w-[160px]">
                                                {u.especialidad_nombre}
                                            </span>
                                        )}
                                        {u.es_admin && (
                                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-200 flex items-center gap-1">
                                                <Shield className="w-3 h-3" /> Admin
                                            </span>
                                        )}
                                    </div>

                                    {/* DNI */}
                                    <p className="mt-2 text-[11px] text-slate-400">DNI: {u.dni}</p>
                                </div>

                                {/* Acciones */}
                                <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-end gap-1">
                                    <button
                                        onClick={() => { setUsuarioEditar(u); setModalOpen(true); }}
                                        title="Editar"
                                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleActivo(u)}
                                        title={u.activo ? 'Desactivar' : 'Activar'}
                                        className={`p-2 rounded-lg transition ${
                                            u.activo
                                                ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                        }`}
                                    >
                                        {u.activo ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <UsuarioModal
                    usuario={usuarioEditar}
                    roles={roles}
                    especialidades={especialidades}
                    obras={obras}
                    onClose={() => setModalOpen(false)}
                    onSaved={() => { setModalOpen(false); cargar(); showToast('Usuario guardado correctamente'); }}
                />
            )}
        </div>
    );
}
