// ─── Auth Store ───────────────────────────────────────────────────────────────
// Maneja SOLO estado de autenticación.
// Toda lógica de negocio vive en authService.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/auth.service';
import type { User } from '../models/user.model';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Acciones
    login:     (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout:    () => Promise<void>;
    checkAuth: () => Promise<void>;

    // Permisos — calculados desde el estado, sin lógica extra
    isAdmin:             () => boolean;
    isGerencia:          () => boolean;
    isAdminPresupuesto:  () => boolean;  // alias para compatibilidad con App.tsx
    isLiquidaciones:     () => boolean;   // ← esta línea
    isReadOnlyMetrados:  () => boolean;
    canEditMetrado:      (autorReferencia: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user:            null,
            isAuthenticated: false,
            isLoading:       false,

            login: async (email, password) => {
                set({ isLoading: true });
                const result = await authService.login(email, password);
                if (result.success && result.user) {
                    set({ user: result.user, isAuthenticated: true });
                }
                set({ isLoading: false });
                return { success: result.success, error: result.error };
            },

            logout: async () => {
                await authService.logout();
                set({ user: null, isAuthenticated: false });
                localStorage.removeItem('auth-storage');
            },

            checkAuth: async () => {
                const user = await authService.getSession();
                if (user) {
                    set({ user, isAuthenticated: true });
                } else {
                    set({ user: null, isAuthenticated: false });
                }
            },

            // ── Permisos ───────────────────────────────────────────────────────
            isAdmin:            () => get().user?.es_admin    ?? false,
            isGerencia:         () => get().user?.es_gerencia ?? false,
            isAdminPresupuesto: () => get().user?.es_admin    ?? false,
            isLiquidaciones:    () => false,   // ← agregar esto

            isReadOnlyMetrados: () => {
                const cargo = (get().user?.cargo ?? '').toUpperCase();
                return (
                    cargo.includes('VISITA')    ||
                    cargo.includes('OBSERVADOR')||
                    cargo.includes('LECTOR')
                );
            },

            canEditMetrado: (autorReferencia) => {
                const { user } = get();
                if (!user)                        return false;
                if (get().isReadOnlyMetrados())   return false;
                if (get().isAdmin())              return true;
                if (get().isGerencia())           return true;

                // Usuario regular: solo edita sus propios registros
                const miNombre  = user.nombre_completo.trim().toUpperCase();
                const autorFila = autorReferencia.trim().toUpperCase();
                return miNombre === autorFila;
            },
        }),
        { name: 'auth-storage' }
    )
);