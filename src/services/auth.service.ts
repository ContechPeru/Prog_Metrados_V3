// --- Auth Service -------------------------------------------------------------
// Única capa que habla con Supabase Auth y la tabla usuarios.
// El store llama a este servicio — nunca llama a Supabase directamente.
import { supabase } from '../lib/supabase';
import type { User } from '../models/user.model';

interface LoginResult {
    success: boolean;
    user?: User;
    error?: string;
}

async function fetchPerfil(userId: string): Promise<User | null> {
    const { data, error } = await supabase
        .from('usuarios')
        .select(`
            id,
            dni,
            nombre_completo,
            correo,
            cargo,
            especialidad_id,
            activo,
            es_admin,
            es_gerencia,
            roles!usuarios_rol_id_fkey ( codigo, nombre ),
            especialidades!usuarios_especialidad_id_fkey ( codigo, nombre )
        `)
        .eq('id', userId)
        .single();

    console.log('fetchPerfil error:', error);
    console.log('fetchPerfil data:', data);
    if (error || !data) return null;

    const rolCodigo = (data.roles as any)?.codigo ?? null;

    return {
        id:                  data.id,
        dni:                 data.dni,
        nombre_completo:     data.nombre_completo,
        correo:              data.correo,
        cargo:               data.cargo,
        especialidad_id:     data.especialidad_id,
        especialidad_nombre: (data.especialidades as any)?.nombre ?? null,
        roles_apps:          rolCodigo ? { metrados: rolCodigo } : null,
        es_admin:            data.es_admin,
        es_gerencia:         data.es_gerencia,
        activo:              data.activo,
    };
}

export const authService = {
    async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error || !data.user) {
            return { success: false, error: 'Correo o contraseña incorrectos' };
        }

        const perfil = await fetchPerfil(data.user.id);

        if (!perfil) {
            await supabase.auth.signOut();
            return { success: false, error: 'Usuario sin perfil. Contacta al administrador.' };
        }

        if (!perfil.activo) {
            await supabase.auth.signOut();
            return { success: false, error: 'Tu cuenta está desactivada.' };
        }

        return { success: true, user: perfil };
    },

    async logout(): Promise<void> {
        await supabase.auth.signOut();
    },

    async getSession(): Promise<User | null> {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.user) return null;
        return await fetchPerfil(data.session.user.id);
    },
};