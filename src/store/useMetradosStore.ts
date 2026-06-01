import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Metrado, Partida } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './useAuthStore';

// ── Mapa de nombres de especialidad → código en Supabase ──────────────
const ESP_NOMBRE_A_CODIGO: Record<string, string> = {
  'OBRAS PROVISIONALES':                       'OP',
  'ESTRUCTURAS':                               'EST',
  'ARQUITECTURA':                              'ARQ',
  'INSTALACIONES SANITARIAS':                  'IISS',
  'INSTALACIONES ELECTRICAS':                  'IIEE',
  'INSTALACIONES ELECTROMECANICAS':            'IIEM',
  'INSTALACIONES DE COMUNICACIONES':           'TIC',
  'INSTALACIONES DE GAS LICUADO DE PETROLEO':  'GLP',
  'PLAN DE MANEJO AMBIENTAL':                  'PMA',
};

const PROYECTOS_INVALIDOS = ['hospital', 'contingencia', 'HOSPITAL', 'CONTINGENCIA', ''];

const isUUID = (id: any): boolean =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// ── Tipos ─────────────────────────────────────────────────────────────
interface MetradosContext {
  frente:       string;
  bloque:       string;
  nivel:        string;
  cuadrilla:    string;
  obreros_ids?: string[];
  obrero_nombre?: string;
  proyecto:     'hospital' | 'contingencia';
  especialidad?: string;
  isModoPC?:    boolean;
}

interface HvacItem {
  id:        string;
  categoria: string;
  label:     string;
  factor:    number;
}

interface MetradosState {
  context:             MetradosContext;
  metrados:            Metrado[];
  customPartidas:      Partida[];
  catalogoHospital:    Partida[];
  catalogoContingencia: Partida[];
  hvacCatalog:         HvacItem[];
  especialidades: { id: string; codigo: string; nombre: string }[];

  setContext:            (context: Partial<MetradosContext>) => void;
  addMetrado:            (metrado: Omit<Metrado, 'id' | 'created_at'>) => Promise<{ success: boolean; error?: string }>;
  fetchMetrados:         () => Promise<void>;
  updateMetrado:         (id: string, payload: Partial<Metrado>) => Promise<void>;
  deleteMetrado:         (id: string) => Promise<void>;
  updateGroup:           (codigo_partida: string, old_elemento: string, new_elemento: string) => Promise<void>;
  addCustomPartida:      (partida: Partida) => Promise<Partida | null>;
  fetchCustomPartidas:   () => Promise<void>;
  fetchHvacCatalog:      () => Promise<void>;
  fetchCatalogoMaestro:  () => Promise<void>;
  updateCatalogoPartida: (id: string, payload: Partial<Partida>, proyecto: 'hospital' | 'contingencia') => Promise<boolean>;
  addCatalogoPartida:    (partida: Omit<Partida, 'id'>, proyecto: 'hospital' | 'contingencia') => Promise<boolean>;
  fetchEspecialidades: () => Promise<void>;
  clearAll:              () => void;
}

// ── Store ─────────────────────────────────────────────────────────────
export const useMetradosStore = create<MetradosState>()(
  persist(
    (set, get) => ({
      context: {
        frente: '', bloque: '', nivel: '', cuadrilla: '',
        obreros_ids: [], obrero_nombre: '',
        proyecto: 'hospital', isModoPC: false,
      },
      metrados:             [],
      customPartidas:       [],
      catalogoHospital:     [],
      catalogoContingencia: [],
      hvacCatalog:          [],
      especialidades:       [],

      // ── setContext ─────────────────────────────────────────────────
      setContext: (newContext) =>
        set((state) => ({ context: { ...state.context, ...newContext } })),

      // ── addMetrado ─────────────────────────────────────────────────
      addMetrado: async (metrado) => {
        try {
          const user = useAuthStore.getState().user;
          if (!user) return { success: false, error: 'No hay sesión activa' };

          // 1. Resolver obra_id
          const obraCodigo = metrado.proyecto === 'contingencia' ? 'BLP-CONT' : 'BLP-001';
          const { data: obraData } = await supabase
            .from('obras').select('id').eq('codigo', obraCodigo).single();
          if (!obraData) return { success: false, error: 'Obra no encontrada: ' + obraCodigo };
          const obraId = obraData.id;

          // 2. Resolver especialidad_id
          const espRaw = (!metrado.especialidad || PROYECTOS_INVALIDOS.includes(metrado.especialidad))
            ? 'ARQ'
            : metrado.especialidad.toUpperCase();
          const espCodigo = ESP_NOMBRE_A_CODIGO[espRaw] || espRaw;
          const { data: espData } = await supabase
            .from('especialidades').select('id').eq('codigo', espCodigo).maybeSingle();
          if (!espData) return { success: false, error: 'Especialidad no encontrada: ' + espCodigo };

          // 3. Resolver frente_id, bloque_id, nivel_id
          let frenteId: string | null = null;
          let bloqueId: string | null = null;
          let nivelId:  string | null = null;

          if (metrado.frente) {
            const { data } = await supabase.from('frentes').select('id')
              .eq('obra_id', obraId).eq('codigo', metrado.frente).single();
            frenteId = data?.id ?? null;
          }
          if (metrado.bloque && frenteId) {
            const { data } = await supabase.from('bloques').select('id')
              .eq('frente_id', frenteId).eq('codigo', metrado.bloque).single();
            bloqueId = data?.id ?? null;
          }
          if (metrado.nivel) {
            const { data } = await supabase.from('niveles').select('id')
              .eq('obra_id', obraId).eq('codigo', metrado.nivel).single();
            nivelId = data?.id ?? null;
          }

          // 4. Resolver partida_id desde tabla `partidas`
          let partidaId: string | null = null;
          if (metrado.partida_id && isUUID(metrado.partida_id)) {
            const { data } = await supabase.from('partidas').select('id')
              .eq('id', metrado.partida_id).maybeSingle();
            partidaId = data?.id ?? null;
          }
          if (!partidaId && metrado.codigo_partida) {
            const { data } = await supabase.from('partidas').select('id')
              .eq('obra_id', obraId).eq('codigo', metrado.codigo_partida).maybeSingle();
            partidaId = data?.id ?? null;
          }

          // 5. Construir payload
          const payload = {
            obra_id:         obraId,
            partida_id:      partidaId,
            especialidad_id: espData.id,
            usuario_id:      user.id,
            frente_id:       frenteId,
            bloque_id:       bloqueId,
            nivel_id:        nivelId,
            fecha:           metrado.fecha,
            elemento:        metrado.elemento   || null,
            detalle:         metrado.detalle    || null,
            diametro:        metrado.diametro   || null,
            cantidad:        typeof metrado.cantidad      === 'number' ? metrado.cantidad      : null,
            longitud_area:   typeof metrado.longitud_area === 'number' ? metrado.longitud_area : null,
            ancho:           typeof metrado.ancho_empalme === 'number' ? metrado.ancho_empalme : null,
            altura_gancho:   typeof metrado.altura_gancho === 'number' ? metrado.altura_gancho : null,
            nro_veces:       typeof metrado.nro_veces     === 'number' ? metrado.nro_veces     : 1,
            hvac_factor:     metrado.hvac_factor    || null,
            hvac_item_type:  metrado.hvac_item_type || null,
            estado:          'INCOMPLETO' as const,
          };

          // 6. Insertar
          const { data: insertData, error: insertError } = await supabase
            .from('registros_metrado')
            .insert([payload])
            .select()
            .single();

          if (insertError) {
            console.error('[addMetrado] Error:', insertError);
            return { success: false, error: `DB Error [${insertError.code}]: ${insertError.message}` };
          }

          // 7. Vincular personal
          const validObreros = (metrado.obreros_ids || []).filter(isUUID);
          if (validObreros.length > 0) {
            const links = validObreros.map((id: string) => ({
              registro_id: insertData.id,
              personal_id: id,
            }));
            const { error: linkError } = await supabase.from('registros_personal').insert(links);
            if (linkError) console.error('[addMetrado] Error vinculando personal:', linkError);
          }

          // 8. Update local optimista
          const dbMetrado: Metrado = {
            ...metrado,
            id:         insertData.id,
            created_at: insertData.creado_en || new Date().toISOString(),
          };
          set((state) => ({ metrados: [dbMetrado, ...state.metrados] }));
          return { success: true };

        } catch (err: any) {
          console.error('[addMetrado] Error inesperado:', err);
          return { success: false, error: 'System Error: ' + (err.message || String(err)) };
        }
      },

      // ── fetchMetrados ──────────────────────────────────────────────

      fetchMetrados: async () => {
        try {
          let allRows: any[] = [];
          let from = 0;
          const step = 1000;

          while (true) {
            const { data, error } = await supabase.rpc('get_registros_metrado', {
              p_from:  from,
              p_limit: step,
            });

            if (error) throw error;
            if (!data || data.length === 0) break;
            allRows = [...allRows, ...data];
            from += step;
            if (data.length < step) break;
          }

          console.log(`[fetchMetrados] Cargados: ${allRows.length}`);

          const fetched: Metrado[] = allRows.map((row: any) => ({
            id:                  row.id,
            fecha:               row.fecha,
            frente:              row.frente_codigo           || '',
            bloque:              row.bloque_codigo           || '',
            nivel:               row.nivel_codigo            || '',
            obrero_nombre:       row.personal_nombres        || undefined,
            obreros_ids:         [],
            partida_id:          row.partida_id              || undefined,
            custom_partida_id:   undefined,
            codigo_partida:      row.partida_codigo          || '',
            descripcion_partida: row.partida_descripcion     || '',
            elemento:            row.elemento                || '',
            detalle:             row.detalle                 || '',
            diametro:            row.diametro                || undefined,
            cantidad:            row.cantidad                ?? '',
            longitud_area:       row.longitud_area           ?? '',
            ancho_empalme:       row.ancho                   ?? '',
            altura_gancho:       row.altura_gancho           ?? '',
            parcial:             row.parcial                 || 0,
            nro_veces:           row.nro_veces               ?? 1,
            total:               row.total                   || 0,
            unidad:              row.partida_unidad          || 'und',
            proyecto:            'hospital' as const,
            autor_usuario:       row.autor_nombre            || '',
            created_at:          row.creado_en               || new Date().toISOString(),
            especialidad:        row.especialidad_nombre     || '',
            hvac_factor:         row.hvac_factor,
            hvac_item_type:      row.hvac_item_type,
            tipo_metrado:        row.partida_tipo_metrado    || 'ESTANDAR',
            modificacion:        row.partida_clasificador    || undefined,
          }));

          set({ metrados: fetched });
        } catch (error) {
          console.error('[fetchMetrados] Error:', error);
        }
      },

      // ── updateMetrado ──────────────────────────────────────────────
      updateMetrado: async (id, payload) => {
        // Optimistic local update
        set((state) => ({
          metrados: state.metrados.map((m) => m.id === id ? { ...m, ...payload } : m),
        }));

        // Limpiar campos sintéticos que no existen en BD
        const dbPayload: any = { ...payload };
        delete dbPayload.obrero_nombre;
        delete dbPayload.obrero_categoria;
        delete dbPayload.descripcion_partida;
        delete dbPayload.codigo_partida;
        delete dbPayload.unidad;
        delete dbPayload.proyecto;
        delete dbPayload.especialidad;

        // Validar UUIDs
        if (dbPayload.partida_id && !isUUID(dbPayload.partida_id)) delete dbPayload.partida_id;
        if (dbPayload.custom_partida_id) delete dbPayload.custom_partida_id;

        const { error } = await supabase
          .from('registros_metrado')
          .update(dbPayload)
          .eq('id', id);

        if (error) console.error('[updateMetrado] Error:', error);
      },

      // ── deleteMetrado ──────────────────────────────────────────────
      deleteMetrado: async (id) => {
        set((state) => ({
          metrados: state.metrados.filter((m) => m.id !== id),
        }));
        const { error } = await supabase
          .from('registros_metrado')
          .delete()
          .eq('id', id);
        if (error) console.error('[deleteMetrado] Error:', error);
      },

      // ── updateGroup ────────────────────────────────────────────────
      updateGroup: async (codigo_partida, old_elemento, new_elemento) => {
        // Optimistic local
        set((state) => ({
          metrados: state.metrados.map((m) =>
            m.codigo_partida === codigo_partida && m.elemento === old_elemento
              ? { ...m, elemento: new_elemento }
              : m
          ),
        }));

        // Necesitamos los IDs de registros afectados para hacer el UPDATE
        const affected = get().metrados
          .filter(m => m.codigo_partida === codigo_partida && m.elemento === old_elemento)
          .map(m => m.id);

        if (affected.length > 0) {
          const { error } = await supabase
            .from('registros_metrado')
            .update({ elemento: new_elemento })
            .in('id', affected);
          if (error) console.error('[updateGroup] Error:', error);
        }
      },

      // ── addCustomPartida ───────────────────────────────────────────
      // Partidas personalizadas → tabla `partidas` con es_personalizada = true
      addCustomPartida: async (partida) => {
        try {
          const user = useAuthStore.getState().user;
          if (!user) return null;

          // Resolver obra_id (hospital por defecto para partidas personalizadas)
          const { data: obraData } = await supabase
            .from('obras').select('id').eq('codigo', 'BLP-001').single();
          if (!obraData) return null;

          // Resolver especialidad_id
          const espRaw = partida.especialidad?.toUpperCase() || 'ARQ';
          const espCodigo = ESP_NOMBRE_A_CODIGO[espRaw] || espRaw;
          const { data: espData } = await supabase
            .from('especialidades').select('id').eq('codigo', espCodigo).maybeSingle();

          const { data, error } = await supabase
            .from('partidas')
            .insert([{
              obra_id:         obraData.id,
              especialidad_id: espData?.id ?? null,
              codigo:          partida.codigo,
              descripcion:     partida.descripcion,
              unidad:          partida.unidad || 'und',
              clasificador:    'PC',
              tipo_metrado:    partida.tipo_metrado || 'ESTANDAR',
              es_personalizada: true,
              se_valoriza:     true,
              estado_aprobacion: 'PENDIENTE',
              creado_por:      user.id,
            }])
            .select()
            .single();

          if (error) {
            console.error('[addCustomPartida] Error:', error);
            return null;
          }

          const nueva: Partida = {
            id:              data.id,
            codigo:          data.codigo,
            descripcion:     data.descripcion,
            unidad:          data.unidad,
            modificacion:    'PC',
            especialidad:    partida.especialidad,
            tipo_metrado:    data.tipo_metrado,
            is_template:     true,
            es_titulo:       false,
            jerarquia:       [],
            nivel_jerarquia: 1,
          };

          set((state) => ({ customPartidas: [...state.customPartidas, nueva] }));
          return nueva;
        } catch (err) {
          console.error('[addCustomPartida] Error inesperado:', err);
          return null;
        }
      },

      // ── fetchCustomPartidas ────────────────────────────────────────
      fetchCustomPartidas: async () => {
        try {
          const { data, error } = await supabase
            .from('partidas')
            .select('*')
            .eq('es_personalizada', true)
            .order('codigo');

          if (error) { console.error('[fetchCustomPartidas] Error:', error); return; }

          const parsed: Partida[] = (data || []).map((row: any) => ({
            id:              row.id,
            codigo:          row.codigo,
            descripcion:     row.descripcion,
            unidad:          row.unidad,
            modificacion:    row.clasificador || 'PC',
            tipo_metrado:    row.tipo_metrado,
            is_template:     true,
            es_titulo:       false,
            jerarquia:       row.jerarquia || [],
            nivel_jerarquia: row.nivel_jerarquia || 1,
            se_valoriza:     row.se_valoriza ?? true,
            precio_unitario: row.precio_unitario || 0,
          }));

          set({ customPartidas: parsed });
        } catch (e) {
          console.error('[fetchCustomPartidas] Error:', e);
        }
      },

      // ── fetchHvacCatalog ───────────────────────────────────────────
      // hvac_catalogo_accesorios → sistemas_metrado filtrado
      fetchHvacCatalog: async () => {
        try {
          const { data, error } = await supabase
            .from('sistemas_metrado')
            .select('*')
            .eq('activo', true)
            .order('nombre');

          if (error) throw error;

          // Mapear sistemas_metrado al formato HvacItem que espera el frontend
          const items: HvacItem[] = (data || []).map((row: any) => ({
            id:        row.id,
            categoria: row.codigo,
            label:     row.nombre,
            factor:    1, // factor neutro — se configura por partida
          }));

          set({ hvacCatalog: items });
        } catch (e) {
          console.error('[fetchHvacCatalog] Error:', e);
        }
      },

      // ── fetchCatalogoMaestro ───────────────────────────────────────
      // catalogo_partidas → partidas (nueva tabla unificada)
      fetchCatalogoMaestro: async () => {
        try {
          // Obtener obra_id de hospital y contingencia
          const { data: obras } = await supabase
            .from('obras').select('id, codigo')
            .in('codigo', ['BLP-001', 'BLP-CONT']);

          if (!obras || obras.length === 0) {
            console.warn('[fetchCatalogoMaestro] No hay obras en BD');
            return;
          }

          const hospId = obras.find(o => o.codigo === 'BLP-001')?.id;
          const contId = obras.find(o => o.codigo === 'BLP-CONT')?.id;

          // Carga masiva con paginación
          let allPartidas: any[] = [];
          let from = 0;
          const step = 1000;

          while (true) {
            const { data, error } = await supabase
              .from('partidas')
              .select(`
                *,
                especialidades(codigo, nombre)
              `)
              .order('codigo')
              .range(from, from + step - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;
            allPartidas = [...allPartidas, ...data];
            from += step;
            if (data.length < step) break;
          }

          console.log(`[fetchCatalogoMaestro] Total: ${allPartidas.length} partidas`);

          const mapPartidas = (rows: any[]): Partida[] =>
            rows.map((r: any) => ({
              id:                         r.id,
              codigo:                     r.codigo,
              descripcion:                r.descripcion,
              unidad:                     r.unidad || 'und',
              modificacion:               r.clasificador || 'ET',
              // Mostrar nombre de especialidad, no código
              especialidad:               r.especialidades?.nombre || r.especialidades?.codigo || '',
              tipo_metrado:               r.tipo_metrado || 'ESTANDAR',
              is_template:                true,
              es_titulo:                  r.es_titulo || false,
              jerarquia:                  r.jerarquia || [],
              nivel_jerarquia:            r.nivel_jerarquia || 0,
              precio_unitario:            r.precio_unitario || 0,
              cantidad_presupuesto:       r.cantidad_presupuesto || 0,
              metrado_programado:         r.metrado_programado || 0,
              se_valoriza:                r.se_valoriza ?? true,
              // Campos de seguimiento financiero (desde presupuesto_avance se calculan aparte)
              acumulado_anterior_qty:     0,
              metrado_anterior_acumulado: 0,
              valorizacion_anterior:      0,
              pu_actual:                  r.precio_unitario || 0,
            }));

          set({
            catalogoHospital:    mapPartidas(allPartidas.filter(p => p.obra_id === hospId)),
            catalogoContingencia: mapPartidas(allPartidas.filter(p => p.obra_id === contId)),
          });
        } catch (e) {
          console.error('[fetchCatalogoMaestro] Error:', e);
        }
      },

      // ── updateCatalogoPartida ──────────────────────────────────────
      updateCatalogoPartida: async (id, payload, proyecto) => {
        const user = useAuthStore.getState().user;
        if (!user) return false;

        try {
          const catalogKey = proyecto === 'hospital' ? 'catalogoHospital' : 'catalogoContingencia';
          const oldPartida = (get() as any)[catalogKey].find((p: any) => p.id === id);

          const { error } = await supabase
            .from('partidas')
            .update(payload as any)
            .eq('id', id);

          if (error) throw error;

          // Registrar en historial_cambios (auditoría nueva)
          await supabase.from('historial_cambios').insert([{
            tabla_afectada:   'partidas',
            registro_id:      id,
            accion:           'UPDATE',
            campo_modificado: Object.keys(payload).join(', '),
            valor_anterior:   JSON.stringify(oldPartida),
            valor_nuevo:      JSON.stringify({ ...oldPartida, ...payload }),
            usuario_id:       user.id,
          }]);

          // Update local
          set((state: any) => ({
            [catalogKey]: state[catalogKey].map((p: any) =>
              p.id === id ? { ...p, ...payload } : p
            ),
          }));

          return true;
        } catch (e) {
          console.error('[updateCatalogoPartida] Error:', e);
          return false;
        }
      },

      // ── addCatalogoPartida ─────────────────────────────────────────
      addCatalogoPartida: async (partida, proyecto) => {
        const user = useAuthStore.getState().user;
        if (!user) return false;

        try {
          const obraCodigo = proyecto === 'hospital' ? 'BLP-001' : 'BLP-CONT';
          const { data: obraData } = await supabase
            .from('obras').select('id').eq('codigo', obraCodigo).single();
          if (!obraData) throw new Error('Obra no encontrada: ' + obraCodigo);

          const payload: any = {
            ...partida,
            obra_id:    obraData.id,
            creado_por: user.id,
          };
          // Limpiar campos sintéticos
          delete payload.is_template;
          delete payload.especialidad; // se resuelve por especialidad_id

          const { data, error } = await supabase
            .from('partidas')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;

          // Log de auditoría
          await supabase.from('historial_cambios').insert([{
            tabla_afectada: 'partidas',
            registro_id:    data.id,
            accion:         'INSERT',
            valor_nuevo:    JSON.stringify(data),
            usuario_id:     user.id,
          }]);

          const catalogKey = proyecto === 'hospital' ? 'catalogoHospital' : 'catalogoContingencia';
          set((state: any) => ({
            [catalogKey]: [...state[catalogKey], { ...partida, id: data.id, is_template: true }],
          }));

          return true;
        } catch (e) {
          console.error('[addCatalogoPartida] Error:', e);
          return false;
        }
      },

      fetchEspecialidades: async () => {
        try {
          const { data, error } = await supabase
            .from('especialidades')
            .select('id, codigo, nombre')
            .eq('activo', true)
            .order('orden');
          if (!error && data) set({ especialidades: data });
        } catch (e) {
          console.error('[fetchEspecialidades] Error:', e);
        }
      },

      // ── clearAll ───────────────────────────────────────────────────
      clearAll: () => set({ metrados: [] }),
    }),
    {
      name: 'belempampa-metrados-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ context: state.context }),
    }
  )
);
