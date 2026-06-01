import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Personal {
  id:              string;
  dni:             string;
  nombre_completo: string;
  sexo:            string | null;
  especialidad_id: string | null;
  especialidad:    string | null; // nombre resuelto por JOIN
  cuadrilla:       string | null;
  categoria:       string | null;
  telefono:        string | null;
  condicion:       string | null;
  oficio:          string | null;
  fecha_ingreso:   string | null;
  activo:          boolean;
}

interface PersonalState {
  personal:      Personal[];
  fetchPersonal: () => Promise<void>;
  addWorker:     (worker: Omit<Personal, 'id' | 'especialidad'>) => Promise<Personal | null>;
  updateWorker:  (id: string, payload: Partial<Personal>) => Promise<void>;
  deleteWorker:  (id: string) => Promise<void>;
}

export const usePersonalStore = create<PersonalState>()((set) => ({
  personal: [],

  fetchPersonal: async () => {
    const { data, error } = await supabase
      .from('personal_obra')
      .select(`
        *,
        especialidades(nombre)
      `)
      .eq('activo', true)
      .order('nombre_completo');

    if (error) {
      console.error('[fetchPersonal] Error:', error);
      return;
    }

    const mapped: Personal[] = (data || []).map((row: any) => ({
      id:              row.id,
      dni:             row.dni,
      nombre_completo: row.nombre_completo,
      sexo:            row.sexo,
      especialidad_id: row.especialidad_id,
      especialidad:    row.especialidades?.nombre || null,
      cuadrilla:       row.cuadrilla,
      categoria:       row.categoria,
      telefono:        row.telefono,
      condicion:       row.condicion,
      oficio:          row.oficio,
      fecha_ingreso:   row.fecha_ingreso,
      activo:          row.activo,
    }));

    set({ personal: mapped });
  },

  addWorker: async (worker) => {
    const payload = {
      dni:             worker.dni,
      nombre_completo: worker.nombre_completo,
      sexo:            worker.sexo     || null,
      especialidad_id: worker.especialidad_id || null,
      cuadrilla:       worker.cuadrilla || null,
      categoria:       worker.categoria || null,
      telefono:        worker.telefono  || null,
      condicion:       worker.condicion || 'ACTIVO',
      oficio:          worker.oficio    || null,
      fecha_ingreso:   worker.fecha_ingreso || null,
      activo:          true,
    };

    const { data, error } = await supabase
      .from('personal_obra')
      .insert([payload])
      .select(`*, especialidades(nombre)`)
      .single();

    if (error) {
      console.error('[addWorker] Error:', error);
      return null;
    }

    const nuevo: Personal = {
      id:              data.id,
      dni:             data.dni,
      nombre_completo: data.nombre_completo,
      sexo:            data.sexo,
      especialidad_id: data.especialidad_id,
      especialidad:    (data as any).especialidades?.nombre || null,
      cuadrilla:       data.cuadrilla,
      categoria:       data.categoria,
      telefono:        data.telefono,
      condicion:       data.condicion,
      oficio:          data.oficio,
      fecha_ingreso:   data.fecha_ingreso,
      activo:          data.activo,
    };

    set((state) => ({ personal: [...state.personal, nuevo] }));
    return nuevo;
  },

  updateWorker: async (id, payload) => {
    const { error } = await supabase
      .from('personal_obra')
      .update(payload as any)
      .eq('id', id);

    if (error) {
      console.error('[updateWorker] Error:', error);
      return;
    }

    set((state) => ({
      personal: state.personal.map((p) =>
        p.id === id ? { ...p, ...payload } : p
      ),
    }));
  },

  deleteWorker: async (id) => {
    // Soft delete — marcar como inactivo en lugar de eliminar
    const { error } = await supabase
      .from('personal_obra')
      .update({ activo: false })
      .eq('id', id);

    if (error) {
      console.error('[deleteWorker] Error:', error);
      return;
    }

    set((state) => ({
      personal: state.personal.filter((p) => p.id !== id),
    }));
  },
}));