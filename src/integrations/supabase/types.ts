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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          activo: boolean | null
          correo: string | null
          created_at: string | null
          fono: string | null
          id: string
          nombre: string
          productos_servicios: string | null
          rut: string
          tenant_id: string
          updated_at: string | null
          vencimiento: number | null
        }
        Insert: {
          activo?: boolean | null
          correo?: string | null
          created_at?: string | null
          fono?: string | null
          id?: string
          nombre: string
          productos_servicios?: string | null
          rut: string
          tenant_id: string
          updated_at?: string | null
          vencimiento?: number | null
        }
        Update: {
          activo?: boolean | null
          correo?: string | null
          created_at?: string | null
          fono?: string | null
          id?: string
          nombre?: string
          productos_servicios?: string | null
          rut?: string
          tenant_id?: string
          updated_at?: string | null
          vencimiento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          comprimido: boolean | null
          created_at: string | null
          id: string
          modulo: string
          nombre_original: string
          nombre_storage: string
          referencia_id: string | null
          ruta_storage: string
          tamano_bytes: number
          tamano_original: number | null
          tenant_id: string
          tipo_mime: string
          uploaded_by: string | null
        }
        Insert: {
          comprimido?: boolean | null
          created_at?: string | null
          id?: string
          modulo: string
          nombre_original: string
          nombre_storage: string
          referencia_id?: string | null
          ruta_storage: string
          tamano_bytes: number
          tamano_original?: number | null
          tenant_id: string
          tipo_mime: string
          uploaded_by?: string | null
        }
        Update: {
          comprimido?: boolean | null
          created_at?: string | null
          id?: string
          modulo?: string
          nombre_original?: string
          nombre_storage?: string
          referencia_id?: string | null
          ruta_storage?: string
          tamano_bytes?: number
          tamano_original?: number | null
          tenant_id?: string
          tipo_mime?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_compra: {
        Row: {
          anio: number
          created_at: string | null
          documento_url: string | null
          fecha_acuse: string | null
          fecha_docto: string
          fecha_recepcion: string | null
          fecha_reclamo: string | null
          folio: number
          id: string
          mes: number
          monto_exento: number | null
          monto_iva: number | null
          monto_neto: number | null
          monto_total: number | null
          nro: number | null
          otro_impto: number | null
          producto_servicio: string | null
          razon_social: string
          resultado: number | null
          rut_proveedor: string
          tenant_id: string
          tipo_compra: string | null
          tipo_doc_id: number | null
        }
        Insert: {
          anio: number
          created_at?: string | null
          documento_url?: string | null
          fecha_acuse?: string | null
          fecha_docto: string
          fecha_recepcion?: string | null
          fecha_reclamo?: string | null
          folio: number
          id?: string
          mes: number
          monto_exento?: number | null
          monto_iva?: number | null
          monto_neto?: number | null
          monto_total?: number | null
          nro?: number | null
          otro_impto?: number | null
          producto_servicio?: string | null
          razon_social: string
          resultado?: number | null
          rut_proveedor: string
          tenant_id: string
          tipo_compra?: string | null
          tipo_doc_id?: number | null
        }
        Update: {
          anio?: number
          created_at?: string | null
          documento_url?: string | null
          fecha_acuse?: string | null
          fecha_docto?: string
          fecha_recepcion?: string | null
          fecha_reclamo?: string | null
          folio?: number
          id?: string
          mes?: number
          monto_exento?: number | null
          monto_iva?: number | null
          monto_neto?: number | null
          monto_total?: number | null
          nro?: number | null
          otro_impto?: number | null
          producto_servicio?: string | null
          razon_social?: string
          resultado?: number | null
          rut_proveedor?: string
          tenant_id?: string
          tipo_compra?: string | null
          tipo_doc_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_compra_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_compra_tipo_doc_id_fkey"
            columns: ["tipo_doc_id"]
            isOneToOne: false
            referencedRelation: "tipo_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_honorarios: {
        Row: {
          anio: number
          created_at: string
          documento_url: string | null
          estado: string
          fecha_anulacion: string | null
          fecha_docto: string
          folio: number
          id: string
          mes: number
          monto_bruto: number
          monto_pagado: number | null
          monto_retenido: number
          nombre_prestador: string
          nro: number | null
          producto_servicio: string | null
          rut_prestador: string
          sociedad_prof: string | null
          tenant_id: string
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          anio: number
          created_at?: string
          documento_url?: string | null
          estado?: string
          fecha_anulacion?: string | null
          fecha_docto: string
          folio: number
          id?: string
          mes: number
          monto_bruto?: number
          monto_pagado?: number | null
          monto_retenido?: number
          nombre_prestador: string
          nro?: number | null
          producto_servicio?: string | null
          rut_prestador: string
          sociedad_prof?: string | null
          tenant_id: string
          tipo_documento: string
          updated_at?: string
        }
        Update: {
          anio?: number
          created_at?: string
          documento_url?: string | null
          estado?: string
          fecha_anulacion?: string | null
          fecha_docto?: string
          folio?: number
          id?: string
          mes?: number
          monto_bruto?: number
          monto_pagado?: number | null
          monto_retenido?: number
          nombre_prestador?: string
          nro?: number | null
          producto_servicio?: string | null
          rut_prestador?: string
          sociedad_prof?: string | null
          tenant_id?: string
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_honorarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_venta: {
        Row: {
          anio: number
          created_at: string | null
          documento_url: string | null
          fecha_acuse: string | null
          fecha_docto: string
          fecha_recepcion: string | null
          fecha_reclamo: string | null
          folio: number
          id: string
          mes: number
          monto_exento: number | null
          monto_iva: number | null
          monto_neto: number | null
          monto_total: number | null
          nro: number | null
          otro_impto: number | null
          producto_servicio: string | null
          razon_social: string
          resultado: number | null
          rut_cliente: string
          tenant_id: string
          tipo_doc_id: number | null
          tipo_venta: string | null
        }
        Insert: {
          anio: number
          created_at?: string | null
          documento_url?: string | null
          fecha_acuse?: string | null
          fecha_docto: string
          fecha_recepcion?: string | null
          fecha_reclamo?: string | null
          folio: number
          id?: string
          mes: number
          monto_exento?: number | null
          monto_iva?: number | null
          monto_neto?: number | null
          monto_total?: number | null
          nro?: number | null
          otro_impto?: number | null
          producto_servicio?: string | null
          razon_social: string
          resultado?: number | null
          rut_cliente: string
          tenant_id: string
          tipo_doc_id?: number | null
          tipo_venta?: string | null
        }
        Update: {
          anio?: number
          created_at?: string | null
          documento_url?: string | null
          fecha_acuse?: string | null
          fecha_docto?: string
          fecha_recepcion?: string | null
          fecha_reclamo?: string | null
          folio?: number
          id?: string
          mes?: number
          monto_exento?: number | null
          monto_iva?: number | null
          monto_neto?: number | null
          monto_total?: number | null
          nro?: number | null
          otro_impto?: number | null
          producto_servicio?: string | null
          razon_social?: string
          resultado?: number | null
          rut_cliente?: string
          tenant_id?: string
          tipo_doc_id?: number | null
          tipo_venta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_venta_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_venta_tipo_doc_id_fkey"
            columns: ["tipo_doc_id"]
            isOneToOne: false
            referencedRelation: "tipo_documento"
            referencedColumns: ["id"]
          },
        ]
      }
      rendicion_items: {
        Row: {
          id: string
          tenant_id: string
          rendicion_id: string
          fecha_gasto: string
          categoria: string
          comercio: string
          rut_comercio: string | null
          descripcion: string
          monto: number
          documento_url: string | null
          orden: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          rendicion_id: string
          fecha_gasto: string
          categoria: string
          comercio: string
          rut_comercio?: string | null
          descripcion: string
          monto: number
          documento_url?: string | null
          orden?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          rendicion_id?: string
          fecha_gasto?: string
          categoria?: string
          comercio?: string
          rut_comercio?: string | null
          descripcion?: string
          monto?: number
          documento_url?: string | null
          orden?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rendicion_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rendicion_items_rendicion_id_fkey"
            columns: ["rendicion_id"]
            isOneToOne: false
            referencedRelation: "rendiciones"
            referencedColumns: ["id"]
          },
        ]
      }
      rendiciones: {
        Row: {
          id: string
          tenant_id: string
          numero: string
          fecha_creacion: string
          fecha_envio: string | null
          solicitante_id: string
          solicitante_nombre: string
          aprobado_por: string | null
          aprobado_por_nombre: string | null
          fecha_aprobacion: string | null
          titulo: string
          descripcion: string | null
          estado: string
          motivo_rechazo: string | null
          total: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          numero: string
          fecha_creacion?: string
          fecha_envio?: string | null
          solicitante_id: string
          solicitante_nombre: string
          aprobado_por?: string | null
          aprobado_por_nombre?: string | null
          fecha_aprobacion?: string | null
          titulo: string
          descripcion?: string | null
          estado?: string
          motivo_rechazo?: string | null
          total?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          numero?: string
          fecha_creacion?: string
          fecha_envio?: string | null
          solicitante_id?: string
          solicitante_nombre?: string
          aprobado_por?: string | null
          aprobado_por_nombre?: string | null
          fecha_aprobacion?: string | null
          titulo?: string
          descripcion?: string | null
          estado?: string
          motivo_rechazo?: string | null
          total?: number
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rendiciones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prestadores: {
        Row: {
          activo: boolean
          correo: string | null
          created_at: string
          fono: string | null
          id: string
          nombre: string
          rut: string
          sociedad_prof: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          correo?: string | null
          created_at?: string
          fono?: string | null
          id?: string
          nombre: string
          rut: string
          sociedad_prof?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          correo?: string | null
          created_at?: string
          fono?: string | null
          id?: string
          nombre?: string
          rut?: string
          sociedad_prof?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestadores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean | null
          correo: string | null
          created_at: string | null
          fono: string | null
          id: string
          nombre: string
          productos_servicios: string | null
          rut: string
          tenant_id: string
          updated_at: string | null
          vencimiento: number | null
        }
        Insert: {
          activo?: boolean | null
          correo?: string | null
          created_at?: string | null
          fono?: string | null
          id?: string
          nombre: string
          productos_servicios?: string | null
          rut: string
          tenant_id: string
          updated_at?: string | null
          vencimiento?: number | null
        }
        Update: {
          activo?: boolean | null
          correo?: string | null
          created_at?: string | null
          fono?: string | null
          id?: string
          nombre?: string
          productos_servicios?: string | null
          rut?: string
          tenant_id?: string
          updated_at?: string | null
          vencimiento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          activo: boolean | null
          ciudad: string | null
          comuna: string | null
          contacto: string | null
          created_at: string | null
          direccion: string | null
          email: string | null
          fono: string | null
          giro_principal: string | null
          id: string
          logo_url: string | null
          nombre: string
          razon_social: string | null
          region: string | null
          rut: string | null
          sitio_web: string | null
          subdominio: string
        }
        Insert: {
          activo?: boolean | null
          ciudad?: string | null
          comuna?: string | null
          contacto?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          fono?: string | null
          giro_principal?: string | null
          id?: string
          logo_url?: string | null
          nombre: string
          razon_social?: string | null
          region?: string | null
          rut?: string | null
          sitio_web?: string | null
          subdominio: string
        }
        Update: {
          activo?: boolean | null
          ciudad?: string | null
          comuna?: string | null
          contacto?: string | null
          created_at?: string | null
          direccion?: string | null
          email?: string | null
          fono?: string | null
          giro_principal?: string | null
          id?: string
          logo_url?: string | null
          nombre?: string
          razon_social?: string | null
          region?: string | null
          rut?: string | null
          sitio_web?: string | null
          subdominio?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activo: boolean | null
          cargo: string | null
          created_at: string | null
          fono: string | null
          foto_url: string | null
          id: string
          nombre: string | null
          tenant_id: string
          ultimo_acceso: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          fono?: string | null
          foto_url?: string | null
          id: string
          nombre?: string | null
          tenant_id: string
          ultimo_acceso?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          cargo?: string | null
          created_at?: string | null
          fono?: string | null
          foto_url?: string | null
          id?: string
          nombre?: string | null
          tenant_id?: string
          ultimo_acceso?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_documento: {
        Row: {
          abreviacion: string | null
          activo: boolean | null
          id: number
          nombre: string
        }
        Insert: {
          abreviacion?: string | null
          activo?: boolean | null
          id: number
          nombre: string
        }
        Update: {
          abreviacion?: string | null
          activo?: boolean | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          created_at: string | null
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      libro_rendiciones: {
        Row: {
          id: string | null
          tenant_id: string | null
          numero: string | null
          fecha_creacion: string | null
          fecha_envio: string | null
          fecha_aprobacion: string | null
          titulo: string | null
          descripcion: string | null
          estado: string | null
          motivo_rechazo: string | null
          total: number | null
          solicitante_id: string | null
          solicitante_nombre: string | null
          aprobado_por: string | null
          aprobado_por_nombre: string | null
          cantidad_items: number | null
          created_at: string | null
          updated_at: string | null
        }
        Relationships: []
      }
      libro_compras: {
        Row: {
          exento: number | null
          fecha: string | null
          iva: number | null
          neto: number | null
          nombre_proveedor: string | null
          nro_documento: number | null
          otro_impto: number | null
          periodo: string | null
          rut: string | null
          tenant_id: string | null
          tipo_documento: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_compra_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      libro_honorarios: {
        Row: {
          bruto: number | null
          estado: string | null
          fecha: string | null
          nombre_prestador: string | null
          nro_documento: number | null
          pagado: number | null
          periodo: string | null
          retencion: number | null
          rut: string | null
          tenant_id: string | null
          tipo_documento: string | null
        }
        Insert: {
          bruto?: number | null
          estado?: string | null
          fecha?: string | null
          nombre_prestador?: string | null
          nro_documento?: number | null
          pagado?: number | null
          periodo?: never
          retencion?: number | null
          rut?: string | null
          tenant_id?: string | null
          tipo_documento?: string | null
        }
        Update: {
          bruto?: number | null
          estado?: string | null
          fecha?: string | null
          nombre_prestador?: string | null
          nro_documento?: number | null
          pagado?: number | null
          periodo?: never
          retencion?: number | null
          rut?: string | null
          tenant_id?: string | null
          tipo_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_honorarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      libro_ventas: {
        Row: {
          exento: number | null
          fecha: string | null
          iva: number | null
          neto: number | null
          nombre_cliente: string | null
          nro_documento: number | null
          otro_impto: number | null
          periodo: string | null
          rut: string | null
          tenant_id: string | null
          tipo_documento: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_venta_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      my_tenant_id: { Args: never; Returns: string }
      validar_rut: { Args: { rut: string }; Returns: boolean }
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

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
