// Generado automáticamente desde el esquema de Supabase (proyecto xmbolgxnljbugmyvuxzm).
// NO editar a mano. Para regenerar tras una migración:
//   Supabase MCP -> generate_typescript_types (project_id: xmbolgxnljbugmyvuxzm)
// y pegar el resultado aquí.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      bonos: {
        Row: {
          activo: boolean
          cliente_id: string
          creado_en: string
          eliminado: boolean
          eliminado_en: string | null
          eliminado_por: string | null
          fecha_caducidad: string | null
          fecha_creacion: string
          horas_totales: number
          horas_usadas: number
          id: string
          notas: string | null
          num_factura: string
          precio: number | null
          precio_hora: number | null
        }
        Insert: {
          activo?: boolean
          cliente_id: string
          creado_en?: string
          eliminado?: boolean
          eliminado_en?: string | null
          eliminado_por?: string | null
          fecha_caducidad?: string | null
          fecha_creacion?: string
          horas_totales: number
          horas_usadas?: number
          id?: string
          notas?: string | null
          num_factura: string
          precio?: number | null
          precio_hora?: number | null
        }
        Update: {
          activo?: boolean
          cliente_id?: string
          creado_en?: string
          eliminado?: boolean
          eliminado_en?: string | null
          eliminado_por?: string | null
          fecha_caducidad?: string | null
          fecha_creacion?: string
          horas_totales?: number
          horas_usadas?: number
          id?: string
          notas?: string | null
          num_factura?: string
          precio?: number | null
          precio_hora?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bonos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          cif: string | null
          creado_en: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          telefono: string | null
          token_generado_en: string
          token_portal: string
        }
        Insert: {
          cif?: string | null
          creado_en?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          token_generado_en?: string
          token_portal?: string
        }
        Update: {
          cif?: string | null
          creado_en?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          token_generado_en?: string
          token_portal?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          actualizado_en: string
          clave: string
          valor: Json
        }
        Insert: {
          actualizado_en?: string
          clave: string
          valor?: Json
        }
        Update: {
          actualizado_en?: string
          clave?: string
          valor?: Json
        }
        Relationships: []
      }
      contador_partes: {
        Row: {
          anio: number
          mes: number
          ultimo: number
        }
        Insert: {
          anio: number
          mes: number
          ultimo?: number
        }
        Update: {
          anio?: number
          mes?: number
          ultimo?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean
          creado_en: string
          id: string
          nombre: string
          rol: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          id: string
          nombre: string
          rol?: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          id?: string
          nombre?: string
          rol?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          anulado: boolean
          anulado_en: string | null
          anulado_motivo: string | null
          anulado_por: string | null
          bono_id: string | null
          cliente_id: string
          creado_en: string
          creado_por: string | null
          descripcion: string
          editado: boolean
          editado_en: string | null
          editado_por: string | null
          fecha: string
          fecha_asignacion_bono: string | null
          firma_cliente: string | null
          firma_tecnico: string | null
          firmante_nombre: string | null
          hora_fin: string
          hora_inicio: string
          horas: number
          id: string
          material: string | null
          modalidad: string
          num_parte: string | null
          tipo: string
          trabajador_id: string | null
          trabajador_nombre: string | null
        }
        Insert: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
          bono_id?: string | null
          cliente_id: string
          creado_en?: string
          creado_por?: string | null
          descripcion: string
          editado?: boolean
          editado_en?: string | null
          editado_por?: string | null
          fecha?: string
          fecha_asignacion_bono?: string | null
          firma_cliente?: string | null
          firma_tecnico?: string | null
          firmante_nombre?: string | null
          hora_fin: string
          hora_inicio: string
          horas: number
          id?: string
          material?: string | null
          modalidad?: string
          num_parte?: string | null
          tipo: string
          trabajador_id?: string | null
          trabajador_nombre?: string | null
        }
        Update: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_motivo?: string | null
          anulado_por?: string | null
          bono_id?: string | null
          cliente_id?: string
          creado_en?: string
          creado_por?: string | null
          descripcion?: string
          editado?: boolean
          editado_en?: string | null
          editado_por?: string | null
          fecha?: string
          fecha_asignacion_bono?: string | null
          firma_cliente?: string | null
          firma_tecnico?: string | null
          firmante_nombre?: string | null
          hora_fin?: string
          hora_inicio?: string
          horas?: number
          id?: string
          material?: string | null
          modalidad?: string
          num_parte?: string | null
          tipo?: string
          trabajador_id?: string | null
          trabajador_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servicios_bono_id_fkey"
            columns: ["bono_id"]
            isOneToOne: false
            referencedRelation: "bonos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicios_trabajador_id_fkey"
            columns: ["trabajador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _devolver_horas_a_bono: {
        Args: { p_bono_id: string; p_horas: number }
        Returns: undefined
      }
      anular_servicio: {
        Args: { p_motivo: string; p_servicio_id: string }
        Returns: Database["public"]["Tables"]["servicios"]["Row"]
      }
      asignar_servicio_a_bono: {
        Args: { p_bono_id: string; p_forzar?: boolean; p_servicio_id: string }
        Returns: Database["public"]["Tables"]["servicios"]["Row"]
      }
      calcular_horas_facturables: {
        Args: { p_minutos: number; p_modalidad: string }
        Returns: number
      }
      crear_cliente_rapido: {
        Args: {
          p_cif?: string
          p_direccion?: string
          p_email?: string
          p_nombre: string
          p_telefono?: string
        }
        Returns: Database["public"]["Tables"]["clientes"]["Row"]
      }
      desasignar_servicio_de_bono: {
        Args: { p_servicio_id: string }
        Returns: Database["public"]["Tables"]["servicios"]["Row"]
      }
      editar_servicio: {
        Args: {
          p_descripcion: string
          p_fecha: string
          p_hora_fin: string
          p_hora_inicio: string
          p_material: string
          p_modalidad: string
          p_servicio_id: string
        }
        Returns: Database["public"]["Tables"]["servicios"]["Row"]
      }
      eliminar_bono: {
        Args: { p_bono_id: string }
        Returns: Database["public"]["Tables"]["bonos"]["Row"]
      }
      es_admin: { Args: never; Returns: boolean }
      purgar_papelera: { Args: never; Returns: number }
      reactivar_servicio: {
        Args: { p_servicio_id: string }
        Returns: Database["public"]["Tables"]["servicios"]["Row"]
      }
      regenerar_token_portal: {
        Args: { p_cliente_id: string }
        Returns: Database["public"]["Tables"]["clientes"]["Row"]
      }
      registrar_servicio: {
        Args: {
          p_bono_id: string
          p_cliente_id: string
          p_creado_por: string
          p_descripcion: string
          p_fecha: string
          p_firma_cliente: string
          p_firma_tecnico: string
          p_firmante_nombre: string
          p_hora_fin: string
          p_hora_inicio: string
          p_material: string
          p_modalidad: string
          p_tipo: string
          p_trabajador_id: string
          p_trabajador_nombre: string
        }
        Returns: Database["public"]["Tables"]["servicios"]["Row"]
      }
      registrar_servicio_historico: {
        Args: {
          p_bono_id: string
          p_cliente_id: string
          p_creado_por?: string
          p_descripcion: string
          p_fecha: string
          p_firmante_nombre?: string
          p_horas: number
          p_material?: string
          p_modalidad: string
          p_tipo: string
          p_trabajador_nombre: string
        }
        Returns: Database["public"]["Tables"]["servicios"]["Row"]
      }
      registrar_servicio_suelto: {
        Args: {
          p_cliente_id: string
          p_creado_por: string
          p_descripcion: string
          p_fecha: string
          p_firma_cliente: string
          p_firma_tecnico: string
          p_firmante_nombre: string
          p_hora_fin: string
          p_hora_inicio: string
          p_material: string
          p_modalidad: string
          p_tipo: string
          p_trabajador_id: string
          p_trabajador_nombre: string
        }
        Returns: Database["public"]["Tables"]["servicios"]["Row"]
      }
      restaurar_bono: {
        Args: { p_bono_id: string }
        Returns: Database["public"]["Tables"]["bonos"]["Row"]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
