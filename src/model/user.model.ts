// ─── Modelo de Usuario ────────────────────────────────────────────────────────
// Define la forma exacta de un usuario autenticado en el sistema.
// Es la única fuente de verdad para el tipo User en toda la app.

export interface User {
    id: string;
    dni: string;
    nombre_completo: string;
    correo: string | null;
    cargo: string | null;
    especialidad_id: string | null;
    especialidad_nombre: string | null;
    roles_apps: { metrados?: string; [key: string]: string | undefined } | null;
    es_admin: boolean;
    es_gerencia: boolean;
    activo: boolean;
}

export type UserRole = 'admin' | 'gerencia' | 'editor' | 'lector';
