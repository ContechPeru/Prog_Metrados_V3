// --- Usuarios Service ---------------------------------------------------------
// Gestión de usuarios: crea en auth.users via Admin API y en tabla usuarios.
import { supabase } from '../lib/supabase';

export interface UsuarioCompleto {
    id: string;
    dni: string;
    nombre_completo: string;
    correo: string;
    cargo: string | null;
    rol_id: string | null;
    rol_codigo: string | null;
    rol_nombre: string | null;
    especialidad_id: string | null;
    especialidad_nombre: string | null;
    obra_id: string | null;
    es_admin: boolean;
    es_gerencia: boolean;
    activo: boolean;
    creado_en: string;
}

export interface CrearUsuarioPayload {
    dni: string;
    nombre_completo: string;
    correo: string;
    password: string;
    cargo?: string;
    rol_id: string;
    especialidad_id?: string;
    obra_id?: string;
    es_admin: boolean;
    es_gerencia: boolean;
}

export interface ActualizarUsuarioPayload {
    nombre_completo?: string;
    cargo?: string;
    rol_id?: string;
    especialidad_id?: string | null;
    obra_id?: string | null;
    es_admin?: boolean;
    es_gerencia?: boolean;
    activo?: boolean;
}

export const usuariosService = {

    async listar(): Promise<UsuarioCompleto[]> {
        const { data, error } = await supabase
            .from('usuarios')
            .select(`
                id, dni, nombre_completo, correo, cargo,
                rol_id, es_admin, es_gerencia, activo, creado_en,
                especialidad_id, obra_id,
                roles!usuarios_rol_id_fkey ( codigo, nombre ),
                especialidades!usuarios_especialidad_id_fkey ( nombre )
            `)
            .order('nombre_completo');

        if (error) { console.error('[usuariosService.listar]', error); return []; }

        return (data || []).map((u: any) => ({
            id:                  u.id,
            dni:                 u.dni,
            nombre_completo:     u.nombre_completo,
            correo:              u.correo,
            cargo:               u.cargo,
            rol_id:              u.rol_id,
            rol_codigo:          u.roles?.codigo ?? null,
            rol_nombre:          u.roles?.nombre ?? null,
            especialidad_id:     u.especialidad_id,
            especialidad_nombre: u.especialidades?.nombre ?? null,
            obra_id:             u.obra_id,
            es_admin:            u.es_admin,
            es_gerencia:         u.es_gerencia,
            activo:              u.activo,
            creado_en:           u.creado_en,
        }));
    },

    async crear(payload: CrearUsuarioPayload): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crear-usuario`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.error || 'Error al crear usuario' };
            }

            return { success: true };

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    async actualizar(id: string, payload: ActualizarUsuarioPayload): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase
            .from('usuarios')
            .update(payload)
            .eq('id', id);

        if (error) return { success: false, error: error.message };
        return { success: true };
    },

    async toggleActivo(id: string, activo: boolean): Promise<{ success: boolean; error?: string }> {
        return this.actualizar(id, { activo });
    },

    async cambiarPassword(id: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
        const { error } = await supabase.auth.admin.updateUserById(id, {
            password: newPassword,
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
    },
};