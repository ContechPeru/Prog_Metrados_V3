export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ── Enums ────────────────────────────────────────────────────────────────────
export type TipoClasificador     = 'ET' | 'PC' | 'MM' | 'PN' | 'DD' | 'ACT'
export type TipoMetradoEnum      = 'ESTANDAR' | 'ACERO' | 'HVAC' | 'INSTALACIONES'
export type TipoAprobacion       = 'PENDIENTE' | 'APROBADO'
export type TipoEstadoRegistro   = 'COMPLETO' | 'INCOMPLETO' | 'PENDIENTE'
export type TipoAccionHistorial  = 'INSERT' | 'UPDATE' | 'DELETE'
export type TipoDocumentoEnum    = 'PLANO' | 'MEMORIA' | 'FOTO' | 'INFORME' | 'OTRO'
export type TipoCategoriaPersonal = 'OPERARIO' | 'OFICIAL' | 'PEON'
export type TipoSexo             = 'M' | 'F'

// ── Database interface ────────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {

      // ── obras ──────────────────────────────────────────────────────────────
      obras: {
        Row: {
          id:             string
          codigo:         string
          nombre:         string
          descripcion:    string | null
          ubicacion:      string | null
          cui:            string | null
          entidad_abrev:  string | null
          fecha_inicio:   string | null
          fecha_fin:      string | null
          activo:         boolean
          creado_en:      string
          actualizado_en: string
        }
        Insert: {
          id?:            string
          codigo:         string
          nombre:         string
          descripcion?:   string | null
          ubicacion?:     string | null
          cui?:           string | null
          entidad_abrev?: string | null
          fecha_inicio?:  string | null
          fecha_fin?:     string | null
          activo?:        boolean
          creado_en?:     string
          actualizado_en?:string
        }
        Update: Partial<Database['public']['Tables']['obras']['Insert']>
      }

      // ── especialidades ─────────────────────────────────────────────────────
      especialidades: {
        Row: {
          id:        string
          codigo:    string
          nombre:    string
          color_hex: string | null
          orden:     number
          activo:    boolean
        }
        Insert: {
          id?:        string
          codigo:     string
          nombre:     string
          color_hex?: string | null
          orden?:     number
          activo?:    boolean
        }
        Update: Partial<Database['public']['Tables']['especialidades']['Insert']>
      }

      // ── sistemas_metrado ───────────────────────────────────────────────────
      sistemas_metrado: {
        Row: {
          id:          string
          codigo:      string
          nombre:      string
          descripcion: string | null
          activo:      boolean
        }
        Insert: {
          id?:          string
          codigo:       string
          nombre:       string
          descripcion?: string | null
          activo?:      boolean
        }
        Update: Partial<Database['public']['Tables']['sistemas_metrado']['Insert']>
      }

      // ── roles ──────────────────────────────────────────────────────────────
      roles: {
        Row: {
          id:          string
          codigo:      string
          nombre:      string
          descripcion: string | null
          es_sistema:  boolean
        }
        Insert: {
          id?:          string
          codigo:       string
          nombre:       string
          descripcion?: string | null
          es_sistema?:  boolean
        }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }

      // ── permisos ───────────────────────────────────────────────────────────
      permisos: {
        Row: {
          id:          string
          codigo:      string
          nombre:      string
          descripcion: string | null
          modulo:      string | null
        }
        Insert: {
          id?:          string
          codigo:       string
          nombre:       string
          descripcion?: string | null
          modulo?:      string | null
        }
        Update: Partial<Database['public']['Tables']['permisos']['Insert']>
      }

      // ── roles_permisos ─────────────────────────────────────────────────────
      roles_permisos: {
        Row: {
          rol_id:     string
          permiso_id: string
        }
        Insert: {
          rol_id:     string
          permiso_id: string
        }
        Update: Partial<Database['public']['Tables']['roles_permisos']['Insert']>
      }

      // ── usuarios ───────────────────────────────────────────────────────────
      usuarios: {
        Row: {
          id:              string
          dni:             string
          nombre_completo: string
          correo:          string
          cargo:           string | null
          rol_id:          string | null
          especialidad_id: string | null
          obra_id:         string | null
          es_admin:        boolean
          es_gerencia:     boolean
          activo:          boolean
          creado_por:      string | null
          creado_en:       string
          actualizado_en:  string
          ultimo_acceso:   string | null
        }
        Insert: {
          id:               string
          dni:              string
          nombre_completo:  string
          correo:           string
          cargo?:           string | null
          rol_id?:          string | null
          especialidad_id?: string | null
          obra_id?:         string | null
          es_admin?:        boolean
          es_gerencia?:     boolean
          activo?:          boolean
          creado_por?:      string | null
          creado_en?:       string
          actualizado_en?:  string
          ultimo_acceso?:   string | null
        }
        Update: Partial<Database['public']['Tables']['usuarios']['Insert']>
      }

      // ── usuarios_permisos_extra ────────────────────────────────────────────
      usuarios_permisos_extra: {
        Row: {
          usuario_id:   string
          permiso_id:   string
          concedido:    boolean
          otorgado_por: string | null
          creado_en:    string
          expira_en:    string | null
        }
        Insert: {
          usuario_id:    string
          permiso_id:    string
          concedido?:    boolean
          otorgado_por?: string | null
          creado_en?:    string
          expira_en?:    string | null
        }
        Update: Partial<Database['public']['Tables']['usuarios_permisos_extra']['Insert']>
      }

      // ── usuarios_especialidades ────────────────────────────────────────────
      usuarios_especialidades: {
        Row: {
          usuario_id:      string
          especialidad_id: string
          es_principal:    boolean
          otorgado_por:    string | null
          creado_en:       string
          expira_en:       string | null
        }
        Insert: {
          usuario_id:       string
          especialidad_id:  string
          es_principal?:    boolean
          otorgado_por?:    string | null
          creado_en?:       string
          expira_en?:       string | null
        }
        Update: Partial<Database['public']['Tables']['usuarios_especialidades']['Insert']>
      }

      // ── personal_obra ──────────────────────────────────────────────────────
      personal_obra: {
        Row: {
          id:              string
          dni:             string
          nombre_completo: string
          especialidad_id: string | null
          cuadrilla:       string | null
          categoria:       TipoCategoriaPersonal | null
          oficio:          string | null
          sexo:            TipoSexo | null
          telefono:        string | null
          condicion:       string | null
          fecha_ingreso:   string | null
          activo:          boolean
          creado_en:       string
          actualizado_en:  string
        }
        Insert: {
          id?:              string
          dni:              string
          nombre_completo:  string
          especialidad_id?: string | null
          cuadrilla?:       string | null
          categoria?:       TipoCategoriaPersonal | null
          oficio?:          string | null
          sexo?:            TipoSexo | null
          telefono?:        string | null
          condicion?:       string | null
          fecha_ingreso?:   string | null
          activo?:          boolean
          creado_en?:       string
          actualizado_en?:  string
        }
        Update: Partial<Database['public']['Tables']['personal_obra']['Insert']>
      }

      // ── frentes ────────────────────────────────────────────────────────────
      frentes: {
        Row: {
          id:      string
          obra_id: string
          codigo:  string
          nombre:  string
          orden:   number
          activo:  boolean
        }
        Insert: {
          id?:     string
          obra_id: string
          codigo:  string
          nombre:  string
          orden?:  number
          activo?: boolean
        }
        Update: Partial<Database['public']['Tables']['frentes']['Insert']>
      }

      // ── bloques ────────────────────────────────────────────────────────────
      bloques: {
        Row: {
          id:        string
          frente_id: string
          codigo:    string
          nombre:    string
          orden:     number
          activo:    boolean
        }
        Insert: {
          id?:       string
          frente_id: string
          codigo:    string
          nombre:    string
          orden?:    number
          activo?:   boolean
        }
        Update: Partial<Database['public']['Tables']['bloques']['Insert']>
      }

      // ── niveles ────────────────────────────────────────────────────────────
      niveles: {
        Row: {
          id:      string
          obra_id: string
          codigo:  string
          nombre:  string
          orden:   number
          activo:  boolean
        }
        Insert: {
          id?:     string
          obra_id: string
          codigo:  string
          nombre:  string
          orden?:  number
          activo?: boolean
        }
        Update: Partial<Database['public']['Tables']['niveles']['Insert']>
      }

      // ── frentes_niveles ────────────────────────────────────────────────────
      frentes_niveles: {
        Row: {
          frente_id: string
          nivel_id:  string
          activo:    boolean
          creado_en: string
        }
        Insert: {
          frente_id: string
          nivel_id:  string
          activo?:   boolean
          creado_en?:string
        }
        Update: Partial<Database['public']['Tables']['frentes_niveles']['Insert']>
      }

      // ── partidas ───────────────────────────────────────────────────────────
      partidas: {
        Row: {
          id:                   string
          obra_id:              string
          especialidad_id:      string | null
          sistema_id:           string | null
          parent_id:            string | null
          codigo:               string
          descripcion:          string
          unidad:               string
          jerarquia:            string[] | null
          nivel_jerarquia:      number
          es_titulo:            boolean
          clasificador:         TipoClasificador
          tipo_metrado:         TipoMetradoEnum
          precio_unitario:      number | null
          cantidad_presupuesto: number | null
          metrado_programado:   number | null
          se_valoriza:          boolean
          estado_aprobacion:    TipoAprobacion | null
          aprobado_por:         string | null
          aprobado_en:          string | null
          es_personalizada:     boolean
          creado_por:           string | null
          creado_en:            string
          actualizado_en:       string
        }
        Insert: {
          id?:                   string
          obra_id:               string
          especialidad_id?:      string | null
          sistema_id?:           string | null
          parent_id?:            string | null
          codigo:                string
          descripcion:           string
          unidad:                string
          jerarquia?:            string[] | null
          nivel_jerarquia?:      number
          es_titulo?:            boolean
          clasificador?:         TipoClasificador
          tipo_metrado?:         TipoMetradoEnum
          precio_unitario?:      number | null
          cantidad_presupuesto?: number | null
          metrado_programado?:   number | null
          se_valoriza?:          boolean
          estado_aprobacion?:    TipoAprobacion | null
          aprobado_por?:         string | null
          aprobado_en?:          string | null
          es_personalizada?:     boolean
          creado_por?:           string | null
          creado_en?:            string
          actualizado_en?:       string
        }
        Update: Partial<Database['public']['Tables']['partidas']['Insert']>
      }

      // ── registros_metrado ──────────────────────────────────────────────────
      registros_metrado: {
        Row: {
          id:               string
          obra_id:          string
          partida_id:       string | null
          especialidad_id:  string
          usuario_id:       string
          frente_id:        string | null
          bloque_id:        string | null
          nivel_id:         string | null
          fecha:            string
          elemento:         string | null
          detalle:          string | null
          diametro:         string | null
          cantidad:         number | null
          longitud_area:    number | null
          ancho:            number | null
          altura_gancho:    number | null
          nro_veces:        number
          parcial:          number | null
          total:            number | null
          hvac_factor:      number | null
          hvac_item_type:   string | null
          sin_plano:        boolean
          sin_plano_motivo: string | null
          plano_sist:       string | null
          plano_num:        string | null
          estado:           TipoEstadoRegistro
          creado_en:        string
          actualizado_en:   string
        }
        Insert: {
          id?:               string
          obra_id:           string
          partida_id?:       string | null
          especialidad_id:   string
          usuario_id:        string
          frente_id?:        string | null
          bloque_id?:        string | null
          nivel_id?:         string | null
          fecha:             string
          elemento?:         string | null
          detalle?:          string | null
          diametro?:         string | null
          cantidad?:         number | null
          longitud_area?:    number | null
          ancho?:            number | null
          altura_gancho?:    number | null
          nro_veces?:        number
          parcial?:          number | null
          total?:            number | null
          hvac_factor?:      number | null
          hvac_item_type?:   string | null
          sin_plano?:        boolean
          sin_plano_motivo?: string | null
          plano_sist?:       string | null
          plano_num?:        string | null
          estado?:           TipoEstadoRegistro
          creado_en?:        string
          actualizado_en?:   string
        }
        Update: Partial<Database['public']['Tables']['registros_metrado']['Insert']>
      }

      // ── registros_personal ─────────────────────────────────────────────────
      registros_personal: {
        Row: {
          registro_id: string
          personal_id: string
        }
        Insert: {
          registro_id: string
          personal_id: string
        }
        Update: Partial<Database['public']['Tables']['registros_personal']['Insert']>
      }

      // ── presupuesto_avance ─────────────────────────────────────────────────
      presupuesto_avance: {
        Row: {
          id:                     string
          obra_id:                string
          partida_id:             string
          periodo:                string
          acumulado_anterior_qty: number | null
          valorizacion_anterior:  number | null
          metrado_actual:         number | null
          valorizacion_actual:    number | null
          creado_en:              string
        }
        Insert: {
          id?:                     string
          obra_id:                 string
          partida_id:              string
          periodo:                 string
          acumulado_anterior_qty?: number | null
          valorizacion_anterior?:  number | null
          metrado_actual?:         number | null
          valorizacion_actual?:    number | null
          creado_en?:              string
        }
        Update: Partial<Database['public']['Tables']['presupuesto_avance']['Insert']>
      }

      // ── documentos_sustento ────────────────────────────────────────────────
      documentos_sustento: {
        Row: {
          id:             string
          obra_id:        string
          registro_id:    string | null
          partida_id:     string | null
          nombre:         string
          tipo_documento: TipoDocumentoEnum
          url_storage:    string
          tamanio_bytes:  number | null
          subido_por:     string | null
          creado_en:      string
        }
        Insert: {
          id?:             string
          obra_id:         string
          registro_id?:    string | null
          partida_id?:     string | null
          nombre:          string
          tipo_documento:  TipoDocumentoEnum
          url_storage:     string
          tamanio_bytes?:  number | null
          subido_por?:     string | null
          creado_en?:      string
        }
        Update: Partial<Database['public']['Tables']['documentos_sustento']['Insert']>
      }

      // ── comunicados ────────────────────────────────────────────────────────
      comunicados: {
        Row: {
          id:        string
          obra_id:   string
          titulo:    string
          contenido: string
          autor_id:  string
          urgente:   boolean
          activo:    boolean
          creado_en: string
        }
        Insert: {
          id?:       string
          obra_id:   string
          titulo:    string
          contenido: string
          autor_id:  string
          urgente?:  boolean
          activo?:   boolean
          creado_en?:string
        }
        Update: Partial<Database['public']['Tables']['comunicados']['Insert']>
      }

      // ── comunicados_lecturas ───────────────────────────────────────────────
      comunicados_lecturas: {
        Row: {
          id:            string
          comunicado_id: string
          usuario_id:    string
          leido_en:      string
        }
        Insert: {
          id?:            string
          comunicado_id:  string
          usuario_id:     string
          leido_en?:      string
        }
        Update: Partial<Database['public']['Tables']['comunicados_lecturas']['Insert']>
      }

      // ── historial_cambios ──────────────────────────────────────────────────
      historial_cambios: {
        Row: {
          id:               string
          tabla_afectada:   string
          registro_id:      string
          accion:           TipoAccionHistorial
          campo_modificado: string | null
          valor_anterior:   string | null
          valor_nuevo:      string | null
          usuario_id:       string | null
          ip_address:       string | null
          user_agent:       string | null
          creado_en:        string
        }
        Insert: {
          id?:               string
          tabla_afectada:    string
          registro_id:       string
          accion:            TipoAccionHistorial
          campo_modificado?: string | null
          valor_anterior?:   string | null
          valor_nuevo?:      string | null
          usuario_id?:       string | null
          ip_address?:       string | null
          user_agent?:       string | null
          creado_en?:        string
        }
        Update: Partial<Database['public']['Tables']['historial_cambios']['Insert']>
      }

    }
    Functions: {
      get_registros_metrado: {
        Args: {
          p_obra_id?: string | null
          p_from?:    number
          p_limit?:   number
        }
        Returns: {
          id:                   string
          obra_id:              string
          partida_id:           string | null
          especialidad_id:      string | null
          usuario_id:           string | null
          autor_nombre:         string | null
          frente_id:            string | null
          bloque_id:            string | null
          nivel_id:             string | null
          fecha:                string
          elemento:             string | null
          detalle:              string | null
          diametro:             string | null
          cantidad:             number | null
          longitud_area:        number | null
          ancho:                number | null
          altura_gancho:        number | null
          nro_veces:            number | null
          parcial:              number | null
          total:                number | null
          hvac_factor:          number | null
          hvac_item_type:       string | null
          sin_plano:            boolean
          sin_plano_motivo:     string | null
          plano_sist:           string | null
          plano_num:            string | null
          estado:               string | null
          creado_en:            string | null
          actualizado_en:       string | null
          frente_codigo:        string | null
          bloque_codigo:        string | null
          nivel_codigo:         string | null
          especialidad_nombre:  string | null
          partida_codigo:       string | null
          partida_descripcion:  string | null
          partida_unidad:       string | null
          partida_tipo_metrado: string | null
          partida_clasificador: string | null
          personal_nombres:     string | null
        }[]
      }
    }
  }
}