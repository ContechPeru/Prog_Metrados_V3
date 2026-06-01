import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface SystemUsersState {
    systemUsers: User[];
    fetchSystemUsers: () => Promise<void>;
}

export const useSystemUsersStore = create<SystemUsersState>()((set) => ({
    systemUsers: [],

    fetchSystemUsers: async () => {
        const { data, error } = await supabase
            .from('usuarios')
            .select(`
                id,
                dni,
                nombre_completo,
                correo,
                cargo,
                es_admin,
                es_gerencia,
                activo,
                rol_id,
                especialidad_id,
                roles(codigo, nombre),
                especialidades(codigo, nombre)
            `)
            .eq('activo', true)
            .order('nombre_completo');

        if (!error && data) {
            // Mapear al tipo User que espera el frontend
            const mapped = data.map((u: any) => ({
                id:              u.id,
                dni_username:    u.dni,
                nombre_completo: u.nombre_completo,
                correo:          u.correo,
                cargo:           u.cargo,
                // especialidad como nombre para mostrar en UI
                especialidad:    u.especialidades?.nombre || u.especialidades?.codigo || '',
                especialidad_id: u.especialidad_id,
                es_administrador_presupuesto: u.es_admin,
                es_gerencia:     u.es_gerencia,
                roles_apps: {
                    metrados: u.roles?.codigo === 'METRADOR' ? 'editor' : 
                              u.roles?.codigo === 'VEDOR'    ? 'viewer' : 
                              u.es_admin                     ? 'admin'  : 'viewer',
                },
            }));

            set({ systemUsers: mapped as User[] });

            // Cache global para filteringLogic.ts
            if (typeof window !== 'undefined') {
                (window as any).__systemUsersCache = mapped;
            }
        } else {
            console.error('[fetchSystemUsers] Error:', error);
        }
    },
}));