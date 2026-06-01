import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type TipoComunicado = 'urgente' | 'reunion' | 'pdf' | 'planilla';

export interface Comunicado {
    id: string;
    titulo: string;
    mensaje: string;
    tipo: TipoComunicado;
    fecha_evento?: string | null;
    pdf_url?: string | null;
    pdf_nombre?: string | null;
    autor_id: string;
    autor_nombre: string;
    proyecto: string;
    created_at: string;
    vistos?: { usuario_id: string; usuario_nombre: string }[];
}

interface ComunicadosState {
    comunicados: Comunicado[];
    isLoading: boolean;
    isOpen: boolean;
    modalVisto: boolean;
    fetchComunicados: (proyecto: string) => Promise<void>;
    publicar: (data: Omit<Comunicado, 'id' | 'created_at' | 'vistos'>, pdfFile?: File | null) => Promise<void>;
    eliminar: (id: string) => Promise<void>;
    confirmarVisto: (comunicadoId: string, usuarioId: string, usuarioNombre: string) => Promise<void>;
    setOpen: (v: boolean) => void;
    setModalVisto: (v: boolean) => void;
}

export const useComunicadosStore = create<ComunicadosState>()((set, get) => ({
    comunicados: [],
    isLoading: false,
    isOpen: false,
    modalVisto: false,

    fetchComunicados: async (proyecto) => {
        set({ isLoading: true });
        const { data: coms, error } = await supabase
            .from('comunicados')
            .select('*')
            .eq('proyecto', proyecto)
            .order('created_at', { ascending: false });

        if (error || !coms) { set({ isLoading: false }); return; }

        const ids = coms.map(c => c.id);
        const { data: vistos } = await supabase
            .from('comunicados_vistos')
            .select('comunicado_id, usuario_id, usuario_nombre')
            .in('comunicado_id', ids);

        const merged = coms.map(c => ({
            ...c,
            vistos: (vistos || []).filter(v => v.comunicado_id === c.id)
        }));

        set({ comunicados: merged, isLoading: false });
    },

    publicar: async (data, pdfFile) => {
        let pdf_url = null;
        let pdf_nombre = null;

        if (pdfFile) {
            const path = `comunicados/${Date.now()}_${pdfFile.name}`;
            const { data: uploaded } = await supabase.storage
                .from('documentos')
                .upload(path, pdfFile);
            if (uploaded) {
                const { data: urlData } = supabase.storage
                    .from('documentos')
                    .getPublicUrl(path);
                pdf_url = urlData.publicUrl;
                pdf_nombre = pdfFile.name;
            }
        }

        const { data: nuevo, error } = await supabase
            .from('comunicados')
            .insert([{ ...data, pdf_url, pdf_nombre }])
            .select()
            .single();

        if (!error && nuevo) {
            set(s => ({ comunicados: [{ ...nuevo, vistos: [] }, ...s.comunicados] }));
        }
    },

    eliminar: async (id) => {
        await supabase.from('comunicados').delete().eq('id', id);
        set(s => ({ comunicados: s.comunicados.filter(c => c.id !== id) }));
    },

    confirmarVisto: async (comunicadoId, usuarioId, usuarioNombre) => {
        await supabase.from('comunicados_vistos').upsert([
            { comunicado_id: comunicadoId, usuario_id: usuarioId, usuario_nombre: usuarioNombre }
        ], { onConflict: 'comunicado_id,usuario_id' });

        set(s => ({
            comunicados: s.comunicados.map(c =>
                c.id === comunicadoId
                    ? { ...c, vistos: [...(c.vistos || []).filter(v => v.usuario_id !== usuarioId), { usuario_id: usuarioId, usuario_nombre: usuarioNombre }] }
                    : c
            )
        }));
    },

    setOpen: (v) => set({ isOpen: v }),
    setModalVisto: (v) => set({ modalVisto: v }),
}));