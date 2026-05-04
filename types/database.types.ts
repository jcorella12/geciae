// @ts-nocheck
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accesos_externos: {
        Row: {
          activo: boolean | null
          entidad_id: string
          fecha_invitacion: string | null
          fecha_primer_acceso: string | null
          fecha_ultimo_acceso: string | null
          id: string
          observaciones: string | null
          permisos: Json | null
          tipo: string
          usuario_id: string
        }
        Insert: {
          activo?: boolean | null
          entidad_id: string
          fecha_invitacion?: string | null
          fecha_primer_acceso?: string | null
          fecha_ultimo_acceso?: string | null
          id?: string
          observaciones?: string | null
          permisos?: Json | null
          tipo: string
          usuario_id: string
        }
        Update: {
          activo?: boolean | null
          entidad_id?: string
          fecha_invitacion?: string | null
          fecha_primer_acceso?: string | null
          fecha_ultimo_acceso?: string | null
          id?: string
          observaciones?: string | null
          permisos?: Json | null
          tipo?: string
          usuario_id?: string
        }
        Relationships: []
      }
      actividades_comerciales: {
        Row: {
          capturado_por: string
          cliente_id: string | null
          created_at: string | null
          duracion_minutos: number | null
          fecha: string
          id: string
          notas: string | null
          oportunidad_id: string | null
          participantes: string | null
          resultado: string | null
          tipo: string
        }
        Insert: {
          capturado_por: string
          cliente_id?: string | null
          created_at?: string | null
          duracion_minutos?: number | null
          fecha: string
          id?: string
          notas?: string | null
          oportunidad_id?: string | null
          participantes?: string | null
          resultado?: string | null
          tipo: string
        }
        Update: {
          capturado_por?: string
          cliente_id?: string | null
          created_at?: string | null
          duracion_minutos?: number | null
          fecha?: string
          id?: string
          notas?: string | null
          oportunidad_id?: string | null
          participantes?: string | null
          resultado?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividades_comerciales_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_comerciales_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividades_comerciales_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      activos_asignados: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string
          empleado_id: string
          fecha_asignacion: string
          fecha_devolucion: string | null
          fecha_proxima_calibracion: string | null
          fecha_proxima_reposicion: string | null
          fecha_proximo_servicio: string | null
          id: string
          identificador: string | null
          observaciones: string | null
          tipo: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion: string
          empleado_id: string
          fecha_asignacion: string
          fecha_devolucion?: string | null
          fecha_proxima_calibracion?: string | null
          fecha_proxima_reposicion?: string | null
          fecha_proximo_servicio?: string | null
          id?: string
          identificador?: string | null
          observaciones?: string | null
          tipo: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string
          empleado_id?: string
          fecha_asignacion?: string
          fecha_devolucion?: string | null
          fecha_proxima_calibracion?: string | null
          fecha_proxima_reposicion?: string | null
          fecha_proximo_servicio?: string | null
          id?: string
          identificador?: string | null
          observaciones?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "activos_asignados_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activos_asignados_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activos_asignados_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      almacenes: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          direccion: Json | null
          empresa_id: string
          id: string
          nombre: string
          responsable_id: string | null
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          direccion?: Json | null
          empresa_id: string
          id?: string
          nombre: string
          responsable_id?: string | null
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          direccion?: Json | null
          empresa_id?: string
          id?: string
          nombre?: string
          responsable_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "almacenes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_acciones: {
        Row: {
          accion: string
          datos_antes: Json | null
          datos_despues: Json | null
          empresa_id: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          id: string
          ip: string | null
          timestamp: string | null
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          accion: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          empresa_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          ip?: string | null
          timestamp?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          empresa_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          id?: string
          ip?: string | null
          timestamp?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_acciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditorias_hallazgos: {
        Row: {
          auditoria_id: string
          clausula_iso: string | null
          created_at: string | null
          descripcion: string
          evidencia: string | null
          id: string
          no_conformidad_id: string | null
          tipo: string
        }
        Insert: {
          auditoria_id: string
          clausula_iso?: string | null
          created_at?: string | null
          descripcion: string
          evidencia?: string | null
          id?: string
          no_conformidad_id?: string | null
          tipo: string
        }
        Update: {
          auditoria_id?: string
          clausula_iso?: string | null
          created_at?: string | null
          descripcion?: string
          evidencia?: string | null
          id?: string
          no_conformidad_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditorias_hallazgos_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias_internas"
            referencedColumns: ["id"]
          },
        ]
      }
      auditorias_internas: {
        Row: {
          alcance: string | null
          auditor_lider_id: string
          auditores_id: string[] | null
          conclusiones: string | null
          created_at: string | null
          criterios: string | null
          empresa_id: string
          estado: string | null
          fecha_ejecucion: string | null
          fecha_planeada: string | null
          id: string
          numero: string
          proceso_id: string | null
          tipo: string | null
          url_reporte: string | null
        }
        Insert: {
          alcance?: string | null
          auditor_lider_id: string
          auditores_id?: string[] | null
          conclusiones?: string | null
          created_at?: string | null
          criterios?: string | null
          empresa_id: string
          estado?: string | null
          fecha_ejecucion?: string | null
          fecha_planeada?: string | null
          id?: string
          numero: string
          proceso_id?: string | null
          tipo?: string | null
          url_reporte?: string | null
        }
        Update: {
          alcance?: string | null
          auditor_lider_id?: string
          auditores_id?: string[] | null
          conclusiones?: string | null
          created_at?: string | null
          criterios?: string | null
          empresa_id?: string
          estado?: string | null
          fecha_ejecucion?: string | null
          fecha_planeada?: string | null
          id?: string
          numero?: string
          proceso_id?: string | null
          tipo?: string | null
          url_reporte?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditorias_internas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditorias_internas_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "sgc_procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_cuentas: {
        Row: {
          activa: boolean | null
          alias: string | null
          asesor: string | null
          banco: string
          clabe: string | null
          contrato: string | null
          created_at: string | null
          cuenta_garantia_id: string | null
          empresa_id: string
          fecha_actualizacion_saldo: string | null
          id: string
          inversion_emisora: string | null
          inversion_es_garantia: boolean | null
          inversion_precio_titulo: number | null
          inversion_rendimiento_mensual_pct: number | null
          inversion_titulos: number | null
          linea_credito_dispuesto: number | null
          linea_credito_fecha_apertura: string | null
          linea_credito_fecha_vencimiento: string | null
          linea_credito_monto_aprobado: number | null
          linea_credito_pagos_pendientes: number | null
          linea_credito_proximo_pago_fecha: string | null
          linea_credito_proximo_pago_monto: number | null
          linea_credito_tasa_efectiva: number | null
          linea_credito_tasa_referencia: string | null
          linea_credito_tasa_spread: number | null
          moneda: string | null
          numero_cuenta: string
          saldo_actual: number | null
          spid: string | null
          tipo: string | null
        }
        Insert: {
          activa?: boolean | null
          alias?: string | null
          asesor?: string | null
          banco: string
          clabe?: string | null
          contrato?: string | null
          created_at?: string | null
          cuenta_garantia_id?: string | null
          empresa_id: string
          fecha_actualizacion_saldo?: string | null
          id?: string
          inversion_emisora?: string | null
          inversion_es_garantia?: boolean | null
          inversion_precio_titulo?: number | null
          inversion_rendimiento_mensual_pct?: number | null
          inversion_titulos?: number | null
          linea_credito_dispuesto?: number | null
          linea_credito_fecha_apertura?: string | null
          linea_credito_fecha_vencimiento?: string | null
          linea_credito_monto_aprobado?: number | null
          linea_credito_pagos_pendientes?: number | null
          linea_credito_proximo_pago_fecha?: string | null
          linea_credito_proximo_pago_monto?: number | null
          linea_credito_tasa_efectiva?: number | null
          linea_credito_tasa_referencia?: string | null
          linea_credito_tasa_spread?: number | null
          moneda?: string | null
          numero_cuenta: string
          saldo_actual?: number | null
          spid?: string | null
          tipo?: string | null
        }
        Update: {
          activa?: boolean | null
          alias?: string | null
          asesor?: string | null
          banco?: string
          clabe?: string | null
          contrato?: string | null
          created_at?: string | null
          cuenta_garantia_id?: string | null
          empresa_id?: string
          fecha_actualizacion_saldo?: string | null
          id?: string
          inversion_emisora?: string | null
          inversion_es_garantia?: boolean | null
          inversion_precio_titulo?: number | null
          inversion_rendimiento_mensual_pct?: number | null
          inversion_titulos?: number | null
          linea_credito_dispuesto?: number | null
          linea_credito_fecha_apertura?: string | null
          linea_credito_fecha_vencimiento?: string | null
          linea_credito_monto_aprobado?: number | null
          linea_credito_pagos_pendientes?: number | null
          linea_credito_proximo_pago_fecha?: string | null
          linea_credito_proximo_pago_monto?: number | null
          linea_credito_tasa_efectiva?: number | null
          linea_credito_tasa_referencia?: string | null
          linea_credito_tasa_spread?: number | null
          moneda?: string | null
          numero_cuenta?: string
          saldo_actual?: number | null
          spid?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_cuentas_cuenta_garantia_id_fkey"
            columns: ["cuenta_garantia_id"]
            isOneToOne: false
            referencedRelation: "bancos_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_cuentas_cuenta_garantia_id_fkey"
            columns: ["cuenta_garantia_id"]
            isOneToOne: false
            referencedRelation: "v_bancos_cuentas_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_cuentas_cuenta_garantia_id_fkey"
            columns: ["cuenta_garantia_id"]
            isOneToOne: false
            referencedRelation: "v_conciliacion_mensual"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "bancos_cuentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_movimientos: {
        Row: {
          cfdi_relacionado_id: string | null
          concepto: string | null
          conciliacion_notas: string | null
          conciliado: boolean | null
          conciliado_por: string | null
          created_at: string | null
          cuenta_id: string
          fecha: string
          fecha_aplicacion: string | null
          fecha_conciliacion: string | null
          id: string
          monto: number
          observaciones: string | null
          oc_relacionada_id: string | null
          origen: string | null
          prestamo_relacionado_id: string | null
          referencia: string | null
          saldo_resultante: number | null
          tipo: string | null
        }
        Insert: {
          cfdi_relacionado_id?: string | null
          concepto?: string | null
          conciliacion_notas?: string | null
          conciliado?: boolean | null
          conciliado_por?: string | null
          created_at?: string | null
          cuenta_id: string
          fecha: string
          fecha_aplicacion?: string | null
          fecha_conciliacion?: string | null
          id?: string
          monto: number
          observaciones?: string | null
          oc_relacionada_id?: string | null
          origen?: string | null
          prestamo_relacionado_id?: string | null
          referencia?: string | null
          saldo_resultante?: number | null
          tipo?: string | null
        }
        Update: {
          cfdi_relacionado_id?: string | null
          concepto?: string | null
          conciliacion_notas?: string | null
          conciliado?: boolean | null
          conciliado_por?: string | null
          created_at?: string | null
          cuenta_id?: string
          fecha?: string
          fecha_aplicacion?: string | null
          fecha_conciliacion?: string | null
          id?: string
          monto?: number
          observaciones?: string | null
          oc_relacionada_id?: string | null
          origen?: string | null
          prestamo_relacionado_id?: string | null
          referencia?: string | null
          saldo_resultante?: number | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_movimientos_cfdi_relacionado_id_fkey"
            columns: ["cfdi_relacionado_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "bancos_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_bancos_cuentas_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_movimientos_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_conciliacion_mensual"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "bancos_movimientos_oc_relacionada_id_fkey"
            columns: ["oc_relacionada_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_movimientos_prestamo_relacionado_id_fkey"
            columns: ["prestamo_relacionado_id"]
            isOneToOne: false
            referencedRelation: "prestamos_inter_co"
            referencedColumns: ["id"]
          },
        ]
      }
      bitacoras_obra: {
        Row: {
          capturado_por: string
          clima: Json | null
          created_at: string | null
          fecha: string
          fecha_validacion: string | null
          id: string
          incidentes: Json | null
          materiales_consumidos: Json | null
          notas_internas: string | null
          notas_oficiales: string | null
          observaciones_cliente: string | null
          pendientes_manana: string | null
          personal_en_sitio: Json | null
          proyecto_id: string
          trabajos_realizados: string | null
          validado_por: string | null
          visitas_externas: string | null
        }
        Insert: {
          capturado_por: string
          clima?: Json | null
          created_at?: string | null
          fecha: string
          fecha_validacion?: string | null
          id?: string
          incidentes?: Json | null
          materiales_consumidos?: Json | null
          notas_internas?: string | null
          notas_oficiales?: string | null
          observaciones_cliente?: string | null
          pendientes_manana?: string | null
          personal_en_sitio?: Json | null
          proyecto_id: string
          trabajos_realizados?: string | null
          validado_por?: string | null
          visitas_externas?: string | null
        }
        Update: {
          capturado_por?: string
          clima?: Json | null
          created_at?: string | null
          fecha?: string
          fecha_validacion?: string | null
          id?: string
          incidentes?: Json | null
          materiales_consumidos?: Json | null
          notas_internas?: string | null
          notas_oficiales?: string | null
          observaciones_cliente?: string | null
          pendientes_manana?: string | null
          personal_en_sitio?: Json | null
          proyecto_id?: string
          trabajos_realizados?: string | null
          validado_por?: string | null
          visitas_externas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bitacoras_obra_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bitacoras_obra_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      bolsa_talento: {
        Row: {
          created_at: string | null
          curp: string | null
          disponible: boolean | null
          email: string | null
          empleado_id: string | null
          especialidades: string[] | null
          evaluacion_cierre: number | null
          fecha_disponibilidad: string | null
          id: string
          nombre_completo: string
          observaciones: string | null
          recomendado_volver_contratar: boolean | null
          rfc: string | null
          telefono: string | null
          ubicacion: string | null
        }
        Insert: {
          created_at?: string | null
          curp?: string | null
          disponible?: boolean | null
          email?: string | null
          empleado_id?: string | null
          especialidades?: string[] | null
          evaluacion_cierre?: number | null
          fecha_disponibilidad?: string | null
          id?: string
          nombre_completo: string
          observaciones?: string | null
          recomendado_volver_contratar?: boolean | null
          rfc?: string | null
          telefono?: string | null
          ubicacion?: string | null
        }
        Update: {
          created_at?: string | null
          curp?: string | null
          disponible?: boolean | null
          email?: string | null
          empleado_id?: string | null
          especialidades?: string[] | null
          evaluacion_cierre?: number | null
          fecha_disponibilidad?: string | null
          id?: string
          nombre_completo?: string
          observaciones?: string | null
          recomendado_volver_contratar?: boolean | null
          rfc?: string | null
          telefono?: string | null
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bolsa_talento_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bolsa_talento_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bolsa_talento_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      capacitaciones: {
        Row: {
          activo: boolean | null
          catalogo_publico: boolean | null
          codigo: string
          costo: number | null
          created_at: string | null
          descripcion: string | null
          duracion_horas: number | null
          genera_dc3: boolean | null
          id: string
          instructor_externo: string | null
          instructor_id: string | null
          modalidad: string | null
          nombre: string
          obligatorio_para_puestos: string[] | null
          vigencia_constancia_meses: number | null
        }
        Insert: {
          activo?: boolean | null
          catalogo_publico?: boolean | null
          codigo: string
          costo?: number | null
          created_at?: string | null
          descripcion?: string | null
          duracion_horas?: number | null
          genera_dc3?: boolean | null
          id?: string
          instructor_externo?: string | null
          instructor_id?: string | null
          modalidad?: string | null
          nombre: string
          obligatorio_para_puestos?: string[] | null
          vigencia_constancia_meses?: number | null
        }
        Update: {
          activo?: boolean | null
          catalogo_publico?: boolean | null
          codigo?: string
          costo?: number | null
          created_at?: string | null
          descripcion?: string | null
          duracion_horas?: number | null
          genera_dc3?: boolean | null
          id?: string
          instructor_externo?: string | null
          instructor_id?: string | null
          modalidad?: string | null
          nombre?: string
          obligatorio_para_puestos?: string[] | null
          vigencia_constancia_meses?: number | null
        }
        Relationships: []
      }
      catalogo_mano_obra: {
        Row: {
          activo: boolean | null
          categoria: string
          costo_dia: number | null
          costo_hora: number | null
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          id: string
          precio_dia_externo: number | null
          precio_hora_externo: number | null
        }
        Insert: {
          activo?: boolean | null
          categoria: string
          costo_dia?: number | null
          costo_hora?: number | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          id?: string
          precio_dia_externo?: number | null
          precio_hora_externo?: number | null
        }
        Update: {
          activo?: boolean | null
          categoria?: string
          costo_dia?: number | null
          costo_hora?: number | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          id?: string
          precio_dia_externo?: number | null
          precio_hora_externo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_mano_obra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_productos: {
        Row: {
          activo: boolean | null
          capacidad: number | null
          categoria: string | null
          clave_sat: string | null
          codigo: string
          costo_maximo: number | null
          costo_minimo: number | null
          costo_promedio: number | null
          costo_ultimo: number | null
          created_at: string | null
          descripcion: string | null
          empresa_id: string | null
          especificaciones: Json | null
          fecha_actualizacion_valor: string | null
          fuente_valor: string | null
          garantia_meses: number | null
          id: string
          imagen_url: string | null
          marca: string | null
          modelo: string | null
          nombre: string
          observaciones: string | null
          precio_lista: number | null
          proveedor_preferido_id: string | null
          requiere_serie: boolean | null
          stock_maximo: number | null
          stock_minimo: number | null
          subcategoria: string | null
          unidad_capacidad: string | null
          unidad_medida: string | null
          unidad_sat: string | null
          updated_at: string | null
          url_datasheet: string | null
          valor_mercado: number | null
        }
        Insert: {
          activo?: boolean | null
          capacidad?: number | null
          categoria?: string | null
          clave_sat?: string | null
          codigo: string
          costo_maximo?: number | null
          costo_minimo?: number | null
          costo_promedio?: number | null
          costo_ultimo?: number | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          especificaciones?: Json | null
          fecha_actualizacion_valor?: string | null
          fuente_valor?: string | null
          garantia_meses?: number | null
          id?: string
          imagen_url?: string | null
          marca?: string | null
          modelo?: string | null
          nombre: string
          observaciones?: string | null
          precio_lista?: number | null
          proveedor_preferido_id?: string | null
          requiere_serie?: boolean | null
          stock_maximo?: number | null
          stock_minimo?: number | null
          subcategoria?: string | null
          unidad_capacidad?: string | null
          unidad_medida?: string | null
          unidad_sat?: string | null
          updated_at?: string | null
          url_datasheet?: string | null
          valor_mercado?: number | null
        }
        Update: {
          activo?: boolean | null
          capacidad?: number | null
          categoria?: string | null
          clave_sat?: string | null
          codigo?: string
          costo_maximo?: number | null
          costo_minimo?: number | null
          costo_promedio?: number | null
          costo_ultimo?: number | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          especificaciones?: Json | null
          fecha_actualizacion_valor?: string | null
          fuente_valor?: string | null
          garantia_meses?: number | null
          id?: string
          imagen_url?: string | null
          marca?: string | null
          modelo?: string | null
          nombre?: string
          observaciones?: string | null
          precio_lista?: number | null
          proveedor_preferido_id?: string | null
          requiere_serie?: boolean | null
          stock_maximo?: number | null
          stock_minimo?: number | null
          subcategoria?: string | null
          unidad_capacidad?: string | null
          unidad_medida?: string | null
          unidad_sat?: string | null
          updated_at?: string | null
          url_datasheet?: string | null
          valor_mercado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_productos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_productos_proveedor_preferido_id_fkey"
            columns: ["proveedor_preferido_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalogo_productos_proveedor_preferido_id_fkey"
            columns: ["proveedor_preferido_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_servicios: {
        Row: {
          activo: boolean | null
          clave_sat: string | null
          codigo: string
          costo_base: number | null
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          id: string
          iva_aplicable: boolean | null
          margen_inter_co: number | null
          nombre: string
          precio_externo: number | null
          precio_inter_co: number | null
          retenciones: Json | null
          unidad: string | null
          unidad_sat: string | null
          vigencia_fin: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          activo?: boolean | null
          clave_sat?: string | null
          codigo: string
          costo_base?: number | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          id?: string
          iva_aplicable?: boolean | null
          margen_inter_co?: number | null
          nombre: string
          precio_externo?: number | null
          precio_inter_co?: number | null
          retenciones?: Json | null
          unidad?: string | null
          unidad_sat?: string | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          activo?: boolean | null
          clave_sat?: string | null
          codigo?: string
          costo_base?: number | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          id?: string
          iva_aplicable?: boolean | null
          margen_inter_co?: number | null
          nombre?: string
          precio_externo?: number | null
          precio_inter_co?: number | null
          retenciones?: Json | null
          unidad?: string | null
          unidad_sat?: string | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_servicios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_viaticos: {
        Row: {
          activo: boolean | null
          alimentacion_dia: number | null
          created_at: string | null
          destino: string
          hospedaje_dia: number | null
          id: string
          otros_dia: number | null
          transporte_dia: number | null
        }
        Insert: {
          activo?: boolean | null
          alimentacion_dia?: number | null
          created_at?: string | null
          destino: string
          hospedaje_dia?: number | null
          id?: string
          otros_dia?: number | null
          transporte_dia?: number | null
        }
        Update: {
          activo?: boolean | null
          alimentacion_dia?: number | null
          created_at?: string | null
          destino?: string
          hospedaje_dia?: number | null
          id?: string
          otros_dia?: number | null
          transporte_dia?: number | null
        }
        Relationships: []
      }
      centros: {
        Row: {
          activo: boolean
          centro_padre_id: string | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          id: string
          nombre: string
          observaciones: string | null
          presupuesto_anual: number | null
          responsable_id: string | null
          subtipo: Database["public"]["Enums"]["subtipo_centro"]
          tipo: Database["public"]["Enums"]["tipo_centro"]
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          centro_padre_id?: string | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          id?: string
          nombre: string
          observaciones?: string | null
          presupuesto_anual?: number | null
          responsable_id?: string | null
          subtipo: Database["public"]["Enums"]["subtipo_centro"]
          tipo: Database["public"]["Enums"]["tipo_centro"]
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          centro_padre_id?: string | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          observaciones?: string | null
          presupuesto_anual?: number | null
          responsable_id?: string | null
          subtipo?: Database["public"]["Enums"]["subtipo_centro"]
          tipo?: Database["public"]["Enums"]["tipo_centro"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centros_centro_padre_id_fkey"
            columns: ["centro_padre_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_centro_padre_id_fkey"
            columns: ["centro_padre_id"]
            isOneToOne: false
            referencedRelation: "v_centros_balance"
            referencedColumns: ["centro_id"]
          },
          {
            foreignKeyName: "centros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_cierres_mensuales: {
        Row: {
          anio: number
          cerrado: boolean
          cerrado_at: string | null
          cerrado_por: string | null
          empresa_id: string
          id: string
          mes: number
          observaciones: string | null
          reabierto_at: string | null
          reabierto_motivo: string | null
          reabierto_por: string | null
          total_gastos: number | null
          total_repartos_emitidos: number | null
          total_repartos_recibidos: number | null
        }
        Insert: {
          anio: number
          cerrado?: boolean
          cerrado_at?: string | null
          cerrado_por?: string | null
          empresa_id: string
          id?: string
          mes: number
          observaciones?: string | null
          reabierto_at?: string | null
          reabierto_motivo?: string | null
          reabierto_por?: string | null
          total_gastos?: number | null
          total_repartos_emitidos?: number | null
          total_repartos_recibidos?: number | null
        }
        Update: {
          anio?: number
          cerrado?: boolean
          cerrado_at?: string | null
          cerrado_por?: string | null
          empresa_id?: string
          id?: string
          mes?: number
          observaciones?: string | null
          reabierto_at?: string | null
          reabierto_motivo?: string | null
          reabierto_por?: string | null
          total_gastos?: number | null
          total_repartos_emitidos?: number | null
          total_repartos_recibidos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "centros_cierres_mensuales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_movimientos: {
        Row: {
          capturado_por: string
          centro_id: string
          cfdi_id: string | null
          concepto: string
          created_at: string | null
          empresa_id: string
          fecha: string
          gasto_recurrente_id: string | null
          id: string
          monto: number
          observaciones: string | null
          oc_id: string | null
          origen_movimiento_id: string | null
          ot_id: string | null
          proyecto_id: string | null
          regla_reparto_id: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento_centro"]
        }
        Insert: {
          capturado_por: string
          centro_id: string
          cfdi_id?: string | null
          concepto: string
          created_at?: string | null
          empresa_id: string
          fecha: string
          gasto_recurrente_id?: string | null
          id?: string
          monto: number
          observaciones?: string | null
          oc_id?: string | null
          origen_movimiento_id?: string | null
          ot_id?: string | null
          proyecto_id?: string | null
          regla_reparto_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_movimiento_centro"]
        }
        Update: {
          capturado_por?: string
          centro_id?: string
          cfdi_id?: string | null
          concepto?: string
          created_at?: string | null
          empresa_id?: string
          fecha?: string
          gasto_recurrente_id?: string | null
          id?: string
          monto?: number
          observaciones?: string | null
          oc_id?: string | null
          origen_movimiento_id?: string | null
          ot_id?: string | null
          proyecto_id?: string | null
          regla_reparto_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_movimiento_centro"]
        }
        Relationships: [
          {
            foreignKeyName: "centros_movimientos_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_movimientos_centro_id_fkey"
            columns: ["centro_id"]
            isOneToOne: false
            referencedRelation: "v_centros_balance"
            referencedColumns: ["centro_id"]
          },
          {
            foreignKeyName: "centros_movimientos_cfdi_id_fkey"
            columns: ["cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_movimientos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_movimientos_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_movimientos_origen_movimiento_id_fkey"
            columns: ["origen_movimiento_id"]
            isOneToOne: false
            referencedRelation: "centros_movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_movimientos_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordenes_trabajo_inter_co"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "centros_movimientos_regla_reparto_id_fkey"
            columns: ["regla_reparto_id"]
            isOneToOne: false
            referencedRelation: "centros_reglas_reparto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cm_gasto_recurrente"
            columns: ["gasto_recurrente_id"]
            isOneToOne: false
            referencedRelation: "gastos_recurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_cm_gasto_recurrente"
            columns: ["gasto_recurrente_id"]
            isOneToOne: false
            referencedRelation: "v_gastos_recurrentes_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      centros_reglas_reparto: {
        Row: {
          activa: boolean
          centro_destino_id: string | null
          centro_origen_id: string
          created_at: string | null
          emision: Database["public"]["Enums"]["tipo_emision_reparto"]
          empresa_destino_id: string
          id: string
          metodo: Database["public"]["Enums"]["metodo_reparto"]
          observaciones: string | null
          valor: number | null
          vigencia_desde: string
          vigencia_hasta: string | null
        }
        Insert: {
          activa?: boolean
          centro_destino_id?: string | null
          centro_origen_id: string
          created_at?: string | null
          emision?: Database["public"]["Enums"]["tipo_emision_reparto"]
          empresa_destino_id: string
          id?: string
          metodo: Database["public"]["Enums"]["metodo_reparto"]
          observaciones?: string | null
          valor?: number | null
          vigencia_desde: string
          vigencia_hasta?: string | null
        }
        Update: {
          activa?: boolean
          centro_destino_id?: string | null
          centro_origen_id?: string
          created_at?: string | null
          emision?: Database["public"]["Enums"]["tipo_emision_reparto"]
          empresa_destino_id?: string
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_reparto"]
          observaciones?: string | null
          valor?: number | null
          vigencia_desde?: string
          vigencia_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centros_reglas_reparto_centro_destino_id_fkey"
            columns: ["centro_destino_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_reglas_reparto_centro_destino_id_fkey"
            columns: ["centro_destino_id"]
            isOneToOne: false
            referencedRelation: "v_centros_balance"
            referencedColumns: ["centro_id"]
          },
          {
            foreignKeyName: "centros_reglas_reparto_centro_origen_id_fkey"
            columns: ["centro_origen_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_reglas_reparto_centro_origen_id_fkey"
            columns: ["centro_origen_id"]
            isOneToOne: false
            referencedRelation: "v_centros_balance"
            referencedColumns: ["centro_id"]
          },
          {
            foreignKeyName: "centros_reglas_reparto_empresa_destino_id_fkey"
            columns: ["empresa_destino_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cfdi: {
        Row: {
          capturado_por: string | null
          cliente_id: string | null
          contrato_id: string | null
          created_at: string | null
          descuento: number | null
          empresa_id: string
          enviado_a_receptor: boolean | null
          es_emitido: boolean
          estado: Database["public"]["Enums"]["estado_cfdi"] | null
          fecha_emision: string | null
          fecha_envio_receptor: string | null
          fecha_pago: string | null
          fecha_timbrado: string | null
          folio: string | null
          forma_pago: string | null
          id: string
          isr_retenido: number | null
          iva_retenido: number | null
          iva_trasladado: number | null
          metodo_pago: string | null
          moneda: string | null
          monto_pagado: number | null
          motivo_cancelacion: string | null
          nombre_emisor: string | null
          nombre_receptor: string | null
          observaciones: string | null
          oc_id: string | null
          ot_id: string | null
          pac_proveedor: string | null
          pac_response: Json | null
          proveedor_id: string | null
          proyecto_id: string | null
          rfc_emisor: string
          rfc_receptor: string
          saldo_pendiente: number | null
          serie: string | null
          subtotal: number
          tipo: Database["public"]["Enums"]["tipo_cfdi"]
          tipo_cambio: number | null
          total: number
          updated_at: string | null
          url_pdf: string | null
          url_xml: string | null
          uso_cfdi: string | null
          uuid_sat: string | null
          uuid_sustituye: string | null
        }
        Insert: {
          capturado_por?: string | null
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          descuento?: number | null
          empresa_id: string
          enviado_a_receptor?: boolean | null
          es_emitido: boolean
          estado?: Database["public"]["Enums"]["estado_cfdi"] | null
          fecha_emision?: string | null
          fecha_envio_receptor?: string | null
          fecha_pago?: string | null
          fecha_timbrado?: string | null
          folio?: string | null
          forma_pago?: string | null
          id?: string
          isr_retenido?: number | null
          iva_retenido?: number | null
          iva_trasladado?: number | null
          metodo_pago?: string | null
          moneda?: string | null
          monto_pagado?: number | null
          motivo_cancelacion?: string | null
          nombre_emisor?: string | null
          nombre_receptor?: string | null
          observaciones?: string | null
          oc_id?: string | null
          ot_id?: string | null
          pac_proveedor?: string | null
          pac_response?: Json | null
          proveedor_id?: string | null
          proyecto_id?: string | null
          rfc_emisor: string
          rfc_receptor: string
          saldo_pendiente?: number | null
          serie?: string | null
          subtotal: number
          tipo: Database["public"]["Enums"]["tipo_cfdi"]
          tipo_cambio?: number | null
          total: number
          updated_at?: string | null
          url_pdf?: string | null
          url_xml?: string | null
          uso_cfdi?: string | null
          uuid_sat?: string | null
          uuid_sustituye?: string | null
        }
        Update: {
          capturado_por?: string | null
          cliente_id?: string | null
          contrato_id?: string | null
          created_at?: string | null
          descuento?: number | null
          empresa_id?: string
          enviado_a_receptor?: boolean | null
          es_emitido?: boolean
          estado?: Database["public"]["Enums"]["estado_cfdi"] | null
          fecha_emision?: string | null
          fecha_envio_receptor?: string | null
          fecha_pago?: string | null
          fecha_timbrado?: string | null
          folio?: string | null
          forma_pago?: string | null
          id?: string
          isr_retenido?: number | null
          iva_retenido?: number | null
          iva_trasladado?: number | null
          metodo_pago?: string | null
          moneda?: string | null
          monto_pagado?: number | null
          motivo_cancelacion?: string | null
          nombre_emisor?: string | null
          nombre_receptor?: string | null
          observaciones?: string | null
          oc_id?: string | null
          ot_id?: string | null
          pac_proveedor?: string | null
          pac_response?: Json | null
          proveedor_id?: string | null
          proyecto_id?: string | null
          rfc_emisor?: string
          rfc_receptor?: string
          saldo_pendiente?: number | null
          serie?: string | null
          subtotal?: number
          tipo?: Database["public"]["Enums"]["tipo_cfdi"]
          tipo_cambio?: number | null
          total?: number
          updated_at?: string | null
          url_pdf?: string | null
          url_xml?: string | null
          uso_cfdi?: string | null
          uuid_sat?: string | null
          uuid_sustituye?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfdi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_ot_id_fkey"
            columns: ["ot_id"]
            isOneToOne: false
            referencedRelation: "ordenes_trabajo_inter_co"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      cfdi_conceptos: {
        Row: {
          cantidad: number
          cfdi_id: string
          clave_sat: string | null
          descripcion: string
          id: string
          importe: number
          iva_importe: number | null
          iva_tasa: number | null
          observaciones: string | null
          orden: number
          precio_unitario: number
          unidad_sat: string | null
        }
        Insert: {
          cantidad: number
          cfdi_id: string
          clave_sat?: string | null
          descripcion: string
          id?: string
          importe: number
          iva_importe?: number | null
          iva_tasa?: number | null
          observaciones?: string | null
          orden: number
          precio_unitario: number
          unidad_sat?: string | null
        }
        Update: {
          cantidad?: number
          cfdi_id?: string
          clave_sat?: string | null
          descripcion?: string
          id?: string
          importe?: number
          iva_importe?: number | null
          iva_tasa?: number | null
          observaciones?: string | null
          orden?: number
          precio_unitario?: number
          unidad_sat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfdi_conceptos_cfdi_id_fkey"
            columns: ["cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
        ]
      }
      cfdi_pagos: {
        Row: {
          cfdi_id: string
          cfdi_pagado_id: string
          created_at: string | null
          cuenta_destino: string | null
          cuenta_origen: string | null
          fecha_pago: string
          forma_pago: string | null
          id: string
          moneda: string | null
          monto: number
          num_operacion: string | null
        }
        Insert: {
          cfdi_id: string
          cfdi_pagado_id: string
          created_at?: string | null
          cuenta_destino?: string | null
          cuenta_origen?: string | null
          fecha_pago: string
          forma_pago?: string | null
          id?: string
          moneda?: string | null
          monto: number
          num_operacion?: string | null
        }
        Update: {
          cfdi_id?: string
          cfdi_pagado_id?: string
          created_at?: string | null
          cuenta_destino?: string | null
          cuenta_origen?: string | null
          fecha_pago?: string
          forma_pago?: string | null
          id?: string
          moneda?: string | null
          monto?: number
          num_operacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfdi_pagos_cfdi_id_fkey"
            columns: ["cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfdi_pagos_cfdi_pagado_id_fkey"
            columns: ["cfdi_pagado_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          activo: boolean | null
          ciudad_potencial: string | null
          cp_fiscal: string | null
          created_at: string | null
          cuenta_bancaria: Json | null
          curp: string | null
          direccion_entrega: Json | null
          direccion_fiscal: Json | null
          email_facturacion: string | null
          es_potencial: boolean
          estado: Database["public"]["Enums"]["estado_entidad"]
          estado_modificado_at: string | null
          estado_modificado_por: string | null
          estado_motivo: string | null
          fecha_conversion: string | null
          id: string
          nombre_comercial: string | null
          notas_potencial: string | null
          observaciones: string | null
          razon_social: string
          regimen_fiscal: string | null
          rfc: string | null
          riesgo: string | null
          score_pago: number | null
          score_satisfaccion: number | null
          segmento: string | null
          telefono_potencial: string | null
          tipo: string | null
          updated_at: string | null
          uso_cfdi_default: string | null
        }
        Insert: {
          activo?: boolean | null
          ciudad_potencial?: string | null
          cp_fiscal?: string | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string | null
          direccion_entrega?: Json | null
          direccion_fiscal?: Json | null
          email_facturacion?: string | null
          es_potencial?: boolean
          estado?: Database["public"]["Enums"]["estado_entidad"]
          estado_modificado_at?: string | null
          estado_modificado_por?: string | null
          estado_motivo?: string | null
          fecha_conversion?: string | null
          id?: string
          nombre_comercial?: string | null
          notas_potencial?: string | null
          observaciones?: string | null
          razon_social: string
          regimen_fiscal?: string | null
          rfc?: string | null
          riesgo?: string | null
          score_pago?: number | null
          score_satisfaccion?: number | null
          segmento?: string | null
          telefono_potencial?: string | null
          tipo?: string | null
          updated_at?: string | null
          uso_cfdi_default?: string | null
        }
        Update: {
          activo?: boolean | null
          ciudad_potencial?: string | null
          cp_fiscal?: string | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string | null
          direccion_entrega?: Json | null
          direccion_fiscal?: Json | null
          email_facturacion?: string | null
          es_potencial?: boolean
          estado?: Database["public"]["Enums"]["estado_entidad"]
          estado_modificado_at?: string | null
          estado_modificado_por?: string | null
          estado_motivo?: string | null
          fecha_conversion?: string | null
          id?: string
          nombre_comercial?: string | null
          notas_potencial?: string | null
          observaciones?: string | null
          razon_social?: string
          regimen_fiscal?: string | null
          rfc?: string | null
          riesgo?: string | null
          score_pago?: number | null
          score_satisfaccion?: number | null
          segmento?: string | null
          telefono_potencial?: string | null
          tipo?: string | null
          updated_at?: string | null
          uso_cfdi_default?: string | null
        }
        Relationships: []
      }
      clientes_empresas: {
        Row: {
          activo: boolean | null
          cliente_id: string
          empresa_id: string
          fecha_primera_operacion: string | null
          id: string
          vendedor_asignado_id: string | null
        }
        Insert: {
          activo?: boolean | null
          cliente_id: string
          empresa_id: string
          fecha_primera_operacion?: string | null
          id?: string
          vendedor_asignado_id?: string | null
        }
        Update: {
          activo?: boolean | null
          cliente_id?: string
          empresa_id?: string
          fecha_primera_operacion?: string | null
          id?: string
          vendedor_asignado_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_empresas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_empresa: {
        Row: {
          clave: string
          descripcion: string | null
          empresa_id: string
          id: string
          updated_at: string | null
          updated_by: string | null
          valor: Json
        }
        Insert: {
          clave: string
          descripcion?: string | null
          empresa_id: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          valor: Json
        }
        Update: {
          clave?: string
          descripcion?: string | null
          empresa_id?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          valor?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_grupo: {
        Row: {
          clave: string
          descripcion: string | null
          id: string
          modificable_por_rol: string[] | null
          updated_at: string | null
          updated_by: string | null
          valor: Json
        }
        Insert: {
          clave: string
          descripcion?: string | null
          id?: string
          modificable_por_rol?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          valor: Json
        }
        Update: {
          clave?: string
          descripcion?: string | null
          id?: string
          modificable_por_rol?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          valor?: Json
        }
        Relationships: []
      }
      contactos_cliente: {
        Row: {
          activo: boolean | null
          cliente_id: string
          created_at: string | null
          email: string | null
          es_principal: boolean | null
          id: string
          nombre: string
          puesto: string | null
          telefono: string | null
          tipo: string | null
          whatsapp: string | null
        }
        Insert: {
          activo?: boolean | null
          cliente_id: string
          created_at?: string | null
          email?: string | null
          es_principal?: boolean | null
          id?: string
          nombre: string
          puesto?: string | null
          telefono?: string | null
          tipo?: string | null
          whatsapp?: string | null
        }
        Update: {
          activo?: boolean | null
          cliente_id?: string
          created_at?: string | null
          email?: string | null
          es_principal?: boolean | null
          id?: string
          nombre?: string
          puesto?: string | null
          telefono?: string | null
          tipo?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contactos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      contactos_proveedor: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string | null
          es_principal: boolean | null
          id: string
          nombre: string
          proveedor_id: string
          puesto: string | null
          telefono: string | null
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          es_principal?: boolean | null
          id?: string
          nombre: string
          proveedor_id: string
          puesto?: string | null
          telefono?: string | null
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          es_principal?: boolean | null
          id?: string
          nombre?: string
          proveedor_id?: string
          puesto?: string | null
          telefono?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contactos_proveedor_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contactos_proveedor_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_cliente: {
        Row: {
          cliente_id: string
          cotizacion_id: string | null
          created_at: string | null
          empresa_id: string
          estado: string | null
          fecha_fin: string | null
          fecha_firma: string | null
          fecha_inicio: string | null
          id: string
          metodo_firma: string | null
          monto_total: number | null
          numero: string
          observaciones: string | null
          plan_pagos: Json | null
          proyecto_id: string | null
          tipo: string
          url_pdf_firmado: string | null
        }
        Insert: {
          cliente_id: string
          cotizacion_id?: string | null
          created_at?: string | null
          empresa_id: string
          estado?: string | null
          fecha_fin?: string | null
          fecha_firma?: string | null
          fecha_inicio?: string | null
          id?: string
          metodo_firma?: string | null
          monto_total?: number | null
          numero: string
          observaciones?: string | null
          plan_pagos?: Json | null
          proyecto_id?: string | null
          tipo: string
          url_pdf_firmado?: string | null
        }
        Update: {
          cliente_id?: string
          cotizacion_id?: string | null
          created_at?: string | null
          empresa_id?: string
          estado?: string | null
          fecha_fin?: string | null
          fecha_firma?: string | null
          fecha_inicio?: string | null
          id?: string
          metodo_firma?: string | null
          monto_total?: number | null
          numero?: string
          observaciones?: string | null
          plan_pagos?: Json | null
          proyecto_id?: string | null
          tipo?: string
          url_pdf_firmado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "v_cotizaciones_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_cliente_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      contratos_laborales: {
        Row: {
          activo: boolean | null
          created_at: string | null
          empleado_id: string
          fecha_fin: string | null
          fecha_firma: string | null
          fecha_inicio: string
          id: string
          obra_o_proyecto: string | null
          tipo: string
          url_pdf_firmado: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          empleado_id: string
          fecha_fin?: string | null
          fecha_firma?: string | null
          fecha_inicio: string
          id?: string
          obra_o_proyecto?: string | null
          tipo: string
          url_pdf_firmado?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          empleado_id?: string
          fecha_fin?: string | null
          fecha_firma?: string | null
          fecha_inicio?: string
          id?: string
          obra_o_proyecto?: string | null
          tipo?: string
          url_pdf_firmado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_laborales_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_laborales_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_laborales_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      cotizaciones: {
        Row: {
          aprobada_internamente: boolean | null
          aprobada_por: string | null
          cliente_id: string
          condiciones_pago: string | null
          created_at: string | null
          descuento: number | null
          empresa_id: string
          enviada_a_cliente: boolean | null
          estado: string | null
          fecha_aceptacion: string | null
          fecha_emision: string
          fecha_envio: string | null
          fecha_vencimiento: string | null
          fecha_vista_cliente: string | null
          id: string
          iva: number | null
          notas: string | null
          numero: string
          oportunidad_id: string | null
          origen: string | null
          retenciones: number | null
          subtotal: number | null
          total: number | null
          url_pdf: string | null
          version: number | null
          vigencia_dias: number | null
          vista_por_cliente: boolean | null
        }
        Insert: {
          aprobada_internamente?: boolean | null
          aprobada_por?: string | null
          cliente_id: string
          condiciones_pago?: string | null
          created_at?: string | null
          descuento?: number | null
          empresa_id: string
          enviada_a_cliente?: boolean | null
          estado?: string | null
          fecha_aceptacion?: string | null
          fecha_emision?: string
          fecha_envio?: string | null
          fecha_vencimiento?: string | null
          fecha_vista_cliente?: string | null
          id?: string
          iva?: number | null
          notas?: string | null
          numero: string
          oportunidad_id?: string | null
          origen?: string | null
          retenciones?: number | null
          subtotal?: number | null
          total?: number | null
          url_pdf?: string | null
          version?: number | null
          vigencia_dias?: number | null
          vista_por_cliente?: boolean | null
        }
        Update: {
          aprobada_internamente?: boolean | null
          aprobada_por?: string | null
          cliente_id?: string
          condiciones_pago?: string | null
          created_at?: string | null
          descuento?: number | null
          empresa_id?: string
          enviada_a_cliente?: boolean | null
          estado?: string | null
          fecha_aceptacion?: string | null
          fecha_emision?: string
          fecha_envio?: string | null
          fecha_vencimiento?: string | null
          fecha_vista_cliente?: string | null
          id?: string
          iva?: number | null
          notas?: string | null
          numero?: string
          oportunidad_id?: string | null
          origen?: string | null
          retenciones?: number | null
          subtotal?: number | null
          total?: number | null
          url_pdf?: string | null
          version?: number | null
          vigencia_dias?: number | null
          vista_por_cliente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      cotizaciones_conceptos: {
        Row: {
          cantidad: number
          clave_sat: string | null
          cotizacion_id: string
          created_at: string | null
          descripcion: string
          descuento: number | null
          id: string
          importe: number
          iva_tasa: number | null
          observaciones: string | null
          orden: number
          precio_unitario: number
          unidad_sat: string | null
        }
        Insert: {
          cantidad: number
          clave_sat?: string | null
          cotizacion_id: string
          created_at?: string | null
          descripcion: string
          descuento?: number | null
          id?: string
          importe: number
          iva_tasa?: number | null
          observaciones?: string | null
          orden: number
          precio_unitario: number
          unidad_sat?: string | null
        }
        Update: {
          cantidad?: number
          clave_sat?: string | null
          cotizacion_id?: string
          created_at?: string | null
          descripcion?: string
          descuento?: number | null
          id?: string
          importe?: number
          iva_tasa?: number | null
          observaciones?: string | null
          orden?: number
          precio_unitario?: number
          unidad_sat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_conceptos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_conceptos_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "v_cotizaciones_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      dossier_documentos: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          es_compartible_cliente: boolean | null
          id: string
          nombre: string
          observaciones: string | null
          proyecto_id: string
          seccion: string
          subido_por: string | null
          url_archivo: string
          version: number | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          es_compartible_cliente?: boolean | null
          id?: string
          nombre: string
          observaciones?: string | null
          proyecto_id: string
          seccion: string
          subido_por?: string | null
          url_archivo: string
          version?: number | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          es_compartible_cliente?: boolean | null
          id?: string
          nombre?: string
          observaciones?: string | null
          proyecto_id?: string
          seccion?: string
          subido_por?: string | null
          url_archivo?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dossier_documentos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dossier_documentos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      ema_acreditaciones: {
        Row: {
          activa: boolean | null
          created_at: string | null
          empresa_id: string
          estado: string | null
          estandar_acreditado: string | null
          fecha_inicio: string | null
          fecha_vencimiento: string | null
          id: string
          numero_acreditacion: string | null
          observaciones: string | null
          proxima_auditoria: string | null
          tipo: string | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          empresa_id: string
          estado?: string | null
          estandar_acreditado?: string | null
          fecha_inicio?: string | null
          fecha_vencimiento?: string | null
          id?: string
          numero_acreditacion?: string | null
          observaciones?: string | null
          proxima_auditoria?: string | null
          tipo?: string | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          empresa_id?: string
          estado?: string | null
          estandar_acreditado?: string | null
          fecha_inicio?: string | null
          fecha_vencimiento?: string | null
          id?: string
          numero_acreditacion?: string | null
          observaciones?: string | null
          proxima_auditoria?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ema_acreditaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ema_certificaciones_emitidas: {
        Row: {
          acreditacion_id: string
          candidato_curp: string | null
          candidato_nombre: string
          ce_externo_id: string | null
          cfdi_id: string | null
          cliente_pagador_id: string | null
          created_at: string | null
          ei_externo_id: string | null
          estandar: string
          fecha_dictamen: string | null
          fecha_evaluacion: string | null
          id: string
          numero_certificado: string | null
          observaciones: string | null
          resultado: string | null
          vigencia_fin: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          acreditacion_id: string
          candidato_curp?: string | null
          candidato_nombre: string
          ce_externo_id?: string | null
          cfdi_id?: string | null
          cliente_pagador_id?: string | null
          created_at?: string | null
          ei_externo_id?: string | null
          estandar: string
          fecha_dictamen?: string | null
          fecha_evaluacion?: string | null
          id?: string
          numero_certificado?: string | null
          observaciones?: string | null
          resultado?: string | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          acreditacion_id?: string
          candidato_curp?: string | null
          candidato_nombre?: string
          ce_externo_id?: string | null
          cfdi_id?: string | null
          cliente_pagador_id?: string | null
          created_at?: string | null
          ei_externo_id?: string | null
          estandar?: string
          fecha_dictamen?: string | null
          fecha_evaluacion?: string | null
          id?: string
          numero_certificado?: string | null
          observaciones?: string | null
          resultado?: string | null
          vigencia_fin?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ema_certificaciones_emitidas_acreditacion_id_fkey"
            columns: ["acreditacion_id"]
            isOneToOne: false
            referencedRelation: "ema_acreditaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_certificaciones_emitidas_ce_externo_id_fkey"
            columns: ["ce_externo_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_certificaciones_emitidas_ce_externo_id_fkey"
            columns: ["ce_externo_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_certificaciones_emitidas_cfdi_id_fkey"
            columns: ["cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_certificaciones_emitidas_cliente_pagador_id_fkey"
            columns: ["cliente_pagador_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_certificaciones_emitidas_cliente_pagador_id_fkey"
            columns: ["cliente_pagador_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_certificaciones_emitidas_ei_externo_id_fkey"
            columns: ["ei_externo_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_certificaciones_emitidas_ei_externo_id_fkey"
            columns: ["ei_externo_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      ema_dictamenes_uvie: {
        Row: {
          acreditacion_id: string
          capacidad_kva: number | null
          cfdi_id: string | null
          cliente_id: string
          created_at: string | null
          enviado_cfe: boolean | null
          fecha_dictamen: string | null
          fecha_envio_cfe: string | null
          fecha_inspeccion: string | null
          id: string
          inspector_id: string | null
          numero_dictamen: string
          observaciones: string | null
          proyecto_id: string | null
          resultado: string | null
          tipo_instalacion: string | null
          ubicacion: Json | null
          url_dictamen: string | null
        }
        Insert: {
          acreditacion_id: string
          capacidad_kva?: number | null
          cfdi_id?: string | null
          cliente_id: string
          created_at?: string | null
          enviado_cfe?: boolean | null
          fecha_dictamen?: string | null
          fecha_envio_cfe?: string | null
          fecha_inspeccion?: string | null
          id?: string
          inspector_id?: string | null
          numero_dictamen: string
          observaciones?: string | null
          proyecto_id?: string | null
          resultado?: string | null
          tipo_instalacion?: string | null
          ubicacion?: Json | null
          url_dictamen?: string | null
        }
        Update: {
          acreditacion_id?: string
          capacidad_kva?: number | null
          cfdi_id?: string | null
          cliente_id?: string
          created_at?: string | null
          enviado_cfe?: boolean | null
          fecha_dictamen?: string | null
          fecha_envio_cfe?: string | null
          fecha_inspeccion?: string | null
          id?: string
          inspector_id?: string | null
          numero_dictamen?: string
          observaciones?: string | null
          proyecto_id?: string | null
          resultado?: string | null
          tipo_instalacion?: string | null
          ubicacion?: Json | null
          url_dictamen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ema_dictamenes_uvie_acreditacion_id_fkey"
            columns: ["acreditacion_id"]
            isOneToOne: false
            referencedRelation: "ema_acreditaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_dictamenes_uvie_cfdi_id_fkey"
            columns: ["cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_dictamenes_uvie_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_dictamenes_uvie_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_dictamenes_uvie_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ema_dictamenes_uvie_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      empleados: {
        Row: {
          activo: boolean | null
          area: string | null
          categoria: Database["public"]["Enums"]["categoria_personal"]
          contacto_emergencia: Json | null
          created_at: string | null
          cuenta_bancaria: Json | null
          curp: string
          domicilio: Json | null
          email_personal: string | null
          empresa_id: string
          estado_civil: string | null
          fecha_baja: string | null
          fecha_ingreso: string
          fecha_nacimiento: string | null
          folio_repse: string | null
          genero: string | null
          id: string
          jefe_directo_id: string | null
          motivo_baja: string | null
          nombre_completo: string
          nss: string | null
          numero_empleado: string
          observaciones: string | null
          prestaciones: Json | null
          puesto: string
          rfc: string | null
          salario_base: number | null
          telefono: string | null
          updated_at: string | null
          usuario_id: string | null
          vigencia_repse_hasta: string | null
          whatsapp: string | null
        }
        Insert: {
          activo?: boolean | null
          area?: string | null
          categoria: Database["public"]["Enums"]["categoria_personal"]
          contacto_emergencia?: Json | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp: string
          domicilio?: Json | null
          email_personal?: string | null
          empresa_id: string
          estado_civil?: string | null
          fecha_baja?: string | null
          fecha_ingreso: string
          fecha_nacimiento?: string | null
          folio_repse?: string | null
          genero?: string | null
          id?: string
          jefe_directo_id?: string | null
          motivo_baja?: string | null
          nombre_completo: string
          nss?: string | null
          numero_empleado: string
          observaciones?: string | null
          prestaciones?: Json | null
          puesto: string
          rfc?: string | null
          salario_base?: number | null
          telefono?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          vigencia_repse_hasta?: string | null
          whatsapp?: string | null
        }
        Update: {
          activo?: boolean | null
          area?: string | null
          categoria?: Database["public"]["Enums"]["categoria_personal"]
          contacto_emergencia?: Json | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string
          domicilio?: Json | null
          email_personal?: string | null
          empresa_id?: string
          estado_civil?: string | null
          fecha_baja?: string | null
          fecha_ingreso?: string
          fecha_nacimiento?: string | null
          folio_repse?: string | null
          genero?: string | null
          id?: string
          jefe_directo_id?: string | null
          motivo_baja?: string | null
          nombre_completo?: string
          nss?: string | null
          numero_empleado?: string
          observaciones?: string | null
          prestaciones?: Json | null
          puesto?: string
          rfc?: string | null
          salario_base?: number | null
          telefono?: string | null
          updated_at?: string | null
          usuario_id?: string | null
          vigencia_repse_hasta?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_jefe_directo_id_fkey"
            columns: ["jefe_directo_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_jefe_directo_id_fkey"
            columns: ["jefe_directo_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_jefe_directo_id_fkey"
            columns: ["jefe_directo_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      empleados_capacitaciones: {
        Row: {
          calificacion_post: number | null
          calificacion_pre: number | null
          capacitacion_id: string
          created_at: string | null
          empleado_id: string
          estado: Database["public"]["Enums"]["estado_capacitacion"] | null
          fecha_evaluacion_eficacia: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_programada: string | null
          fecha_vencimiento: string | null
          id: string
          resultado_eficacia: string | null
          url_constancia: string | null
        }
        Insert: {
          calificacion_post?: number | null
          calificacion_pre?: number | null
          capacitacion_id: string
          created_at?: string | null
          empleado_id: string
          estado?: Database["public"]["Enums"]["estado_capacitacion"] | null
          fecha_evaluacion_eficacia?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_programada?: string | null
          fecha_vencimiento?: string | null
          id?: string
          resultado_eficacia?: string | null
          url_constancia?: string | null
        }
        Update: {
          calificacion_post?: number | null
          calificacion_pre?: number | null
          capacitacion_id?: string
          created_at?: string | null
          empleado_id?: string
          estado?: Database["public"]["Enums"]["estado_capacitacion"] | null
          fecha_evaluacion_eficacia?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_programada?: string | null
          fecha_vencimiento?: string | null
          id?: string
          resultado_eficacia?: string | null
          url_constancia?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_capacitaciones_capacitacion_id_fkey"
            columns: ["capacitacion_id"]
            isOneToOne: false
            referencedRelation: "capacitaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_capacitaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_capacitaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_capacitaciones_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      empleados_documentos: {
        Row: {
          created_at: string | null
          empleado_id: string
          fecha_emision: string | null
          fecha_vencimiento: string | null
          id: string
          nombre_archivo: string
          observaciones: string | null
          subido_por: string | null
          tipo: string
          url_storage: string
        }
        Insert: {
          created_at?: string | null
          empleado_id: string
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          nombre_archivo: string
          observaciones?: string | null
          subido_por?: string | null
          tipo: string
          url_storage: string
        }
        Update: {
          created_at?: string | null
          empleado_id?: string
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          nombre_archivo?: string
          observaciones?: string | null
          subido_por?: string | null
          tipo?: string
          url_storage?: string
        }
        Relationships: [
          {
            foreignKeyName: "empleados_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empleados_documentos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      empresas: {
        Row: {
          activa: boolean | null
          codigo: string
          configuracion: Json | null
          cp_fiscal: string
          created_at: string | null
          curp: string | null
          curp_representante: string | null
          direccion_fiscal: Json | null
          id: string
          identidad_visual: Json | null
          nombre_comercial: string | null
          razon_social: string
          regimen_fiscal: string
          representante_legal: string | null
          rfc: string
          rfc_representante: string | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          codigo: string
          configuracion?: Json | null
          cp_fiscal: string
          created_at?: string | null
          curp?: string | null
          curp_representante?: string | null
          direccion_fiscal?: Json | null
          id?: string
          identidad_visual?: Json | null
          nombre_comercial?: string | null
          razon_social: string
          regimen_fiscal: string
          representante_legal?: string | null
          rfc: string
          rfc_representante?: string | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          codigo?: string
          configuracion?: Json | null
          cp_fiscal?: string
          created_at?: string | null
          curp?: string | null
          curp_representante?: string | null
          direccion_fiscal?: Json | null
          id?: string
          identidad_visual?: Json | null
          nombre_comercial?: string | null
          razon_social?: string
          regimen_fiscal?: string
          representante_legal?: string | null
          rfc?: string
          rfc_representante?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      encuestas_satisfaccion: {
        Row: {
          cliente_id: string
          created_at: string | null
          enviada_a: string | null
          fecha_envio: string | null
          fecha_respuesta: string | null
          id: string
          nps: number | null
          proyecto_id: string | null
          respuestas: Json | null
          satisfaccion: number | null
          ticket_id: string | null
          tipo: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          enviada_a?: string | null
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          id?: string
          nps?: number | null
          proyecto_id?: string | null
          respuestas?: Json | null
          satisfaccion?: number | null
          ticket_id?: string | null
          tipo?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          enviada_a?: string | null
          fecha_envio?: string | null
          fecha_respuesta?: string | null
          id?: string
          nps?: number | null
          proyecto_id?: string | null
          respuestas?: Json | null
          satisfaccion?: number | null
          ticket_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "encuestas_satisfaccion_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "encuestas_satisfaccion_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_soporte"
            referencedColumns: ["id"]
          },
        ]
      }
      estados_cuenta_bancarios: {
        Row: {
          created_at: string | null
          cuenta_id: string
          empresa_id: string
          formato: string
          id: string
          movimientos_cargados: number | null
          num_abonos: number | null
          num_cargos: number | null
          observaciones: string | null
          periodo_fin: string
          periodo_inicio: string
          saldo_final: number
          saldo_inicial: number | null
          subido_por: string | null
          total_abonos: number | null
          total_cargos: number | null
          url_archivo: string | null
        }
        Insert: {
          created_at?: string | null
          cuenta_id: string
          empresa_id: string
          formato: string
          id?: string
          movimientos_cargados?: number | null
          num_abonos?: number | null
          num_cargos?: number | null
          observaciones?: string | null
          periodo_fin: string
          periodo_inicio: string
          saldo_final: number
          saldo_inicial?: number | null
          subido_por?: string | null
          total_abonos?: number | null
          total_cargos?: number | null
          url_archivo?: string | null
        }
        Update: {
          created_at?: string | null
          cuenta_id?: string
          empresa_id?: string
          formato?: string
          id?: string
          movimientos_cargados?: number | null
          num_abonos?: number | null
          num_cargos?: number | null
          observaciones?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          saldo_final?: number
          saldo_inicial?: number | null
          subido_por?: string | null
          total_abonos?: number | null
          total_cargos?: number | null
          url_archivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estados_cuenta_bancarios_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "bancos_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estados_cuenta_bancarios_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_bancos_cuentas_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estados_cuenta_bancarios_cuenta_id_fkey"
            columns: ["cuenta_id"]
            isOneToOne: false
            referencedRelation: "v_conciliacion_mensual"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "estados_cuenta_bancarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      estados_financieros_mensuales: {
        Row: {
          anio: number
          created_at: string | null
          documentos: Json
          egresos_totales: number | null
          empresa_id: string
          firmados: boolean | null
          flujo_efectivo: number | null
          id: string
          ingresos_totales: number | null
          iva_acreditable: number | null
          iva_trasladado: number | null
          mes: number
          num_documentos: number
          observaciones: string | null
          paquete_completo: boolean | null
          subido_por: string | null
          total_size_bytes: number | null
          updated_at: string | null
          utilidad_neta: number | null
        }
        Insert: {
          anio: number
          created_at?: string | null
          documentos?: Json
          egresos_totales?: number | null
          empresa_id: string
          firmados?: boolean | null
          flujo_efectivo?: number | null
          id?: string
          ingresos_totales?: number | null
          iva_acreditable?: number | null
          iva_trasladado?: number | null
          mes: number
          num_documentos?: number
          observaciones?: string | null
          paquete_completo?: boolean | null
          subido_por?: string | null
          total_size_bytes?: number | null
          updated_at?: string | null
          utilidad_neta?: number | null
        }
        Update: {
          anio?: number
          created_at?: string | null
          documentos?: Json
          egresos_totales?: number | null
          empresa_id?: string
          firmados?: boolean | null
          flujo_efectivo?: number | null
          id?: string
          ingresos_totales?: number | null
          iva_acreditable?: number | null
          iva_trasladado?: number | null
          mes?: number
          num_documentos?: number
          observaciones?: string | null
          paquete_completo?: boolean | null
          subido_por?: string | null
          total_size_bytes?: number | null
          updated_at?: string | null
          utilidad_neta?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estados_financieros_mensuales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluaciones_desempeno: {
        Row: {
          areas_oportunidad: string | null
          calificacion_total: number | null
          comentarios_empleado: string | null
          created_at: string | null
          criterios: Json | null
          empleado_id: string
          evaluador_id: string
          fecha_completada: string | null
          fortalezas: string | null
          id: string
          periodo_fin: string
          periodo_inicio: string
          plan_desarrollo: string | null
        }
        Insert: {
          areas_oportunidad?: string | null
          calificacion_total?: number | null
          comentarios_empleado?: string | null
          created_at?: string | null
          criterios?: Json | null
          empleado_id: string
          evaluador_id: string
          fecha_completada?: string | null
          fortalezas?: string | null
          id?: string
          periodo_fin: string
          periodo_inicio: string
          plan_desarrollo?: string | null
        }
        Update: {
          areas_oportunidad?: string | null
          calificacion_total?: number | null
          comentarios_empleado?: string | null
          created_at?: string | null
          criterios?: Json | null
          empleado_id?: string
          evaluador_id?: string
          fecha_completada?: string | null
          fortalezas?: string | null
          id?: string
          periodo_fin?: string
          periodo_inicio?: string
          plan_desarrollo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluaciones_desempeno_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_desempeno_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluaciones_desempeno_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      eventos_uso: {
        Row: {
          created_at: string | null
          detalle: Json | null
          empresa_id: string | null
          id: string
          pagina: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          detalle?: Json | null
          empresa_id?: string | null
          id?: string
          pagina?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          detalle?: Json | null
          empresa_id?: string | null
          id?: string
          pagina?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_uso_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      finiquitos: {
        Row: {
          aprobado_por: string | null
          camino_cierre: string | null
          conceptos: Json | null
          created_at: string | null
          empleado_id: string
          estado: string | null
          fecha_baja: string
          fecha_pago: string | null
          id: string
          motivo_baja: string
          observaciones: string | null
          total_neto: number
          url_convenio_terminacion: string | null
          url_recibo_finiquito: string | null
        }
        Insert: {
          aprobado_por?: string | null
          camino_cierre?: string | null
          conceptos?: Json | null
          created_at?: string | null
          empleado_id: string
          estado?: string | null
          fecha_baja: string
          fecha_pago?: string | null
          id?: string
          motivo_baja: string
          observaciones?: string | null
          total_neto: number
          url_convenio_terminacion?: string | null
          url_recibo_finiquito?: string | null
        }
        Update: {
          aprobado_por?: string | null
          camino_cierre?: string | null
          conceptos?: Json | null
          created_at?: string | null
          empleado_id?: string
          estado?: string | null
          fecha_baja?: string
          fecha_pago?: string | null
          id?: string
          motivo_baja?: string
          observaciones?: string | null
          total_neto?: number
          url_convenio_terminacion?: string | null
          url_recibo_finiquito?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finiquitos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finiquitos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finiquitos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      fotos_obra: {
        Row: {
          bitacora_id: string | null
          capturado_en: string
          capturado_por: string
          compartible_con_cliente: boolean | null
          created_at: string | null
          descripcion: string | null
          etapa: string | null
          etiquetas: string[] | null
          id: string
          proyecto_id: string
          ubicacion: Json | null
          url_archivo: string
          url_thumbnail: string | null
        }
        Insert: {
          bitacora_id?: string | null
          capturado_en?: string
          capturado_por: string
          compartible_con_cliente?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          etapa?: string | null
          etiquetas?: string[] | null
          id?: string
          proyecto_id: string
          ubicacion?: Json | null
          url_archivo: string
          url_thumbnail?: string | null
        }
        Update: {
          bitacora_id?: string | null
          capturado_en?: string
          capturado_por?: string
          compartible_con_cliente?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          etapa?: string | null
          etiquetas?: string[] | null
          id?: string
          proyecto_id?: string
          ubicacion?: Json | null
          url_archivo?: string
          url_thumbnail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fotos_obra_bitacora_id_fkey"
            columns: ["bitacora_id"]
            isOneToOne: false
            referencedRelation: "bitacoras_obra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_obra_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fotos_obra_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      gastos_recurrentes: {
        Row: {
          activo: boolean | null
          capturado_por: string | null
          categoria: Database["public"]["Enums"]["categoria_gasto_recurrente"]
          cfdi_relacionado_id: string | null
          contrato_url: string | null
          created_at: string | null
          descripcion: string
          dia_pago: number | null
          empresa_id: string
          fecha_fin: string | null
          fecha_inicio: string
          frecuencia: Database["public"]["Enums"]["frecuencia_gasto"]
          id: string
          identificador: string | null
          iva_incluido: boolean | null
          moneda: string
          monto: number
          observaciones: string | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          capturado_por?: string | null
          categoria: Database["public"]["Enums"]["categoria_gasto_recurrente"]
          cfdi_relacionado_id?: string | null
          contrato_url?: string | null
          created_at?: string | null
          descripcion: string
          dia_pago?: number | null
          empresa_id: string
          fecha_fin?: string | null
          fecha_inicio?: string
          frecuencia?: Database["public"]["Enums"]["frecuencia_gasto"]
          id?: string
          identificador?: string | null
          iva_incluido?: boolean | null
          moneda?: string
          monto: number
          observaciones?: string | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          capturado_por?: string | null
          categoria?: Database["public"]["Enums"]["categoria_gasto_recurrente"]
          cfdi_relacionado_id?: string | null
          contrato_url?: string | null
          created_at?: string | null
          descripcion?: string
          dia_pago?: number | null
          empresa_id?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          frecuencia?: Database["public"]["Enums"]["frecuencia_gasto"]
          id?: string
          identificador?: string | null
          iva_incluido?: boolean | null
          moneda?: string
          monto?: number
          observaciones?: string | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_recurrentes_cfdi_relacionado_id_fkey"
            columns: ["cfdi_relacionado_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_recurrentes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_recurrentes_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_recurrentes_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_cache: {
        Row: {
          fecha_creacion: string | null
          fecha_expiracion: string | null
          fecha_ultimo_hit: string | null
          hash_input: string
          hits: number | null
          id: string
          resultado: Json
          tarea: string
        }
        Insert: {
          fecha_creacion?: string | null
          fecha_expiracion?: string | null
          fecha_ultimo_hit?: string | null
          hash_input: string
          hits?: number | null
          id?: string
          resultado: Json
          tarea: string
        }
        Update: {
          fecha_creacion?: string | null
          fecha_expiracion?: string | null
          fecha_ultimo_hit?: string | null
          hash_input?: string
          hits?: number | null
          id?: string
          resultado?: Json
          tarea?: string
        }
        Relationships: []
      }
      ia_configuracion_autonomia: {
        Row: {
          configurado_por: string | null
          costo_max_por_invocacion_usd: number | null
          empresa_id: string | null
          id: string
          modelo_preferido: string | null
          modulo: string
          nivel_autonomia:
            | Database["public"]["Enums"]["nivel_autonomia_ia"]
            | null
          observaciones: string | null
          tarea: string
          updated_at: string | null
        }
        Insert: {
          configurado_por?: string | null
          costo_max_por_invocacion_usd?: number | null
          empresa_id?: string | null
          id?: string
          modelo_preferido?: string | null
          modulo: string
          nivel_autonomia?:
            | Database["public"]["Enums"]["nivel_autonomia_ia"]
            | null
          observaciones?: string | null
          tarea: string
          updated_at?: string | null
        }
        Update: {
          configurado_por?: string | null
          costo_max_por_invocacion_usd?: number | null
          empresa_id?: string | null
          id?: string
          modelo_preferido?: string | null
          modulo?: string
          nivel_autonomia?:
            | Database["public"]["Enums"]["nivel_autonomia_ia"]
            | null
          observaciones?: string | null
          tarea?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_configuracion_autonomia_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_costos_acumulados: {
        Row: {
          cache_hit_rate: number | null
          costo_mxn: number | null
          costo_usd: number | null
          empresa_id: string | null
          id: string
          invocaciones: number | null
          modulo: string | null
          periodo: string
          tokens_total: number | null
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          cache_hit_rate?: number | null
          costo_mxn?: number | null
          costo_usd?: number | null
          empresa_id?: string | null
          id?: string
          invocaciones?: number | null
          modulo?: string | null
          periodo: string
          tokens_total?: number | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          cache_hit_rate?: number | null
          costo_mxn?: number | null
          costo_usd?: number | null
          empresa_id?: string | null
          id?: string
          invocaciones?: number | null
          modulo?: string | null
          periodo?: string
          tokens_total?: number | null
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_costos_acumulados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ia_invocaciones: {
        Row: {
          confidence_score: number | null
          contexto_input: Json | null
          costo_mxn: number | null
          costo_usd: number | null
          created_at: string | null
          duracion_ms: number | null
          ejecutada: boolean | null
          empresa_id: string | null
          id: string
          modelo_usado: string | null
          modulo: string | null
          nivel_autonomia:
            | Database["public"]["Enums"]["nivel_autonomia_ia"]
            | null
          prompt_template: string | null
          resultado_output: Json | null
          tarea: string | null
          tipo_cache: string | null
          tokens_input: number | null
          tokens_output: number | null
          usuario_id: string | null
          validada_por: string | null
        }
        Insert: {
          confidence_score?: number | null
          contexto_input?: Json | null
          costo_mxn?: number | null
          costo_usd?: number | null
          created_at?: string | null
          duracion_ms?: number | null
          ejecutada?: boolean | null
          empresa_id?: string | null
          id?: string
          modelo_usado?: string | null
          modulo?: string | null
          nivel_autonomia?:
            | Database["public"]["Enums"]["nivel_autonomia_ia"]
            | null
          prompt_template?: string | null
          resultado_output?: Json | null
          tarea?: string | null
          tipo_cache?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          usuario_id?: string | null
          validada_por?: string | null
        }
        Update: {
          confidence_score?: number | null
          contexto_input?: Json | null
          costo_mxn?: number | null
          costo_usd?: number | null
          created_at?: string | null
          duracion_ms?: number | null
          ejecutada?: boolean | null
          empresa_id?: string | null
          id?: string
          modelo_usado?: string | null
          modulo?: string | null
          nivel_autonomia?:
            | Database["public"]["Enums"]["nivel_autonomia_ia"]
            | null
          prompt_template?: string | null
          resultado_output?: Json | null
          tarea?: string | null
          tipo_cache?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          usuario_id?: string | null
          validada_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ia_invocaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      inventario: {
        Row: {
          almacen_id: string
          id: string
          producto_id: string
          stock: number | null
          stock_disponible: number | null
          stock_reservado: number | null
          ubicacion_fisica: string | null
          ultima_entrada: string | null
          ultima_salida: string | null
          updated_at: string | null
        }
        Insert: {
          almacen_id: string
          id?: string
          producto_id: string
          stock?: number | null
          stock_disponible?: number | null
          stock_reservado?: number | null
          ubicacion_fisica?: string | null
          ultima_entrada?: string | null
          ultima_salida?: string | null
          updated_at?: string | null
        }
        Update: {
          almacen_id?: string
          id?: string
          producto_id?: string
          stock?: number | null
          stock_disponible?: number | null
          stock_reservado?: number | null
          ubicacion_fisica?: string | null
          ultima_entrada?: string | null
          ultima_salida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventario_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_stock"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      inventario_movimientos: {
        Row: {
          almacen_destino_id: string | null
          almacen_id: string
          autorizado_por: string | null
          cantidad: number
          capturado_por: string
          capturado_por_nombre: string | null
          cfdi_id: string | null
          costo_unitario: number | null
          created_at: string | null
          empresa_id: string | null
          fecha: string | null
          id: string
          monto_total: number | null
          motivo: string | null
          movimiento_relacionado_id: string | null
          numero_documento: string | null
          observaciones: string | null
          oc_id: string | null
          producto_id: string
          proveedor_id: string | null
          proyecto_id: string | null
          serie_id: string | null
          tipo: string
        }
        Insert: {
          almacen_destino_id?: string | null
          almacen_id: string
          autorizado_por?: string | null
          cantidad: number
          capturado_por: string
          capturado_por_nombre?: string | null
          cfdi_id?: string | null
          costo_unitario?: number | null
          created_at?: string | null
          empresa_id?: string | null
          fecha?: string | null
          id?: string
          monto_total?: number | null
          motivo?: string | null
          movimiento_relacionado_id?: string | null
          numero_documento?: string | null
          observaciones?: string | null
          oc_id?: string | null
          producto_id: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          serie_id?: string | null
          tipo: string
        }
        Update: {
          almacen_destino_id?: string | null
          almacen_id?: string
          autorizado_por?: string | null
          cantidad?: number
          capturado_por?: string
          capturado_por_nombre?: string | null
          cfdi_id?: string | null
          costo_unitario?: number | null
          created_at?: string | null
          empresa_id?: string | null
          fecha?: string | null
          id?: string
          monto_total?: number | null
          motivo?: string | null
          movimiento_relacionado_id?: string | null
          numero_documento?: string | null
          observaciones?: string | null
          oc_id?: string | null
          producto_id?: string
          proveedor_id?: string | null
          proyecto_id?: string | null
          serie_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventario_movimientos_almacen_destino_id_fkey"
            columns: ["almacen_destino_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_cfdi_id_fkey"
            columns: ["cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_movimiento_relacionado_id_fkey"
            columns: ["movimiento_relacionado_id"]
            isOneToOne: false
            referencedRelation: "inventario_movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_movimiento_relacionado_id_fkey"
            columns: ["movimiento_relacionado_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_stock"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_movimientos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "inventario_movimientos_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "productos_serie"
            referencedColumns: ["id"]
          },
        ]
      }
      lineas_credito_inter_co: {
        Row: {
          activa: boolean | null
          capitaliza_intereses: boolean | null
          created_at: string | null
          dia_corte: number | null
          empresa_acreedora_id: string
          empresa_deudora_id: string
          id: string
          monto_autorizado: number
          monto_disponible: number | null
          monto_utilizado: number | null
          observaciones: string | null
          spread: number | null
          tasa_base: string | null
          vigencia_fin: string
          vigencia_inicio: string
        }
        Insert: {
          activa?: boolean | null
          capitaliza_intereses?: boolean | null
          created_at?: string | null
          dia_corte?: number | null
          empresa_acreedora_id: string
          empresa_deudora_id: string
          id?: string
          monto_autorizado: number
          monto_disponible?: number | null
          monto_utilizado?: number | null
          observaciones?: string | null
          spread?: number | null
          tasa_base?: string | null
          vigencia_fin: string
          vigencia_inicio: string
        }
        Update: {
          activa?: boolean | null
          capitaliza_intereses?: boolean | null
          created_at?: string | null
          dia_corte?: number | null
          empresa_acreedora_id?: string
          empresa_deudora_id?: string
          id?: string
          monto_autorizado?: number
          monto_disponible?: number | null
          monto_utilizado?: number | null
          observaciones?: string | null
          spread?: number | null
          tasa_base?: string | null
          vigencia_fin?: string
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineas_credito_inter_co_empresa_acreedora_id_fkey"
            columns: ["empresa_acreedora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineas_credito_inter_co_empresa_deudora_id_fkey"
            columns: ["empresa_deudora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      mediciones_ejecuciones: {
        Row: {
          created_at: string | null
          ejecutado_por: string
          fecha_ejecucion: string
          firma_cliente: string | null
          id: string
          observaciones: string | null
          protocolo_id: string
          proyecto_id: string
          resultado_global: string | null
          resultados: Json | null
          testigo_cliente: string | null
          url_reporte_pdf: string | null
        }
        Insert: {
          created_at?: string | null
          ejecutado_por: string
          fecha_ejecucion?: string
          firma_cliente?: string | null
          id?: string
          observaciones?: string | null
          protocolo_id: string
          proyecto_id: string
          resultado_global?: string | null
          resultados?: Json | null
          testigo_cliente?: string | null
          url_reporte_pdf?: string | null
        }
        Update: {
          created_at?: string | null
          ejecutado_por?: string
          fecha_ejecucion?: string
          firma_cliente?: string | null
          id?: string
          observaciones?: string | null
          protocolo_id?: string
          proyecto_id?: string
          resultado_global?: string | null
          resultados?: Json | null
          testigo_cliente?: string | null
          url_reporte_pdf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mediciones_ejecuciones_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "mediciones_protocolos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mediciones_ejecuciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mediciones_ejecuciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      mediciones_protocolos: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          criterios_aprobacion: Json | null
          descripcion: string | null
          equipos_requeridos: Json | null
          id: string
          nombre: string
          norma_aplicable: string | null
          pasos: Json | null
          tipo_proyecto: string[] | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          criterios_aprobacion?: Json | null
          descripcion?: string | null
          equipos_requeridos?: Json | null
          id?: string
          nombre: string
          norma_aplicable?: string | null
          pasos?: Json | null
          tipo_proyecto?: string[] | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          criterios_aprobacion?: Json | null
          descripcion?: string | null
          equipos_requeridos?: Json | null
          id?: string
          nombre?: string
          norma_aplicable?: string | null
          pasos?: Json | null
          tipo_proyecto?: string[] | null
        }
        Relationships: []
      }
      no_conformidades: {
        Row: {
          causa_raiz: string | null
          cerrado_por: string | null
          created_at: string | null
          descripcion: string
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_no_conformidad"] | null
          evidencia: Json | null
          fecha_cierre: string | null
          fecha_compromiso_cierre: string | null
          fecha_deteccion: string
          id: string
          numero: string
          observaciones: string | null
          origen: string | null
          origen_id: string | null
          proceso_id: string | null
          responsable_id: string
          severidad:
            | Database["public"]["Enums"]["severidad_no_conformidad"]
            | null
          verificacion_eficacia: Json | null
        }
        Insert: {
          causa_raiz?: string | null
          cerrado_por?: string | null
          created_at?: string | null
          descripcion: string
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_no_conformidad"] | null
          evidencia?: Json | null
          fecha_cierre?: string | null
          fecha_compromiso_cierre?: string | null
          fecha_deteccion?: string
          id?: string
          numero: string
          observaciones?: string | null
          origen?: string | null
          origen_id?: string | null
          proceso_id?: string | null
          responsable_id: string
          severidad?:
            | Database["public"]["Enums"]["severidad_no_conformidad"]
            | null
          verificacion_eficacia?: Json | null
        }
        Update: {
          causa_raiz?: string | null
          cerrado_por?: string | null
          created_at?: string | null
          descripcion?: string
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_no_conformidad"] | null
          evidencia?: Json | null
          fecha_cierre?: string | null
          fecha_compromiso_cierre?: string | null
          fecha_deteccion?: string
          id?: string
          numero?: string
          observaciones?: string | null
          origen?: string | null
          origen_id?: string | null
          proceso_id?: string | null
          responsable_id?: string
          severidad?:
            | Database["public"]["Enums"]["severidad_no_conformidad"]
            | null
          verificacion_eficacia?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "no_conformidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_conformidades_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "sgc_procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      no_conformidades_acciones: {
        Row: {
          created_at: string | null
          descripcion: string
          estado: string | null
          evidencia_implementacion: string | null
          fecha_compromiso: string | null
          fecha_implementacion: string | null
          id: string
          no_conformidad_id: string
          responsable_id: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          estado?: string | null
          evidencia_implementacion?: string | null
          fecha_compromiso?: string | null
          fecha_implementacion?: string | null
          id?: string
          no_conformidad_id: string
          responsable_id: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          estado?: string | null
          evidencia_implementacion?: string | null
          fecha_compromiso?: string | null
          fecha_implementacion?: string | null
          id?: string
          no_conformidad_id?: string
          responsable_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_conformidades_acciones_no_conformidad_id_fkey"
            columns: ["no_conformidad_id"]
            isOneToOne: false
            referencedRelation: "no_conformidades"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          created_at: string
          empresa_id: string | null
          entidad_id: string | null
          entidad_tipo: string | null
          fecha_lectura: string | null
          id: string
          leida: boolean
          mensaje: string | null
          severidad: string
          tipo: string
          titulo: string
          url: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          fecha_lectura?: string | null
          id?: string
          leida?: boolean
          mensaje?: string | null
          severidad?: string
          tipo: string
          titulo: string
          url?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          entidad_id?: string | null
          entidad_tipo?: string | null
          fecha_lectura?: string | null
          id?: string
          leida?: boolean
          mensaje?: string | null
          severidad?: string
          tipo?: string
          titulo?: string
          url?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      obligaciones_sat: {
        Row: {
          capturado_por: string | null
          created_at: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_obligacion"]
          fecha_pago: string | null
          fecha_presentacion: string | null
          fecha_vencimiento: string
          id: string
          monto_calculado: number | null
          monto_pagado: number | null
          numero_operacion: string | null
          observaciones: string | null
          periodo_anio: number
          periodo_label: string | null
          periodo_mes: number | null
          responsable_id: string | null
          saldo_a_favor: number | null
          tipo: Database["public"]["Enums"]["tipo_obligacion_sat"]
          updated_at: string | null
          url_acuse: string | null
          url_comprobante: string | null
        }
        Insert: {
          capturado_por?: string | null
          created_at?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_obligacion"]
          fecha_pago?: string | null
          fecha_presentacion?: string | null
          fecha_vencimiento: string
          id?: string
          monto_calculado?: number | null
          monto_pagado?: number | null
          numero_operacion?: string | null
          observaciones?: string | null
          periodo_anio: number
          periodo_label?: string | null
          periodo_mes?: number | null
          responsable_id?: string | null
          saldo_a_favor?: number | null
          tipo: Database["public"]["Enums"]["tipo_obligacion_sat"]
          updated_at?: string | null
          url_acuse?: string | null
          url_comprobante?: string | null
        }
        Update: {
          capturado_por?: string | null
          created_at?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_obligacion"]
          fecha_pago?: string | null
          fecha_presentacion?: string | null
          fecha_vencimiento?: string
          id?: string
          monto_calculado?: number | null
          monto_pagado?: number | null
          numero_operacion?: string | null
          observaciones?: string | null
          periodo_anio?: number
          periodo_label?: string | null
          periodo_mes?: number | null
          responsable_id?: string | null
          saldo_a_favor?: number | null
          tipo?: Database["public"]["Enums"]["tipo_obligacion_sat"]
          updated_at?: string | null
          url_acuse?: string | null
          url_comprobante?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligaciones_sat_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      oportunidades: {
        Row: {
          cliente_id: string
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_oportunidad"] | null
          fecha_cierre_estimada: string | null
          fecha_cierre_real: string | null
          fecha_proxima_accion: string | null
          fuente: string | null
          id: string
          monto_estimado: number | null
          motivo_perdida: string | null
          nombre: string
          observaciones: string | null
          probabilidad: number | null
          proxima_accion: string | null
          updated_at: string | null
          vendedor_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_oportunidad"] | null
          fecha_cierre_estimada?: string | null
          fecha_cierre_real?: string | null
          fecha_proxima_accion?: string | null
          fuente?: string | null
          id?: string
          monto_estimado?: number | null
          motivo_perdida?: string | null
          nombre: string
          observaciones?: string | null
          probabilidad?: number | null
          proxima_accion?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_oportunidad"] | null
          fecha_cierre_estimada?: string | null
          fecha_cierre_real?: string | null
          fecha_proxima_accion?: string | null
          fuente?: string | null
          id?: string
          monto_estimado?: number | null
          motivo_perdida?: string | null
          nombre?: string
          observaciones?: string | null
          probabilidad?: number | null
          proxima_accion?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oportunidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordenes_compra: {
        Row: {
          aprobado_por: string | null
          archivos_adjuntos: Json | null
          capturado_por: string
          cfdi_recibido_id: string | null
          comentarios: string | null
          condiciones_pago: string | null
          created_at: string | null
          descuento: number | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_oc"] | null
          fecha_aprobacion: string | null
          fecha_emision: string
          fecha_entrega_esperada: string | null
          fecha_entrega_real: string | null
          fecha_pago: string | null
          forma_pago: string | null
          id: string
          iva: number | null
          numero: string
          proveedor_id: string
          proyecto_id: string | null
          retenciones: number | null
          subtotal: number
          total: number
          updated_at: string | null
          url_pdf: string | null
        }
        Insert: {
          aprobado_por?: string | null
          archivos_adjuntos?: Json | null
          capturado_por: string
          cfdi_recibido_id?: string | null
          comentarios?: string | null
          condiciones_pago?: string | null
          created_at?: string | null
          descuento?: number | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_oc"] | null
          fecha_aprobacion?: string | null
          fecha_emision?: string
          fecha_entrega_esperada?: string | null
          fecha_entrega_real?: string | null
          fecha_pago?: string | null
          forma_pago?: string | null
          id?: string
          iva?: number | null
          numero: string
          proveedor_id: string
          proyecto_id?: string | null
          retenciones?: number | null
          subtotal: number
          total: number
          updated_at?: string | null
          url_pdf?: string | null
        }
        Update: {
          aprobado_por?: string | null
          archivos_adjuntos?: Json | null
          capturado_por?: string
          cfdi_recibido_id?: string | null
          comentarios?: string | null
          condiciones_pago?: string | null
          created_at?: string | null
          descuento?: number | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_oc"] | null
          fecha_aprobacion?: string | null
          fecha_emision?: string
          fecha_entrega_esperada?: string | null
          fecha_entrega_real?: string | null
          fecha_pago?: string | null
          forma_pago?: string | null
          id?: string
          iva?: number | null
          numero?: string
          proveedor_id?: string
          proyecto_id?: string | null
          retenciones?: number | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          url_pdf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      ordenes_compra_conceptos: {
        Row: {
          cantidad: number
          cantidad_recibida: number | null
          clave_sat: string | null
          created_at: string | null
          descripcion: string
          id: string
          importe: number
          iva_tasa: number | null
          observaciones: string | null
          oc_id: string
          orden: number
          precio_unitario: number
          producto_id: string | null
          unidad_sat: string | null
        }
        Insert: {
          cantidad: number
          cantidad_recibida?: number | null
          clave_sat?: string | null
          created_at?: string | null
          descripcion: string
          id?: string
          importe: number
          iva_tasa?: number | null
          observaciones?: string | null
          oc_id: string
          orden: number
          precio_unitario: number
          producto_id?: string | null
          unidad_sat?: string | null
        }
        Update: {
          cantidad?: number
          cantidad_recibida?: number | null
          clave_sat?: string | null
          created_at?: string | null
          descripcion?: string
          id?: string
          importe?: number
          iva_tasa?: number | null
          observaciones?: string | null
          oc_id?: string
          orden?: number
          precio_unitario?: number
          producto_id?: string | null
          unidad_sat?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_compra_conceptos_oc_id_fkey"
            columns: ["oc_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_conceptos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_compra_conceptos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_stock"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      ordenes_trabajo_inter_co: {
        Row: {
          aprobado_destino_por: string | null
          aprobado_origen_por: string | null
          cantidad: number | null
          capturado_por: string
          cfdi_id: string | null
          costo_base: number
          created_at: string | null
          descripcion: string
          empresa_destino_id: string
          empresa_origen_id: string
          estado: Database["public"]["Enums"]["estado_ot"] | null
          evidencia_completacion: Json | null
          fecha_cobro: string | null
          fecha_completacion_esperada: string | null
          fecha_completacion_real: string | null
          fecha_solicitud: string
          id: string
          iva: number | null
          margen_aplicado: number | null
          numero: string
          observaciones: string | null
          precio_inter_co: number
          proyecto_id: string | null
          retenciones: number | null
          servicio_id: string | null
          total: number
          unidad: string | null
          updated_at: string | null
        }
        Insert: {
          aprobado_destino_por?: string | null
          aprobado_origen_por?: string | null
          cantidad?: number | null
          capturado_por: string
          cfdi_id?: string | null
          costo_base: number
          created_at?: string | null
          descripcion: string
          empresa_destino_id: string
          empresa_origen_id: string
          estado?: Database["public"]["Enums"]["estado_ot"] | null
          evidencia_completacion?: Json | null
          fecha_cobro?: string | null
          fecha_completacion_esperada?: string | null
          fecha_completacion_real?: string | null
          fecha_solicitud?: string
          id?: string
          iva?: number | null
          margen_aplicado?: number | null
          numero: string
          observaciones?: string | null
          precio_inter_co: number
          proyecto_id?: string | null
          retenciones?: number | null
          servicio_id?: string | null
          total: number
          unidad?: string | null
          updated_at?: string | null
        }
        Update: {
          aprobado_destino_por?: string | null
          aprobado_origen_por?: string | null
          cantidad?: number | null
          capturado_por?: string
          cfdi_id?: string | null
          costo_base?: number
          created_at?: string | null
          descripcion?: string
          empresa_destino_id?: string
          empresa_origen_id?: string
          estado?: Database["public"]["Enums"]["estado_ot"] | null
          evidencia_completacion?: Json | null
          fecha_cobro?: string | null
          fecha_completacion_esperada?: string | null
          fecha_completacion_real?: string | null
          fecha_solicitud?: string
          id?: string
          iva?: number | null
          margen_aplicado?: number | null
          numero?: string
          observaciones?: string | null
          precio_inter_co?: number
          proyecto_id?: string | null
          retenciones?: number | null
          servicio_id?: string | null
          total?: number
          unidad?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordenes_trabajo_inter_co_empresa_destino_id_fkey"
            columns: ["empresa_destino_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_trabajo_inter_co_empresa_origen_id_fkey"
            columns: ["empresa_origen_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_trabajo_inter_co_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordenes_trabajo_inter_co_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "ordenes_trabajo_inter_co_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "catalogo_servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_contratos: {
        Row: {
          activa: boolean | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          tipo: string
          url_template: string | null
          variables_requeridas: Json | null
          version: number | null
        }
        Insert: {
          activa?: boolean | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          tipo: string
          url_template?: string | null
          variables_requeridas?: Json | null
          version?: number | null
        }
        Update: {
          activa?: boolean | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo?: string
          url_template?: string | null
          variables_requeridas?: Json | null
          version?: number | null
        }
        Relationships: []
      }
      plantillas_documentos: {
        Row: {
          activa: boolean | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          empresa_id: string | null
          id: string
          nombre: string
          tipo: string
          url_template: string | null
        }
        Insert: {
          activa?: boolean | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          id?: string
          nombre: string
          tipo: string
          url_template?: string | null
        }
        Update: {
          activa?: boolean | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          id?: string
          nombre?: string
          tipo?: string
          url_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantillas_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pld_operaciones_inusuales: {
        Row: {
          analizado_por: string | null
          cliente_id: string | null
          created_at: string | null
          descripcion: string
          empresa_id: string
          evidencia: Json | null
          fecha_analisis: string | null
          fecha_deteccion: string | null
          fecha_reporte_uif: string | null
          id: string
          monto: number | null
          numero_reporte_uif: string | null
          observaciones: string | null
          proveedor_id: string | null
          reportada_uif: boolean | null
          resultado_analisis: string | null
          tipo_alerta: string
        }
        Insert: {
          analizado_por?: string | null
          cliente_id?: string | null
          created_at?: string | null
          descripcion: string
          empresa_id: string
          evidencia?: Json | null
          fecha_analisis?: string | null
          fecha_deteccion?: string | null
          fecha_reporte_uif?: string | null
          id?: string
          monto?: number | null
          numero_reporte_uif?: string | null
          observaciones?: string | null
          proveedor_id?: string | null
          reportada_uif?: boolean | null
          resultado_analisis?: string | null
          tipo_alerta: string
        }
        Update: {
          analizado_por?: string | null
          cliente_id?: string | null
          created_at?: string | null
          descripcion?: string
          empresa_id?: string
          evidencia?: Json | null
          fecha_analisis?: string | null
          fecha_deteccion?: string | null
          fecha_reporte_uif?: string | null
          id?: string
          monto?: number | null
          numero_reporte_uif?: string | null
          observaciones?: string | null
          proveedor_id?: string | null
          reportada_uif?: boolean | null
          resultado_analisis?: string | null
          tipo_alerta?: string
        }
        Relationships: [
          {
            foreignKeyName: "pld_operaciones_inusuales_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pld_operaciones_inusuales_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pld_operaciones_inusuales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pld_operaciones_inusuales_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pld_operaciones_inusuales_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      prestamos_inter_co: {
        Row: {
          aprobado_por: string | null
          comprobante_transferencia: string | null
          confirmado_por: string | null
          created_at: string | null
          ejecutado_por: string | null
          empresa_acreedora_id: string
          empresa_deudora_id: string
          estado: Database["public"]["Enums"]["estado_prestamo"] | null
          fecha_aprobacion: string | null
          fecha_confirmacion: string | null
          fecha_ejecucion: string | null
          fecha_solicitud: string
          fecha_vencimiento: string | null
          id: string
          linea_id: string
          monto: number
          monto_pagado: number | null
          motivo: string | null
          numero: string
          observaciones: string | null
          saldo_pendiente: number | null
          solicitado_por: string
        }
        Insert: {
          aprobado_por?: string | null
          comprobante_transferencia?: string | null
          confirmado_por?: string | null
          created_at?: string | null
          ejecutado_por?: string | null
          empresa_acreedora_id: string
          empresa_deudora_id: string
          estado?: Database["public"]["Enums"]["estado_prestamo"] | null
          fecha_aprobacion?: string | null
          fecha_confirmacion?: string | null
          fecha_ejecucion?: string | null
          fecha_solicitud?: string
          fecha_vencimiento?: string | null
          id?: string
          linea_id: string
          monto: number
          monto_pagado?: number | null
          motivo?: string | null
          numero: string
          observaciones?: string | null
          saldo_pendiente?: number | null
          solicitado_por: string
        }
        Update: {
          aprobado_por?: string | null
          comprobante_transferencia?: string | null
          confirmado_por?: string | null
          created_at?: string | null
          ejecutado_por?: string | null
          empresa_acreedora_id?: string
          empresa_deudora_id?: string
          estado?: Database["public"]["Enums"]["estado_prestamo"] | null
          fecha_aprobacion?: string | null
          fecha_confirmacion?: string | null
          fecha_ejecucion?: string | null
          fecha_solicitud?: string
          fecha_vencimiento?: string | null
          id?: string
          linea_id?: string
          monto?: number
          monto_pagado?: number | null
          motivo?: string | null
          numero?: string
          observaciones?: string | null
          saldo_pendiente?: number | null
          solicitado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestamos_inter_co_empresa_acreedora_id_fkey"
            columns: ["empresa_acreedora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestamos_inter_co_empresa_deudora_id_fkey"
            columns: ["empresa_deudora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestamos_inter_co_linea_id_fkey"
            columns: ["linea_id"]
            isOneToOne: false
            referencedRelation: "lineas_credito_inter_co"
            referencedColumns: ["id"]
          },
        ]
      }
      prestamos_intereses: {
        Row: {
          cerrado_mes: boolean | null
          cfdi_intereses_id: string | null
          created_at: string | null
          fecha: string
          id: string
          intereses_acumulados: number
          intereses_dia: number
          prestamo_id: string
          saldo_principal: number
          tasa_aplicada: number
        }
        Insert: {
          cerrado_mes?: boolean | null
          cfdi_intereses_id?: string | null
          created_at?: string | null
          fecha: string
          id?: string
          intereses_acumulados: number
          intereses_dia: number
          prestamo_id: string
          saldo_principal: number
          tasa_aplicada: number
        }
        Update: {
          cerrado_mes?: boolean | null
          cfdi_intereses_id?: string | null
          created_at?: string | null
          fecha?: string
          id?: string
          intereses_acumulados?: number
          intereses_dia?: number
          prestamo_id?: string
          saldo_principal?: number
          tasa_aplicada?: number
        }
        Relationships: [
          {
            foreignKeyName: "prestamos_intereses_cfdi_intereses_id_fkey"
            columns: ["cfdi_intereses_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestamos_intereses_prestamo_id_fkey"
            columns: ["prestamo_id"]
            isOneToOne: false
            referencedRelation: "prestamos_inter_co"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos_proyecto: {
        Row: {
          categoria: string
          comprometido: number | null
          created_at: string | null
          ejercido: number | null
          id: string
          observaciones: string | null
          presupuesto: number
          proyecto_id: string
          saldo: number | null
        }
        Insert: {
          categoria: string
          comprometido?: number | null
          created_at?: string | null
          ejercido?: number | null
          id?: string
          observaciones?: string | null
          presupuesto: number
          proyecto_id: string
          saldo?: number | null
        }
        Update: {
          categoria?: string
          comprometido?: number | null
          created_at?: string | null
          ejercido?: number | null
          id?: string
          observaciones?: string | null
          presupuesto?: number
          proyecto_id?: string
          saldo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_proyecto_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_proyecto_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      procedimientos: {
        Row: {
          activo: boolean | null
          aprobador_id: string | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          empresa_id: string | null
          estado: string | null
          fecha_proxima_revision: string | null
          id: string
          nombre: string
          proceso_id: string | null
          responsable_id: string | null
          tipo: string | null
          version_actual: number | null
        }
        Insert: {
          activo?: boolean | null
          aprobador_id?: string | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_proxima_revision?: string | null
          id?: string
          nombre: string
          proceso_id?: string | null
          responsable_id?: string | null
          tipo?: string | null
          version_actual?: number | null
        }
        Update: {
          activo?: boolean | null
          aprobador_id?: string | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_proxima_revision?: string | null
          id?: string
          nombre?: string
          proceso_id?: string | null
          responsable_id?: string | null
          tipo?: string | null
          version_actual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "procedimientos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedimientos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "sgc_procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      procedimientos_versiones: {
        Row: {
          aprobado_por: string | null
          cambios_vs_anterior: string | null
          created_at: string | null
          estado: string | null
          fecha_aprobacion: string | null
          fecha_emision: string | null
          id: string
          procedimiento_id: string
          url_archivo: string | null
          version: number
        }
        Insert: {
          aprobado_por?: string | null
          cambios_vs_anterior?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_emision?: string | null
          id?: string
          procedimiento_id: string
          url_archivo?: string | null
          version: number
        }
        Update: {
          aprobado_por?: string | null
          cambios_vs_anterior?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_emision?: string | null
          id?: string
          procedimiento_id?: string
          url_archivo?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedimientos_versiones_procedimiento_id_fkey"
            columns: ["procedimiento_id"]
            isOneToOne: false
            referencedRelation: "procedimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos_serie: {
        Row: {
          almacen_id: string | null
          cliente_id: string | null
          created_at: string | null
          estado: string | null
          fecha_compra: string | null
          fecha_instalacion: string | null
          garantia_fin: string | null
          garantia_inicio: string | null
          id: string
          numero_serie: string
          observaciones: string | null
          oc_id: string | null
          producto_id: string
          proyecto_id: string | null
          ubicacion_actual: string | null
        }
        Insert: {
          almacen_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_compra?: string | null
          fecha_instalacion?: string | null
          garantia_fin?: string | null
          garantia_inicio?: string | null
          id?: string
          numero_serie: string
          observaciones?: string | null
          oc_id?: string | null
          producto_id: string
          proyecto_id?: string | null
          ubicacion_actual?: string | null
        }
        Update: {
          almacen_id?: string | null
          cliente_id?: string | null
          created_at?: string | null
          estado?: string | null
          fecha_compra?: string | null
          fecha_instalacion?: string | null
          garantia_fin?: string | null
          garantia_inicio?: string | null
          id?: string
          numero_serie?: string
          observaciones?: string | null
          oc_id?: string | null
          producto_id?: string
          proyecto_id?: string | null
          ubicacion_actual?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productos_serie_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_serie_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_serie_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_serie_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_serie_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_stock"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "productos_serie_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_serie_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean | null
          beneficiario_controlador: Json | null
          categoria_sat: string | null
          clasificacion_interna: string | null
          cp_fiscal: string | null
          created_at: string | null
          cuenta_bancaria: Json | null
          curp: string | null
          direccion_fiscal: Json | null
          esta_aprobado: boolean | null
          estado: Database["public"]["Enums"]["estado_entidad"]
          estado_modificado_at: string | null
          estado_modificado_por: string | null
          estado_motivo: string | null
          evaluacion_promedio: number | null
          fecha_aprobacion: string | null
          id: string
          nombre_comercial: string | null
          observaciones: string | null
          razon_social: string
          regimen_fiscal: string | null
          representante_legal: string | null
          requiere_repse: boolean | null
          rfc: string
          rfc_representante: string | null
          semaforo: string | null
          tipo_proveedor: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          beneficiario_controlador?: Json | null
          categoria_sat?: string | null
          clasificacion_interna?: string | null
          cp_fiscal?: string | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string | null
          direccion_fiscal?: Json | null
          esta_aprobado?: boolean | null
          estado?: Database["public"]["Enums"]["estado_entidad"]
          estado_modificado_at?: string | null
          estado_modificado_por?: string | null
          estado_motivo?: string | null
          evaluacion_promedio?: number | null
          fecha_aprobacion?: string | null
          id?: string
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social: string
          regimen_fiscal?: string | null
          representante_legal?: string | null
          requiere_repse?: boolean | null
          rfc: string
          rfc_representante?: string | null
          semaforo?: string | null
          tipo_proveedor?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          beneficiario_controlador?: Json | null
          categoria_sat?: string | null
          clasificacion_interna?: string | null
          cp_fiscal?: string | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string | null
          direccion_fiscal?: Json | null
          esta_aprobado?: boolean | null
          estado?: Database["public"]["Enums"]["estado_entidad"]
          estado_modificado_at?: string | null
          estado_modificado_por?: string | null
          estado_motivo?: string | null
          evaluacion_promedio?: number | null
          fecha_aprobacion?: string | null
          id?: string
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social?: string
          regimen_fiscal?: string | null
          representante_legal?: string | null
          requiere_repse?: boolean | null
          rfc?: string
          rfc_representante?: string | null
          semaforo?: string | null
          tipo_proveedor?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proveedores_documentacion: {
        Row: {
          activo: boolean | null
          created_at: string | null
          fecha_emision: string | null
          fecha_validacion: string | null
          fecha_vencimiento: string | null
          id: string
          numero_referencia: string | null
          observaciones: string | null
          proveedor_id: string
          tipo_documento: string
          url_archivo: string | null
          validado_por: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          fecha_emision?: string | null
          fecha_validacion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          numero_referencia?: string | null
          observaciones?: string | null
          proveedor_id: string
          tipo_documento: string
          url_archivo?: string | null
          validado_por?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          fecha_emision?: string | null
          fecha_validacion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          numero_referencia?: string | null
          observaciones?: string | null
          proveedor_id?: string
          tipo_documento?: string
          url_archivo?: string | null
          validado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_documentacion_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_documentacion_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores_empresas: {
        Row: {
          activo: boolean | null
          empresa_id: string
          fecha_primera_operacion: string | null
          id: string
          proveedor_id: string
        }
        Insert: {
          activo?: boolean | null
          empresa_id: string
          fecha_primera_operacion?: string | null
          id?: string
          proveedor_id: string
        }
        Update: {
          activo?: boolean | null
          empresa_id?: string
          fecha_primera_operacion?: string | null
          id?: string
          proveedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_empresas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_empresas_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores_evaluaciones: {
        Row: {
          calificacion_total: number | null
          created_at: string | null
          criterios: Json | null
          empresa_id: string
          evaluado_por: string | null
          id: string
          observaciones: string | null
          periodo_fin: string
          periodo_inicio: string
          proveedor_id: string
        }
        Insert: {
          calificacion_total?: number | null
          created_at?: string | null
          criterios?: Json | null
          empresa_id: string
          evaluado_por?: string | null
          id?: string
          observaciones?: string | null
          periodo_fin: string
          periodo_inicio: string
          proveedor_id: string
        }
        Update: {
          calificacion_total?: number | null
          created_at?: string | null
          criterios?: Json | null
          empresa_id?: string
          evaluado_por?: string | null
          id?: string
          observaciones?: string | null
          periodo_fin?: string
          periodo_inicio?: string
          proveedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_evaluaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_evaluaciones_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_evaluaciones_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores_personal_repse: {
        Row: {
          activo: boolean | null
          created_at: string | null
          curp: string | null
          empresa_id: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          nombre_completo: string
          nss: string | null
          proveedor_id: string
          proyecto_id: string | null
          puesto: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          curp?: string | null
          empresa_id: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre_completo: string
          nss?: string | null
          proveedor_id: string
          proyecto_id?: string | null
          puesto?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          curp?: string | null
          empresa_id?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          nombre_completo?: string
          nss?: string | null
          proveedor_id?: string
          proyecto_id?: string | null
          puesto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proveedores_personal_repse_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_personal_repse_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proveedores_personal_repse_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_bitacora: {
        Row: {
          adjuntos: Json | null
          capturado_por: string | null
          capturado_por_nombre: string | null
          created_at: string | null
          descripcion: string
          es_critica: boolean | null
          fecha: string
          id: string
          proyecto_id: string
          tarea_id: string | null
          tipo: Database["public"]["Enums"]["tipo_evento_bitacora"]
          titulo: string | null
          visible_cliente: boolean | null
        }
        Insert: {
          adjuntos?: Json | null
          capturado_por?: string | null
          capturado_por_nombre?: string | null
          created_at?: string | null
          descripcion: string
          es_critica?: boolean | null
          fecha?: string
          id?: string
          proyecto_id: string
          tarea_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento_bitacora"]
          titulo?: string | null
          visible_cliente?: boolean | null
        }
        Update: {
          adjuntos?: Json | null
          capturado_por?: string | null
          capturado_por_nombre?: string | null
          created_at?: string | null
          descripcion?: string
          es_critica?: boolean | null
          fecha?: string
          id?: string
          proyecto_id?: string
          tarea_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento_bitacora"]
          titulo?: string | null
          visible_cliente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_bitacora_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_bitacora_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_bitacora_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "proyecto_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_bitacora_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_tareas_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_documentos: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_documento_proyecto"]
          created_at: string | null
          descripcion: string | null
          id: string
          mime_type: string | null
          nombre: string
          proyecto_id: string
          solicitud_id: string | null
          storage_path: string
          subido_por: string | null
          subido_por_nombre: string | null
          tamano_bytes: number | null
          tarea_id: string | null
          version: number | null
          visible_cliente: boolean | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_documento_proyecto"]
          created_at?: string | null
          descripcion?: string | null
          id?: string
          mime_type?: string | null
          nombre: string
          proyecto_id: string
          solicitud_id?: string | null
          storage_path: string
          subido_por?: string | null
          subido_por_nombre?: string | null
          tamano_bytes?: number | null
          tarea_id?: string | null
          version?: number | null
          visible_cliente?: boolean | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_documento_proyecto"]
          created_at?: string | null
          descripcion?: string | null
          id?: string
          mime_type?: string | null
          nombre?: string
          proyecto_id?: string
          solicitud_id?: string | null
          storage_path?: string
          subido_por?: string | null
          subido_por_nombre?: string | null
          tamano_bytes?: number | null
          tarea_id?: string | null
          version?: number | null
          visible_cliente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_documentos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_documentos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_documentos_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "proyecto_solicitudes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_documentos_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_solicitudes_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_documentos_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "proyecto_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_documentos_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_tareas_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_equipo: {
        Row: {
          agregado_por: string | null
          created_at: string | null
          fecha_alta: string | null
          fecha_baja: string | null
          id: string
          observaciones: string | null
          proyecto_id: string
          rol: Database["public"]["Enums"]["rol_proyecto"]
          usuario_id: string
          usuario_nombre: string | null
        }
        Insert: {
          agregado_por?: string | null
          created_at?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          id?: string
          observaciones?: string | null
          proyecto_id: string
          rol?: Database["public"]["Enums"]["rol_proyecto"]
          usuario_id: string
          usuario_nombre?: string | null
        }
        Update: {
          agregado_por?: string | null
          created_at?: string | null
          fecha_alta?: string | null
          fecha_baja?: string | null
          id?: string
          observaciones?: string | null
          proyecto_id?: string
          rol?: Database["public"]["Enums"]["rol_proyecto"]
          usuario_id?: string
          usuario_nombre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_equipo_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_equipo_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      proyecto_reportes: {
        Row: {
          accion_correctiva: string | null
          adjuntos: Json | null
          contenido: string | null
          creado_por: string | null
          creado_por_nombre: string | null
          created_at: string | null
          enviado_a: string[] | null
          estado: Database["public"]["Enums"]["estado_reporte"]
          fecha_compromiso: string | null
          fecha_envio: string | null
          fecha_evento: string | null
          fecha_reporte: string
          fecha_resolucion: string | null
          id: string
          impacto: string | null
          numero: string
          proyecto_id: string
          responsable_nombre: string | null
          responsable_seguimiento: string | null
          resumen: string | null
          severidad: Database["public"]["Enums"]["severidad_reporte"] | null
          tarea_id: string | null
          tipo: Database["public"]["Enums"]["tipo_reporte_proyecto"]
          titulo: string
          ubicacion: string | null
          updated_at: string | null
          visible_cliente: boolean | null
        }
        Insert: {
          accion_correctiva?: string | null
          adjuntos?: Json | null
          contenido?: string | null
          creado_por?: string | null
          creado_por_nombre?: string | null
          created_at?: string | null
          enviado_a?: string[] | null
          estado?: Database["public"]["Enums"]["estado_reporte"]
          fecha_compromiso?: string | null
          fecha_envio?: string | null
          fecha_evento?: string | null
          fecha_reporte?: string
          fecha_resolucion?: string | null
          id?: string
          impacto?: string | null
          numero: string
          proyecto_id: string
          responsable_nombre?: string | null
          responsable_seguimiento?: string | null
          resumen?: string | null
          severidad?: Database["public"]["Enums"]["severidad_reporte"] | null
          tarea_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_reporte_proyecto"]
          titulo: string
          ubicacion?: string | null
          updated_at?: string | null
          visible_cliente?: boolean | null
        }
        Update: {
          accion_correctiva?: string | null
          adjuntos?: Json | null
          contenido?: string | null
          creado_por?: string | null
          creado_por_nombre?: string | null
          created_at?: string | null
          enviado_a?: string[] | null
          estado?: Database["public"]["Enums"]["estado_reporte"]
          fecha_compromiso?: string | null
          fecha_envio?: string | null
          fecha_evento?: string | null
          fecha_reporte?: string
          fecha_resolucion?: string | null
          id?: string
          impacto?: string | null
          numero?: string
          proyecto_id?: string
          responsable_nombre?: string | null
          responsable_seguimiento?: string | null
          resumen?: string | null
          severidad?: Database["public"]["Enums"]["severidad_reporte"] | null
          tarea_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_reporte_proyecto"]
          titulo?: string
          ubicacion?: string | null
          updated_at?: string | null
          visible_cliente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_reportes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_reportes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_reportes_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "proyecto_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_reportes_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_tareas_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      proyecto_solicitudes: {
        Row: {
          asignado_a_id: string | null
          campos_tipo: Json | null
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          entidades_relacionadas: Json | null
          estado: Database["public"]["Enums"]["estado_solicitud"]
          id: string
          monto_estimado: number | null
          numero: string | null
          proyecto_id: string
          razon_rechazo: string | null
          resuelta_at: string | null
          solicitante_id: string
          tipo: Database["public"]["Enums"]["tipo_solicitud_proyecto"]
          titulo: string
          updated_at: string | null
          urgencia: Database["public"]["Enums"]["urgencia_solicitud"]
        }
        Insert: {
          asignado_a_id?: string | null
          campos_tipo?: Json | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          entidades_relacionadas?: Json | null
          estado?: Database["public"]["Enums"]["estado_solicitud"]
          id?: string
          monto_estimado?: number | null
          numero?: string | null
          proyecto_id: string
          razon_rechazo?: string | null
          resuelta_at?: string | null
          solicitante_id: string
          tipo: Database["public"]["Enums"]["tipo_solicitud_proyecto"]
          titulo: string
          updated_at?: string | null
          urgencia?: Database["public"]["Enums"]["urgencia_solicitud"]
        }
        Update: {
          asignado_a_id?: string | null
          campos_tipo?: Json | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          entidades_relacionadas?: Json | null
          estado?: Database["public"]["Enums"]["estado_solicitud"]
          id?: string
          monto_estimado?: number | null
          numero?: string | null
          proyecto_id?: string
          razon_rechazo?: string | null
          resuelta_at?: string | null
          solicitante_id?: string
          tipo?: Database["public"]["Enums"]["tipo_solicitud_proyecto"]
          titulo?: string
          updated_at?: string | null
          urgencia?: Database["public"]["Enums"]["urgencia_solicitud"]
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_solicitudes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_solicitudes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_solicitudes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      proyecto_tareas: {
        Row: {
          asignado_a: string | null
          capturado_por: string | null
          cfdi_relacionado_id: string | null
          costo_estimado: number | null
          costo_real: number | null
          created_at: string | null
          depende_de: string[] | null
          descripcion: string | null
          duracion_dias: number | null
          es_hito: boolean | null
          estado: Database["public"]["Enums"]["estado_tarea_proyecto"]
          fecha_fin_planeada: string | null
          fecha_fin_real: string | null
          fecha_inicio_planeada: string | null
          fecha_inicio_real: string | null
          horas_estimadas: number | null
          horas_reales: number | null
          id: string
          observaciones: string | null
          oc_relacionada_id: string | null
          orden: number
          parent_id: string | null
          porcentaje_avance: number | null
          prioridad: Database["public"]["Enums"]["prioridad_tarea"] | null
          proyecto_id: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          asignado_a?: string | null
          capturado_por?: string | null
          cfdi_relacionado_id?: string | null
          costo_estimado?: number | null
          costo_real?: number | null
          created_at?: string | null
          depende_de?: string[] | null
          descripcion?: string | null
          duracion_dias?: number | null
          es_hito?: boolean | null
          estado?: Database["public"]["Enums"]["estado_tarea_proyecto"]
          fecha_fin_planeada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_planeada?: string | null
          fecha_inicio_real?: string | null
          horas_estimadas?: number | null
          horas_reales?: number | null
          id?: string
          observaciones?: string | null
          oc_relacionada_id?: string | null
          orden?: number
          parent_id?: string | null
          porcentaje_avance?: number | null
          prioridad?: Database["public"]["Enums"]["prioridad_tarea"] | null
          proyecto_id: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          asignado_a?: string | null
          capturado_por?: string | null
          cfdi_relacionado_id?: string | null
          costo_estimado?: number | null
          costo_real?: number | null
          created_at?: string | null
          depende_de?: string[] | null
          descripcion?: string | null
          duracion_dias?: number | null
          es_hito?: boolean | null
          estado?: Database["public"]["Enums"]["estado_tarea_proyecto"]
          fecha_fin_planeada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_planeada?: string | null
          fecha_inicio_real?: string | null
          horas_estimadas?: number | null
          horas_reales?: number | null
          id?: string
          observaciones?: string | null
          oc_relacionada_id?: string | null
          orden?: number
          parent_id?: string | null
          porcentaje_avance?: number | null
          prioridad?: Database["public"]["Enums"]["prioridad_tarea"] | null
          proyecto_id?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_tareas_cfdi_relacionado_id_fkey"
            columns: ["cfdi_relacionado_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_oc_relacionada_id_fkey"
            columns: ["oc_relacionada_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "proyecto_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_tareas_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      proyectos: {
        Row: {
          activo: boolean | null
          administrador_id: string | null
          cadencia_reporte_cliente: string | null
          capacidad_kwp: number | null
          cliente_id: string
          codigo: string
          costo_real: number | null
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_proyecto"] | null
          fecha_contrato: string | null
          fecha_fin_planeado: string | null
          fecha_fin_real: string | null
          fecha_inicio_planeado: string | null
          fecha_inicio_real: string | null
          id: string
          monto_cobrado: number | null
          monto_contratado: number | null
          monto_facturado: number | null
          nombre: string
          observaciones: string | null
          oportunidad_id: string | null
          pm_id: string | null
          presupuesto_costo: number | null
          saldo_pendiente: number | null
          semaforo: string | null
          semaforo_razon: string | null
          tipo: string | null
          ubicacion: Json | null
          unidad_negocio_id: string | null
          updated_at: string | null
          vendedor_id: string | null
        }
        Insert: {
          activo?: boolean | null
          administrador_id?: string | null
          cadencia_reporte_cliente?: string | null
          capacidad_kwp?: number | null
          cliente_id: string
          codigo: string
          costo_real?: number | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_proyecto"] | null
          fecha_contrato?: string | null
          fecha_fin_planeado?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_planeado?: string | null
          fecha_inicio_real?: string | null
          id?: string
          monto_cobrado?: number | null
          monto_contratado?: number | null
          monto_facturado?: number | null
          nombre: string
          observaciones?: string | null
          oportunidad_id?: string | null
          pm_id?: string | null
          presupuesto_costo?: number | null
          saldo_pendiente?: number | null
          semaforo?: string | null
          semaforo_razon?: string | null
          tipo?: string | null
          ubicacion?: Json | null
          unidad_negocio_id?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Update: {
          activo?: boolean | null
          administrador_id?: string | null
          cadencia_reporte_cliente?: string | null
          capacidad_kwp?: number | null
          cliente_id?: string
          codigo?: string
          costo_real?: number | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_proyecto"] | null
          fecha_contrato?: string | null
          fecha_fin_planeado?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_planeado?: string | null
          fecha_inicio_real?: string | null
          id?: string
          monto_cobrado?: number | null
          monto_contratado?: number | null
          monto_facturado?: number | null
          nombre?: string
          observaciones?: string | null
          oportunidad_id?: string | null
          pm_id?: string | null
          presupuesto_costo?: number | null
          saldo_pendiente?: number | null
          semaforo?: string | null
          semaforo_razon?: string | null
          tipo?: string | null
          ubicacion?: Json | null
          unidad_negocio_id?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_unidad_negocio_id_fkey"
            columns: ["unidad_negocio_id"]
            isOneToOne: false
            referencedRelation: "unidades_negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      proyectos_etapas: {
        Row: {
          created_at: string | null
          es_hito: boolean | null
          facturado: boolean | null
          fecha_fin_planeado: string | null
          fecha_fin_real: string | null
          fecha_inicio_planeado: string | null
          fecha_inicio_real: string | null
          id: string
          monto_facturable: number | null
          nombre: string
          observaciones: string | null
          orden: number
          porcentaje_avance: number | null
          proyecto_id: string
        }
        Insert: {
          created_at?: string | null
          es_hito?: boolean | null
          facturado?: boolean | null
          fecha_fin_planeado?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_planeado?: string | null
          fecha_inicio_real?: string | null
          id?: string
          monto_facturable?: number | null
          nombre: string
          observaciones?: string | null
          orden: number
          porcentaje_avance?: number | null
          proyecto_id: string
        }
        Update: {
          created_at?: string | null
          es_hito?: boolean | null
          facturado?: boolean | null
          fecha_fin_planeado?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_planeado?: string | null
          fecha_inicio_real?: string | null
          id?: string
          monto_facturable?: number | null
          nombre?: string
          observaciones?: string | null
          orden?: number
          porcentaje_avance?: number | null
          proyecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_etapas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_etapas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      reportes_cliente: {
        Row: {
          contenido: Json | null
          created_at: string | null
          enviado_a_cliente: boolean | null
          fecha_envio: string | null
          fecha_visto: string | null
          generado_por: string | null
          id: string
          periodo_fin: string | null
          periodo_inicio: string | null
          proyecto_id: string
          tipo: string
          url_pdf: string | null
          visto_por_cliente: boolean | null
        }
        Insert: {
          contenido?: Json | null
          created_at?: string | null
          enviado_a_cliente?: boolean | null
          fecha_envio?: string | null
          fecha_visto?: string | null
          generado_por?: string | null
          id?: string
          periodo_fin?: string | null
          periodo_inicio?: string | null
          proyecto_id: string
          tipo: string
          url_pdf?: string | null
          visto_por_cliente?: boolean | null
        }
        Update: {
          contenido?: Json | null
          created_at?: string | null
          enviado_a_cliente?: boolean | null
          fecha_envio?: string | null
          fecha_visto?: string | null
          generado_por?: string | null
          id?: string
          periodo_fin?: string | null
          periodo_inicio?: string | null
          proyecto_id?: string
          tipo?: string
          url_pdf?: string | null
          visto_por_cliente?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reportes_cliente_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reportes_cliente_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      revisiones_direccion: {
        Row: {
          acuerdos: Json | null
          aprobada_por: string | null
          asistentes: Json | null
          capturado_por: string | null
          created_at: string | null
          empresa_id: string
          entradas: Json | null
          fecha_reunion: string
          id: string
          salidas: Json | null
          url_acta: string | null
        }
        Insert: {
          acuerdos?: Json | null
          aprobada_por?: string | null
          asistentes?: Json | null
          capturado_por?: string | null
          created_at?: string | null
          empresa_id: string
          entradas?: Json | null
          fecha_reunion: string
          id?: string
          salidas?: Json | null
          url_acta?: string | null
        }
        Update: {
          acuerdos?: Json | null
          aprobada_por?: string | null
          asistentes?: Json | null
          capturado_por?: string | null
          created_at?: string | null
          empresa_id?: string
          entradas?: Json | null
          fecha_reunion?: string
          id?: string
          salidas?: Json | null
          url_acta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "revisiones_direccion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          created_at: string | null
          empresa_activa_id: string | null
          fin: string | null
          id: string
          inicio: string | null
          ip: string | null
          motivo_fin: string | null
          ultima_actividad: string | null
          user_agent: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          empresa_activa_id?: string | null
          fin?: string | null
          id?: string
          inicio?: string | null
          ip?: string | null
          motivo_fin?: string | null
          ultima_actividad?: string | null
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          empresa_activa_id?: string | null
          fin?: string | null
          id?: string
          inicio?: string | null
          ip?: string | null
          motivo_fin?: string | null
          ultima_actividad?: string | null
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_empresa_activa_id_fkey"
            columns: ["empresa_activa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sgc_alcance: {
        Row: {
          activo: boolean | null
          area: string
          casa_certificadora: string | null
          created_at: string | null
          empresa_id: string
          estado: string | null
          fecha_certificacion: string | null
          fecha_renovacion: string | null
          id: string
          norma: string | null
          numero_certificado: string | null
          observaciones: string | null
          procesos_incluidos: string[] | null
          unidad_negocio_id: string | null
        }
        Insert: {
          activo?: boolean | null
          area: string
          casa_certificadora?: string | null
          created_at?: string | null
          empresa_id: string
          estado?: string | null
          fecha_certificacion?: string | null
          fecha_renovacion?: string | null
          id?: string
          norma?: string | null
          numero_certificado?: string | null
          observaciones?: string | null
          procesos_incluidos?: string[] | null
          unidad_negocio_id?: string | null
        }
        Update: {
          activo?: boolean | null
          area?: string
          casa_certificadora?: string | null
          created_at?: string | null
          empresa_id?: string
          estado?: string | null
          fecha_certificacion?: string | null
          fecha_renovacion?: string | null
          id?: string
          norma?: string | null
          numero_certificado?: string | null
          observaciones?: string | null
          procesos_incluidos?: string[] | null
          unidad_negocio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sgc_alcance_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sgc_alcance_unidad_negocio_id_fkey"
            columns: ["unidad_negocio_id"]
            isOneToOne: false
            referencedRelation: "unidades_negocio"
            referencedColumns: ["id"]
          },
        ]
      }
      sgc_indicadores: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          formula: string | null
          id: string
          meta: number | null
          nombre: string
          periodicidad: string | null
          proceso_id: string
          responsable_id: string | null
          unidad_medida: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          formula?: string | null
          id?: string
          meta?: number | null
          nombre: string
          periodicidad?: string | null
          proceso_id: string
          responsable_id?: string | null
          unidad_medida?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          formula?: string | null
          id?: string
          meta?: number | null
          nombre?: string
          periodicidad?: string | null
          proceso_id?: string
          responsable_id?: string | null
          unidad_medida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sgc_indicadores_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "sgc_procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      sgc_indicadores_mediciones: {
        Row: {
          capturado_por: string | null
          created_at: string | null
          id: string
          indicador_id: string
          observaciones: string | null
          periodo: string
          semaforo: string | null
          valor: number
        }
        Insert: {
          capturado_por?: string | null
          created_at?: string | null
          id?: string
          indicador_id: string
          observaciones?: string | null
          periodo: string
          semaforo?: string | null
          valor: number
        }
        Update: {
          capturado_por?: string | null
          created_at?: string | null
          id?: string
          indicador_id?: string
          observaciones?: string | null
          periodo?: string
          semaforo?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "sgc_indicadores_mediciones_indicador_id_fkey"
            columns: ["indicador_id"]
            isOneToOne: false
            referencedRelation: "sgc_indicadores"
            referencedColumns: ["id"]
          },
        ]
      }
      sgc_procesos: {
        Row: {
          activo: boolean | null
          alcance: string | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          dueno_id: string | null
          empresa_id: string | null
          entradas: string | null
          esta_en_alcance_certificado: boolean | null
          id: string
          nombre: string
          procedimiento_id: string | null
          salidas: string | null
          tipo: string | null
        }
        Insert: {
          activo?: boolean | null
          alcance?: string | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          dueno_id?: string | null
          empresa_id?: string | null
          entradas?: string | null
          esta_en_alcance_certificado?: boolean | null
          id?: string
          nombre: string
          procedimiento_id?: string | null
          salidas?: string | null
          tipo?: string | null
        }
        Update: {
          activo?: boolean | null
          alcance?: string | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          dueno_id?: string | null
          empresa_id?: string | null
          entradas?: string | null
          esta_en_alcance_certificado?: boolean | null
          id?: string
          nombre?: string
          procedimiento_id?: string | null
          salidas?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sgc_procesos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sgc_riesgos: {
        Row: {
          causa: string | null
          consecuencia: string | null
          controles_adicionales: string | null
          controles_existentes: string | null
          created_at: string | null
          descripcion: string
          empresa_id: string | null
          estado: string | null
          fecha_revision: string | null
          id: string
          impacto: number | null
          nivel_riesgo: number | null
          probabilidad: number | null
          proceso_id: string | null
          responsable_id: string | null
        }
        Insert: {
          causa?: string | null
          consecuencia?: string | null
          controles_adicionales?: string | null
          controles_existentes?: string | null
          created_at?: string | null
          descripcion: string
          empresa_id?: string | null
          estado?: string | null
          fecha_revision?: string | null
          id?: string
          impacto?: number | null
          nivel_riesgo?: number | null
          probabilidad?: number | null
          proceso_id?: string | null
          responsable_id?: string | null
        }
        Update: {
          causa?: string | null
          consecuencia?: string | null
          controles_adicionales?: string | null
          controles_existentes?: string | null
          created_at?: string | null
          descripcion?: string
          empresa_id?: string | null
          estado?: string | null
          fecha_revision?: string | null
          id?: string
          impacto?: number | null
          nivel_riesgo?: number | null
          probabilidad?: number | null
          proceso_id?: string | null
          responsable_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sgc_riesgos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sgc_riesgos_proceso_id_fkey"
            columns: ["proceso_id"]
            isOneToOne: false
            referencedRelation: "sgc_procesos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitud_comentarios: {
        Row: {
          autor_id: string
          created_at: string | null
          id: string
          menciones: string[] | null
          solicitud_id: string
          texto: string
        }
        Insert: {
          autor_id: string
          created_at?: string | null
          id?: string
          menciones?: string[] | null
          solicitud_id: string
          texto: string
        }
        Update: {
          autor_id?: string
          created_at?: string | null
          id?: string
          menciones?: string[] | null
          solicitud_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitud_comentarios_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "proyecto_solicitudes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitud_comentarios_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_solicitudes_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      sugerencias_mejora: {
        Row: {
          asignado_a: string | null
          categoria: Database["public"]["Enums"]["categoria_sugerencia"]
          created_at: string | null
          descripcion: string
          empresa_contexto: string | null
          estado: Database["public"]["Enums"]["estado_sugerencia"]
          id: string
          notas_internas: string | null
          prioridad: number | null
          updated_at: string | null
          url_contexto: string | null
          user_agent: string | null
          usuario_id: string
        }
        Insert: {
          asignado_a?: string | null
          categoria?: Database["public"]["Enums"]["categoria_sugerencia"]
          created_at?: string | null
          descripcion: string
          empresa_contexto?: string | null
          estado?: Database["public"]["Enums"]["estado_sugerencia"]
          id?: string
          notas_internas?: string | null
          prioridad?: number | null
          updated_at?: string | null
          url_contexto?: string | null
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          asignado_a?: string | null
          categoria?: Database["public"]["Enums"]["categoria_sugerencia"]
          created_at?: string | null
          descripcion?: string
          empresa_contexto?: string | null
          estado?: Database["public"]["Enums"]["estado_sugerencia"]
          id?: string
          notas_internas?: string | null
          prioridad?: number | null
          updated_at?: string | null
          url_contexto?: string | null
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugerencias_mejora_empresa_contexto_fkey"
            columns: ["empresa_contexto"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          asignado_id: string | null
          codigo: string | null
          created_at: string | null
          cuadrilla_id: string | null
          dependencias: string[] | null
          descripcion: string | null
          duracion_estimada_horas: number | null
          duracion_real_horas: number | null
          estado: string | null
          etapa_id: string | null
          fecha_fin_planeado: string | null
          fecha_fin_real: string | null
          fecha_inicio_planeado: string | null
          fecha_inicio_real: string | null
          id: string
          nombre: string
          observaciones: string | null
          prioridad: number | null
          proyecto_id: string
        }
        Insert: {
          asignado_id?: string | null
          codigo?: string | null
          created_at?: string | null
          cuadrilla_id?: string | null
          dependencias?: string[] | null
          descripcion?: string | null
          duracion_estimada_horas?: number | null
          duracion_real_horas?: number | null
          estado?: string | null
          etapa_id?: string | null
          fecha_fin_planeado?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_planeado?: string | null
          fecha_inicio_real?: string | null
          id?: string
          nombre: string
          observaciones?: string | null
          prioridad?: number | null
          proyecto_id: string
        }
        Update: {
          asignado_id?: string | null
          codigo?: string | null
          created_at?: string | null
          cuadrilla_id?: string | null
          dependencias?: string[] | null
          descripcion?: string | null
          duracion_estimada_horas?: number | null
          duracion_real_horas?: number | null
          estado?: string | null
          etapa_id?: string | null
          fecha_fin_planeado?: string | null
          fecha_fin_real?: string | null
          fecha_inicio_planeado?: string | null
          fecha_inicio_real?: string | null
          id?: string
          nombre?: string
          observaciones?: string | null
          prioridad?: number | null
          proyecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "proyectos_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      tickets_comentarios: {
        Row: {
          archivos_adjuntos: Json | null
          autor_externo: string | null
          autor_id: string | null
          contenido: string
          created_at: string | null
          es_publico: boolean | null
          id: string
          ticket_id: string
        }
        Insert: {
          archivos_adjuntos?: Json | null
          autor_externo?: string | null
          autor_id?: string | null
          contenido: string
          created_at?: string | null
          es_publico?: boolean | null
          id?: string
          ticket_id: string
        }
        Update: {
          archivos_adjuntos?: Json | null
          autor_externo?: string | null
          autor_id?: string | null
          contenido?: string
          created_at?: string | null
          es_publico?: boolean | null
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_comentarios_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets_soporte"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_soporte: {
        Row: {
          asignado_id: string | null
          asunto: string
          cliente_id: string
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_ticket"] | null
          fecha_resolucion: string | null
          id: string
          numero: string
          observaciones: string | null
          origen: string | null
          prioridad: Database["public"]["Enums"]["prioridad_ticket"] | null
          proyecto_id: string | null
          satisfaccion_cliente: number | null
          sla_horas: number | null
          updated_at: string | null
        }
        Insert: {
          asignado_id?: string | null
          asunto: string
          cliente_id: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_ticket"] | null
          fecha_resolucion?: string | null
          id?: string
          numero: string
          observaciones?: string | null
          origen?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_ticket"] | null
          proyecto_id?: string | null
          satisfaccion_cliente?: number | null
          sla_horas?: number | null
          updated_at?: string | null
        }
        Update: {
          asignado_id?: string | null
          asunto?: string
          cliente_id?: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_ticket"] | null
          fecha_resolucion?: string | null
          id?: string
          numero?: string
          observaciones?: string | null
          origen?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_ticket"] | null
          proyecto_id?: string | null
          satisfaccion_cliente?: number | null
          sla_horas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_soporte_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_soporte_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_soporte_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_soporte_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_soporte_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      tiie_historico: {
        Row: {
          created_at: string
          fecha: string
          fuente: string | null
          tasa: number
          tipo: string
        }
        Insert: {
          created_at?: string
          fecha: string
          fuente?: string | null
          tasa: number
          tipo?: string
        }
        Update: {
          created_at?: string
          fecha?: string
          fuente?: string | null
          tasa?: number
          tipo?: string
        }
        Relationships: []
      }
      umbrales_aprobacion: {
        Row: {
          activo: boolean | null
          created_at: string | null
          empresa_id: string | null
          id: string
          monto_max_mxn: number | null
          requiere_justificacion_arriba_de: number | null
          rol_o_atributo: string
          tipo_operacion: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          monto_max_mxn?: number | null
          requiere_justificacion_arriba_de?: number | null
          rol_o_atributo: string
          tipo_operacion: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          monto_max_mxn?: number | null
          requiere_justificacion_arriba_de?: number | null
          rol_o_atributo?: string
          tipo_operacion?: string
        }
        Relationships: [
          {
            foreignKeyName: "umbrales_aprobacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_negocio: {
        Row: {
          activa: boolean | null
          codigo: string
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          id: string
          nombre: string
        }
        Insert: {
          activa?: boolean | null
          codigo: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          id?: string
          nombre: string
        }
        Update: {
          activa?: boolean | null
          codigo?: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "unidades_negocio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_empresas: {
        Row: {
          activo: boolean | null
          atributos: string[] | null
          configuracion_atributos: Json | null
          created_at: string | null
          desde: string
          empresa_id: string
          hasta: string | null
          id: string
          puesto: string | null
          rol: Database["public"]["Enums"]["rol_usuario"]
          usuario_id: string
        }
        Insert: {
          activo?: boolean | null
          atributos?: string[] | null
          configuracion_atributos?: Json | null
          created_at?: string | null
          desde?: string
          empresa_id: string
          hasta?: string | null
          id?: string
          puesto?: string | null
          rol: Database["public"]["Enums"]["rol_usuario"]
          usuario_id: string
        }
        Update: {
          activo?: boolean | null
          atributos?: string[] | null
          configuracion_atributos?: Json | null
          created_at?: string | null
          desde?: string
          empresa_id?: string
          hasta?: string | null
          id?: string
          puesto?: string | null
          rol?: Database["public"]["Enums"]["rol_usuario"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vacaciones_solicitudes: {
        Row: {
          aprobado_por: string | null
          created_at: string | null
          dias: number
          empleado_id: string
          estado: string | null
          fecha_aprobacion: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          motivo: string | null
          observaciones: string | null
          tipo: string
          url_incapacidad: string | null
        }
        Insert: {
          aprobado_por?: string | null
          created_at?: string | null
          dias: number
          empleado_id: string
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          motivo?: string | null
          observaciones?: string | null
          tipo: string
          url_incapacidad?: string | null
        }
        Update: {
          aprobado_por?: string | null
          created_at?: string | null
          dias?: number
          empleado_id?: string
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          motivo?: string | null
          observaciones?: string | null
          tipo?: string
          url_incapacidad?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacaciones_solicitudes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacaciones_solicitudes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacaciones_solicitudes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      vehiculos: {
        Row: {
          anio: number | null
          asignado_a: string | null
          capturado_por: string | null
          color: string | null
          combustible: string | null
          costo_adquisicion: number | null
          created_at: string | null
          empresa_id: string
          estatus: Database["public"]["Enums"]["estatus_vehiculo"]
          factura_url: string | null
          fecha_adquisicion: string | null
          fecha_proximo_servicio: string | null
          fecha_termino_contrato: string | null
          fecha_ultimo_servicio: string | null
          fecha_vencimiento_seguro: string | null
          gasto_recurrente_id: string | null
          id: string
          km_actual: number | null
          km_proximo_servicio: number | null
          marca: string
          modelo: string
          numero_economico: string | null
          observaciones: string | null
          placa: string | null
          poliza_seguro: string | null
          proveedor_id: string | null
          proyecto_asignado_id: string | null
          serie: string | null
          tarjeta_circulacion_url: string | null
          tipo: string | null
          tipo_propiedad: Database["public"]["Enums"]["tipo_propiedad_vehiculo"]
          updated_at: string | null
          uso: string | null
        }
        Insert: {
          anio?: number | null
          asignado_a?: string | null
          capturado_por?: string | null
          color?: string | null
          combustible?: string | null
          costo_adquisicion?: number | null
          created_at?: string | null
          empresa_id: string
          estatus?: Database["public"]["Enums"]["estatus_vehiculo"]
          factura_url?: string | null
          fecha_adquisicion?: string | null
          fecha_proximo_servicio?: string | null
          fecha_termino_contrato?: string | null
          fecha_ultimo_servicio?: string | null
          fecha_vencimiento_seguro?: string | null
          gasto_recurrente_id?: string | null
          id?: string
          km_actual?: number | null
          km_proximo_servicio?: number | null
          marca: string
          modelo: string
          numero_economico?: string | null
          observaciones?: string | null
          placa?: string | null
          poliza_seguro?: string | null
          proveedor_id?: string | null
          proyecto_asignado_id?: string | null
          serie?: string | null
          tarjeta_circulacion_url?: string | null
          tipo?: string | null
          tipo_propiedad?: Database["public"]["Enums"]["tipo_propiedad_vehiculo"]
          updated_at?: string | null
          uso?: string | null
        }
        Update: {
          anio?: number | null
          asignado_a?: string | null
          capturado_por?: string | null
          color?: string | null
          combustible?: string | null
          costo_adquisicion?: number | null
          created_at?: string | null
          empresa_id?: string
          estatus?: Database["public"]["Enums"]["estatus_vehiculo"]
          factura_url?: string | null
          fecha_adquisicion?: string | null
          fecha_proximo_servicio?: string | null
          fecha_termino_contrato?: string | null
          fecha_ultimo_servicio?: string | null
          fecha_vencimiento_seguro?: string | null
          gasto_recurrente_id?: string | null
          id?: string
          km_actual?: number | null
          km_proximo_servicio?: number | null
          marca?: string
          modelo?: string
          numero_economico?: string | null
          observaciones?: string | null
          placa?: string | null
          poliza_seguro?: string | null
          proveedor_id?: string | null
          proyecto_asignado_id?: string | null
          serie?: string | null
          tarjeta_circulacion_url?: string | null
          tipo?: string | null
          tipo_propiedad?: Database["public"]["Enums"]["tipo_propiedad_vehiculo"]
          updated_at?: string | null
          uso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_gasto_recurrente_id_fkey"
            columns: ["gasto_recurrente_id"]
            isOneToOne: false
            referencedRelation: "gastos_recurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_gasto_recurrente_id_fkey"
            columns: ["gasto_recurrente_id"]
            isOneToOne: false
            referencedRelation: "v_gastos_recurrentes_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_proyecto_asignado_id_fkey"
            columns: ["proyecto_asignado_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_proyecto_asignado_id_fkey"
            columns: ["proyecto_asignado_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      vehiculos_bitacora: {
        Row: {
          capturado_por: string | null
          cfdi_relacionado_id: string | null
          comprobante_url: string | null
          conductor_id: string | null
          created_at: string | null
          descripcion: string
          fecha: string
          id: string
          iva: number | null
          km_lectura: number | null
          km_recorridos: number | null
          litros: number | null
          monto: number | null
          observaciones: string | null
          precio_por_litro: number | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          tipo: Database["public"]["Enums"]["tipo_evento_vehiculo"]
          vehiculo_id: string
        }
        Insert: {
          capturado_por?: string | null
          cfdi_relacionado_id?: string | null
          comprobante_url?: string | null
          conductor_id?: string | null
          created_at?: string | null
          descripcion: string
          fecha?: string
          id?: string
          iva?: number | null
          km_lectura?: number | null
          km_recorridos?: number | null
          litros?: number | null
          monto?: number | null
          observaciones?: string | null
          precio_por_litro?: number | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          tipo: Database["public"]["Enums"]["tipo_evento_vehiculo"]
          vehiculo_id: string
        }
        Update: {
          capturado_por?: string | null
          cfdi_relacionado_id?: string | null
          comprobante_url?: string | null
          conductor_id?: string | null
          created_at?: string | null
          descripcion?: string
          fecha?: string
          id?: string
          iva?: number | null
          km_lectura?: number | null
          km_recorridos?: number | null
          litros?: number | null
          monto?: number | null
          observaciones?: string | null
          precio_por_litro?: number | null
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          tipo?: Database["public"]["Enums"]["tipo_evento_vehiculo"]
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_bitacora_cfdi_relacionado_id_fkey"
            columns: ["cfdi_relacionado_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_bitacora_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_bitacora_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_bitacora_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "v_vehiculos_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_bitacora_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos_documentos: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_documento_vehiculo"]
          created_at: string | null
          descripcion: string | null
          emisor: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          id: string
          mime_type: string | null
          monto: number | null
          nombre: string
          numero_documento: string | null
          storage_path: string
          subido_por: string | null
          subido_por_nombre: string | null
          tamano_bytes: number | null
          updated_at: string | null
          vehiculo_id: string
          visible_conductor: boolean | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_documento_vehiculo"]
          created_at?: string | null
          descripcion?: string | null
          emisor?: string | null
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          mime_type?: string | null
          monto?: number | null
          nombre: string
          numero_documento?: string | null
          storage_path: string
          subido_por?: string | null
          subido_por_nombre?: string | null
          tamano_bytes?: number | null
          updated_at?: string | null
          vehiculo_id: string
          visible_conductor?: boolean | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_documento_vehiculo"]
          created_at?: string | null
          descripcion?: string | null
          emisor?: string | null
          fecha_emision?: string | null
          fecha_vencimiento?: string | null
          id?: string
          mime_type?: string | null
          monto?: number | null
          nombre?: string
          numero_documento?: string | null
          storage_path?: string
          subido_por?: string | null
          subido_por_nombre?: string | null
          tamano_bytes?: number | null
          updated_at?: string | null
          vehiculo_id?: string
          visible_conductor?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_documentos_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "v_vehiculos_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_documentos_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      viajes_solicitudes: {
        Row: {
          anticipo_otorgado: number | null
          aprobado_por: string | null
          comprobantes: Json | null
          created_at: string | null
          destino: string
          empleado_id: string
          estado: string | null
          fecha_aprobacion: string | null
          fecha_fin: string
          fecha_inicio: string
          id: string
          motivo: string
          presupuesto_estimado: number | null
          proyecto_id: string | null
          reporte: string | null
          total_comprobado: number | null
        }
        Insert: {
          anticipo_otorgado?: number | null
          aprobado_por?: string | null
          comprobantes?: Json | null
          created_at?: string | null
          destino: string
          empleado_id: string
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_fin: string
          fecha_inicio: string
          id?: string
          motivo: string
          presupuesto_estimado?: number | null
          proyecto_id?: string | null
          reporte?: string | null
          total_comprobado?: number | null
        }
        Update: {
          anticipo_otorgado?: number | null
          aprobado_por?: string | null
          comprobantes?: Json | null
          created_at?: string | null
          destino?: string
          empleado_id?: string
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          motivo?: string
          presupuesto_estimado?: number | null
          proyecto_id?: string | null
          reporte?: string | null
          total_comprobado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "viajes_solicitudes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_solicitudes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viajes_solicitudes_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
        ]
      }
      viaticos: {
        Row: {
          aprobado_por: string | null
          capturado_por: string
          categoria: string
          cfdi_id: string | null
          concepto: string
          created_at: string | null
          empleado_id: string
          empresa_id: string
          estado: string | null
          fecha_aprobacion: string | null
          fecha_gasto: string
          fecha_reembolso: string | null
          id: string
          monto: number
          motivo_rechazo: string | null
          observaciones: string | null
          proyecto_id: string | null
          url_ticket: string | null
          url_xml: string | null
        }
        Insert: {
          aprobado_por?: string | null
          capturado_por: string
          categoria: string
          cfdi_id?: string | null
          concepto: string
          created_at?: string | null
          empleado_id: string
          empresa_id: string
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_gasto: string
          fecha_reembolso?: string | null
          id?: string
          monto: number
          motivo_rechazo?: string | null
          observaciones?: string | null
          proyecto_id?: string | null
          url_ticket?: string | null
          url_xml?: string | null
        }
        Update: {
          aprobado_por?: string | null
          capturado_por?: string
          categoria?: string
          cfdi_id?: string | null
          concepto?: string
          created_at?: string | null
          empleado_id?: string
          empresa_id?: string
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_gasto?: string
          fecha_reembolso?: string | null
          id?: string
          monto?: number
          motivo_rechazo?: string | null
          observaciones?: string | null
          proyecto_id?: string | null
          url_ticket?: string | null
          url_xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viaticos_cfdi_id_fkey"
            columns: ["cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "empleados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_repse_alertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_empleado_id_fkey"
            columns: ["empleado_id"]
            isOneToOne: false
            referencedRelation: "v_saldo_vacaciones"
            referencedColumns: ["empleado_id"]
          },
          {
            foreignKeyName: "viaticos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viaticos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
    }
    Views: {
      v_bancos_cuentas_full: {
        Row: {
          activa: boolean | null
          alias: string | null
          asesor: string | null
          banco: string | null
          clabe: string | null
          contrato: string | null
          cuenta_garantia_id: string | null
          empresa_codigo: string | null
          empresa_id: string | null
          fecha_actualizacion_saldo: string | null
          id: string | null
          inversion_emisora: string | null
          inversion_es_garantia: boolean | null
          inversion_precio_titulo: number | null
          inversion_rendimiento_mensual_pct: number | null
          inversion_titulos: number | null
          linea_credito_disponible: number | null
          linea_credito_dispuesto: number | null
          linea_credito_fecha_apertura: string | null
          linea_credito_fecha_vencimiento: string | null
          linea_credito_monto_aprobado: number | null
          linea_credito_pagos_pendientes: number | null
          linea_credito_proximo_pago_fecha: string | null
          linea_credito_proximo_pago_monto: number | null
          linea_credito_tasa_efectiva: number | null
          linea_credito_tasa_referencia: string | null
          linea_credito_tasa_spread: number | null
          moneda: string | null
          numero_cuenta: string | null
          saldo_actual: number | null
          spid: string | null
          tipo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_cuentas_cuenta_garantia_id_fkey"
            columns: ["cuenta_garantia_id"]
            isOneToOne: false
            referencedRelation: "bancos_cuentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_cuentas_cuenta_garantia_id_fkey"
            columns: ["cuenta_garantia_id"]
            isOneToOne: false
            referencedRelation: "v_bancos_cuentas_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_cuentas_cuenta_garantia_id_fkey"
            columns: ["cuenta_garantia_id"]
            isOneToOne: false
            referencedRelation: "v_conciliacion_mensual"
            referencedColumns: ["cuenta_id"]
          },
          {
            foreignKeyName: "bancos_cuentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_centros_balance: {
        Row: {
          anio: number | null
          centro_id: string | null
          centro_padre_id: string | null
          codigo: string | null
          empresa_id: string | null
          mes: number | null
          nombre: string | null
          num_movimientos: number | null
          resultado_neto: number | null
          subtipo: Database["public"]["Enums"]["subtipo_centro"] | null
          tipo: Database["public"]["Enums"]["tipo_centro"] | null
          total_costos: number | null
          total_ingresos: number | null
          total_repartos_emitidos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "centros_centro_padre_id_fkey"
            columns: ["centro_padre_id"]
            isOneToOne: false
            referencedRelation: "centros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centros_centro_padre_id_fkey"
            columns: ["centro_padre_id"]
            isOneToOne: false
            referencedRelation: "v_centros_balance"
            referencedColumns: ["centro_id"]
          },
          {
            foreignKeyName: "centros_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_clientes_inactividad: {
        Row: {
          activo: boolean | null
          cp_fiscal: string | null
          created_at: string | null
          cuenta_bancaria: Json | null
          curp: string | null
          direccion_entrega: Json | null
          direccion_fiscal: Json | null
          email_facturacion: string | null
          estado: Database["public"]["Enums"]["estado_entidad"] | null
          estado_modificado_at: string | null
          estado_modificado_por: string | null
          estado_motivo: string | null
          id: string | null
          nombre_comercial: string | null
          observaciones: string | null
          razon_social: string | null
          regimen_fiscal: string | null
          rfc: string | null
          riesgo: string | null
          score_pago: number | null
          score_satisfaccion: number | null
          segmento: string | null
          sugerido_archivar: boolean | null
          tipo: string | null
          ultima_actividad: string | null
          updated_at: string | null
          uso_cfdi_default: string | null
        }
        Insert: {
          activo?: boolean | null
          cp_fiscal?: string | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string | null
          direccion_entrega?: Json | null
          direccion_fiscal?: Json | null
          email_facturacion?: string | null
          estado?: Database["public"]["Enums"]["estado_entidad"] | null
          estado_modificado_at?: string | null
          estado_modificado_por?: string | null
          estado_motivo?: string | null
          id?: string | null
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          riesgo?: string | null
          score_pago?: number | null
          score_satisfaccion?: number | null
          segmento?: string | null
          sugerido_archivar?: never
          tipo?: string | null
          ultima_actividad?: never
          updated_at?: string | null
          uso_cfdi_default?: string | null
        }
        Update: {
          activo?: boolean | null
          cp_fiscal?: string | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string | null
          direccion_entrega?: Json | null
          direccion_fiscal?: Json | null
          email_facturacion?: string | null
          estado?: Database["public"]["Enums"]["estado_entidad"] | null
          estado_modificado_at?: string | null
          estado_modificado_por?: string | null
          estado_motivo?: string | null
          id?: string | null
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social?: string | null
          regimen_fiscal?: string | null
          rfc?: string | null
          riesgo?: string | null
          score_pago?: number | null
          score_satisfaccion?: number | null
          segmento?: string | null
          sugerido_archivar?: never
          tipo?: string | null
          ultima_actividad?: never
          updated_at?: string | null
          uso_cfdi_default?: string | null
        }
        Relationships: []
      }
      v_conciliacion_mensual: {
        Row: {
          abonos_conciliados: number | null
          cargos_conciliados: number | null
          cuenta_id: string | null
          empresa_id: string | null
          mes: string | null
          num_conciliados: number | null
          num_movs: number | null
          num_pendientes: number | null
          total_abonos: number | null
          total_cargos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_cuentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cotizaciones_lista: {
        Row: {
          aprobada_internamente: boolean | null
          cliente_id: string | null
          cliente_nombre_comercial: string | null
          cliente_razon_social: string | null
          cliente_rfc: string | null
          created_at: string | null
          descuento: number | null
          empresa_codigo: string | null
          empresa_id: string | null
          empresa_razon_social: string | null
          enviada_a_cliente: boolean | null
          estado: string | null
          estado_computado: string | null
          fecha_emision: string | null
          fecha_envio: string | null
          fecha_vencimiento: string | null
          id: string | null
          iva: number | null
          num_conceptos: number | null
          numero: string | null
          oportunidad_id: string | null
          subtotal: number | null
          total: number | null
          version: number | null
          vigencia_dias: number | null
          vista_por_cliente: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_clientes_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotizaciones_oportunidad_id_fkey"
            columns: ["oportunidad_id"]
            isOneToOne: false
            referencedRelation: "oportunidades"
            referencedColumns: ["id"]
          },
        ]
      }
      v_cumplimiento_mensual: {
        Row: {
          anio: number | null
          efm_completo: boolean | null
          efm_firmados: boolean | null
          efm_id: string | null
          egresos_totales: number | null
          empresa_codigo: string | null
          empresa_id: string | null
          flujo_efectivo: number | null
          ingresos_totales: number | null
          iva_acreditable: number | null
          iva_trasladado: number | null
          mes: number | null
          obligaciones_completadas: number | null
          obligaciones_fuera_plazo: number | null
          obligaciones_pagadas: number | null
          semaforo: string | null
          total_obligaciones: number | null
          total_pagado_sat: number | null
          utilidad_neta: number | null
        }
        Relationships: []
      }
      v_estados_financieros_lista: {
        Row: {
          anio: number | null
          created_at: string | null
          documentos: Json | null
          egresos_totales: number | null
          empresa_codigo: string | null
          empresa_id: string | null
          empresa_razon_social: string | null
          firmados: boolean | null
          id: string | null
          ingresos_totales: number | null
          mes: number | null
          mes_nombre: string | null
          num_documentos: number | null
          paquete_completo: boolean | null
          periodo: string | null
          utilidad_neta: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estados_financieros_mensuales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_gastos_recurrentes_lista: {
        Row: {
          activo: boolean | null
          categoria:
            | Database["public"]["Enums"]["categoria_gasto_recurrente"]
            | null
          contrato_url: string | null
          created_at: string | null
          descripcion: string | null
          dia_pago: number | null
          empresa_codigo: string | null
          empresa_id: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          frecuencia: Database["public"]["Enums"]["frecuencia_gasto"] | null
          id: string | null
          identificador: string | null
          iva_incluido: boolean | null
          moneda: string | null
          monto: number | null
          monto_mensualizado: number | null
          observaciones: string | null
          proveedor_display: string | null
          proveedor_id: string | null
          proveedor_razon_social: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gastos_recurrentes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_recurrentes_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_recurrentes_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventario_movimientos: {
        Row: {
          almacen_codigo: string | null
          almacen_destino_id: string | null
          almacen_id: string | null
          almacen_nombre: string | null
          autorizado_por: string | null
          cantidad: number | null
          capturado_por: string | null
          capturado_por_nombre: string | null
          cfdi_id: string | null
          costo_unitario: number | null
          created_at: string | null
          empresa_id: string | null
          fecha: string | null
          id: string | null
          monto_total: number | null
          motivo: string | null
          movimiento_relacionado_id: string | null
          numero_documento: string | null
          observaciones: string | null
          oc_id: string | null
          producto_codigo: string | null
          producto_empresa_id: string | null
          producto_id: string | null
          producto_nombre: string | null
          proveedor_id: string | null
          proveedor_nombre: string | null
          proyecto_codigo: string | null
          proyecto_id: string | null
          proyecto_nombre: string | null
          serie_id: string | null
          tipo: string | null
          unidad_medida: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_productos_empresa_id_fkey"
            columns: ["producto_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_almacen_destino_id_fkey"
            columns: ["almacen_destino_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_cfdi_id_fkey"
            columns: ["cfdi_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_movimiento_relacionado_id_fkey"
            columns: ["movimiento_relacionado_id"]
            isOneToOne: false
            referencedRelation: "inventario_movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_movimiento_relacionado_id_fkey"
            columns: ["movimiento_relacionado_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_movimientos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_stock"
            referencedColumns: ["producto_id"]
          },
          {
            foreignKeyName: "inventario_movimientos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "v_proveedores_inactividad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "inventario_movimientos_serie_id_fkey"
            columns: ["serie_id"]
            isOneToOne: false
            referencedRelation: "productos_serie"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventario_stock: {
        Row: {
          categoria: string | null
          costo_maximo: number | null
          costo_minimo: number | null
          costo_promedio: number | null
          costo_ultimo: number | null
          descripcion: string | null
          empresa_id: string | null
          estado_stock: string | null
          fecha_actualizacion_valor: string | null
          imagen_url: string | null
          marca: string | null
          modelo: string | null
          nombre: string | null
          producto_id: string | null
          sku: string | null
          stock_actual: number | null
          stock_maximo: number | null
          stock_minimo: number | null
          subcategoria: string | null
          ultimo_movimiento_fecha: string | null
          unidad_medida: string | null
          valor_costo: number | null
          valor_mercado: number | null
          valor_mercado_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_productos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_inventario_stock_almacen: {
        Row: {
          almacen_codigo: string | null
          almacen_id: string | null
          almacen_nombre: string | null
          empresa_id: string | null
          nombre: string | null
          producto_id: string | null
          sku: string | null
          stock: number | null
          unidad_medida: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_productos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_almacen_id_fkey"
            columns: ["almacen_id"]
            isOneToOne: false
            referencedRelation: "almacenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "v_inventario_stock"
            referencedColumns: ["producto_id"]
          },
        ]
      }
      v_matriz_inter_co: {
        Row: {
          empresa_acreedora_id: string | null
          empresa_deudora_id: string | null
          intereses_devengados: number | null
          num_prestamos: number | null
          saldo_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prestamos_inter_co_empresa_acreedora_id_fkey"
            columns: ["empresa_acreedora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestamos_inter_co_empresa_deudora_id_fkey"
            columns: ["empresa_deudora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_obligaciones_lista: {
        Row: {
          created_at: string | null
          dias_al_vencer: number | null
          empresa_codigo: string | null
          empresa_id: string | null
          estado: Database["public"]["Enums"]["estado_obligacion"] | null
          estado_efectivo:
            | Database["public"]["Enums"]["estado_obligacion"]
            | null
          fecha_pago: string | null
          fecha_presentacion: string | null
          fecha_vencimiento: string | null
          id: string | null
          monto_calculado: number | null
          monto_pagado: number | null
          numero_operacion: string | null
          periodo_anio: number | null
          periodo_label: string | null
          periodo_mes: number | null
          tipo: Database["public"]["Enums"]["tipo_obligacion_sat"] | null
          url_acuse: string | null
          url_comprobante: string | null
        }
        Relationships: [
          {
            foreignKeyName: "obligaciones_sat_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_proveedores_inactividad: {
        Row: {
          activo: boolean | null
          beneficiario_controlador: Json | null
          categoria_sat: string | null
          clasificacion_interna: string | null
          cp_fiscal: string | null
          created_at: string | null
          cuenta_bancaria: Json | null
          curp: string | null
          direccion_fiscal: Json | null
          esta_aprobado: boolean | null
          estado: Database["public"]["Enums"]["estado_entidad"] | null
          estado_modificado_at: string | null
          estado_modificado_por: string | null
          estado_motivo: string | null
          evaluacion_promedio: number | null
          fecha_aprobacion: string | null
          id: string | null
          nombre_comercial: string | null
          observaciones: string | null
          razon_social: string | null
          regimen_fiscal: string | null
          representante_legal: string | null
          requiere_repse: boolean | null
          rfc: string | null
          rfc_representante: string | null
          semaforo: string | null
          sugerido_archivar: boolean | null
          tipo_proveedor: string | null
          ultima_actividad: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          beneficiario_controlador?: Json | null
          categoria_sat?: string | null
          clasificacion_interna?: string | null
          cp_fiscal?: string | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string | null
          direccion_fiscal?: Json | null
          esta_aprobado?: boolean | null
          estado?: Database["public"]["Enums"]["estado_entidad"] | null
          estado_modificado_at?: string | null
          estado_modificado_por?: string | null
          estado_motivo?: string | null
          evaluacion_promedio?: number | null
          fecha_aprobacion?: string | null
          id?: string | null
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social?: string | null
          regimen_fiscal?: string | null
          representante_legal?: string | null
          requiere_repse?: boolean | null
          rfc?: string | null
          rfc_representante?: string | null
          semaforo?: string | null
          sugerido_archivar?: never
          tipo_proveedor?: string | null
          ultima_actividad?: never
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          beneficiario_controlador?: Json | null
          categoria_sat?: string | null
          clasificacion_interna?: string | null
          cp_fiscal?: string | null
          created_at?: string | null
          cuenta_bancaria?: Json | null
          curp?: string | null
          direccion_fiscal?: Json | null
          esta_aprobado?: boolean | null
          estado?: Database["public"]["Enums"]["estado_entidad"] | null
          estado_modificado_at?: string | null
          estado_modificado_por?: string | null
          estado_motivo?: string | null
          evaluacion_promedio?: number | null
          fecha_aprobacion?: string | null
          id?: string | null
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social?: string | null
          regimen_fiscal?: string | null
          representante_legal?: string | null
          requiere_repse?: boolean | null
          rfc?: string | null
          rfc_representante?: string | null
          semaforo?: string | null
          sugerido_archivar?: never
          tipo_proveedor?: string | null
          ultima_actividad?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      v_proyecto_avance: {
        Row: {
          avance_ponderado: number | null
          avance_promedio: number | null
          codigo: string | null
          costo_estimado_total: number | null
          costo_real_total: number | null
          estado: Database["public"]["Enums"]["estado_proyecto"] | null
          hitos_completados: number | null
          horas_estimadas_total: number | null
          horas_reales_total: number | null
          nombre: string | null
          proyecto_id: string | null
          tareas_bloqueadas: number | null
          tareas_completadas: number | null
          tareas_en_curso: number | null
          total_hitos: number | null
          total_tareas: number | null
        }
        Relationships: []
      }
      v_proyecto_bitacora: {
        Row: {
          adjuntos: Json | null
          capturado_por: string | null
          capturado_por_nombre: string | null
          created_at: string | null
          descripcion: string | null
          es_critica: boolean | null
          fecha: string | null
          id: string | null
          proyecto_id: string | null
          tarea_id: string | null
          tarea_titulo: string | null
          tipo: Database["public"]["Enums"]["tipo_evento_bitacora"] | null
          titulo: string | null
          visible_cliente: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_bitacora_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_bitacora_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_bitacora_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "proyecto_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_bitacora_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_tareas_lista"
            referencedColumns: ["id"]
          },
        ]
      }
      v_proyecto_reportes_lista: {
        Row: {
          accion_correctiva: string | null
          adjuntos: Json | null
          contenido: string | null
          creado_por: string | null
          creado_por_nombre: string | null
          created_at: string | null
          enviado_a: string[] | null
          estado: Database["public"]["Enums"]["estado_reporte"] | null
          fecha_compromiso: string | null
          fecha_envio: string | null
          fecha_evento: string | null
          fecha_reporte: string | null
          fecha_resolucion: string | null
          id: string | null
          impacto: string | null
          numero: string | null
          proyecto_codigo: string | null
          proyecto_empresa_id: string | null
          proyecto_id: string | null
          proyecto_nombre: string | null
          responsable_nombre: string | null
          responsable_seguimiento: string | null
          resumen: string | null
          severidad: Database["public"]["Enums"]["severidad_reporte"] | null
          tarea_id: string | null
          tarea_titulo: string | null
          tipo: Database["public"]["Enums"]["tipo_reporte_proyecto"] | null
          titulo: string | null
          ubicacion: string | null
          updated_at: string | null
          visible_cliente: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_reportes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_reportes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyecto_reportes_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "proyecto_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_reportes_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_tareas_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_empresa_id_fkey"
            columns: ["proyecto_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_proyecto_solicitudes_lista: {
        Row: {
          administrador_id: string | null
          asignado_a_id: string | null
          campos_tipo: Json | null
          created_at: string | null
          descripcion: string | null
          dias_abierta: number | null
          empresa_codigo: string | null
          empresa_id: string | null
          entidades_relacionadas: Json | null
          estado: Database["public"]["Enums"]["estado_solicitud"] | null
          id: string | null
          monto_estimado: number | null
          num_adjuntos: number | null
          num_comentarios: number | null
          numero: string | null
          pm_id: string | null
          proyecto_codigo: string | null
          proyecto_id: string | null
          proyecto_nombre: string | null
          razon_rechazo: string | null
          resuelta_at: string | null
          solicitante_id: string | null
          tipo: Database["public"]["Enums"]["tipo_solicitud_proyecto"] | null
          titulo: string | null
          updated_at: string | null
          urgencia: Database["public"]["Enums"]["urgencia_solicitud"] | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_solicitudes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_solicitudes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_solicitudes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      v_proyecto_tareas_lista: {
        Row: {
          asignado_a: string | null
          capturado_por: string | null
          cfdi_relacionado_id: string | null
          costo_estimado: number | null
          costo_real: number | null
          created_at: string | null
          depende_de: string[] | null
          descripcion: string | null
          duracion_dias: number | null
          es_hito: boolean | null
          estado: Database["public"]["Enums"]["estado_tarea_proyecto"] | null
          fecha_fin_planeada: string | null
          fecha_fin_real: string | null
          fecha_inicio_planeada: string | null
          fecha_inicio_real: string | null
          horas_estimadas: number | null
          horas_reales: number | null
          id: string | null
          observaciones: string | null
          oc_relacionada_id: string | null
          orden: number | null
          parent_id: string | null
          porcentaje_avance: number | null
          prioridad: Database["public"]["Enums"]["prioridad_tarea"] | null
          proyecto_codigo: string | null
          proyecto_empresa_id: string | null
          proyecto_id: string | null
          proyecto_nombre: string | null
          titulo: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyecto_tareas_cfdi_relacionado_id_fkey"
            columns: ["cfdi_relacionado_id"]
            isOneToOne: false
            referencedRelation: "cfdi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_oc_relacionada_id_fkey"
            columns: ["oc_relacionada_id"]
            isOneToOne: false
            referencedRelation: "ordenes_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "proyecto_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_tareas_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyecto_tareas_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyectos_empresa_id_fkey"
            columns: ["proyecto_empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_repse_alertas: {
        Row: {
          dias_para_vencer: number | null
          empresa_id: string | null
          estado_repse: string | null
          folio_repse: string | null
          id: string | null
          nombre_completo: string | null
          numero_empleado: string | null
          vigencia_repse_hasta: string | null
        }
        Insert: {
          dias_para_vencer?: never
          empresa_id?: string | null
          estado_repse?: never
          folio_repse?: string | null
          id?: string | null
          nombre_completo?: string | null
          numero_empleado?: string | null
          vigencia_repse_hasta?: string | null
        }
        Update: {
          dias_para_vencer?: never
          empresa_id?: string | null
          estado_repse?: never
          folio_repse?: string | null
          id?: string | null
          nombre_completo?: string | null
          numero_empleado?: string | null
          vigencia_repse_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_saldo_bancos_por_empresa: {
        Row: {
          empresa_id: string | null
          num_cuentas: number | null
          saldo_total: number | null
          ultima_actualizacion: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_cuentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_saldo_vacaciones: {
        Row: {
          dias_anuales_lft: number | null
          dias_disponibles: number | null
          dias_tomados_periodo: number | null
          empleado_id: string | null
          empresa_id: string | null
          fecha_ingreso: string | null
          nombre_completo: string | null
        }
        Insert: {
          dias_anuales_lft?: never
          dias_disponibles?: never
          dias_tomados_periodo?: never
          empleado_id?: string | null
          empresa_id?: string | null
          fecha_ingreso?: string | null
          nombre_completo?: string | null
        }
        Update: {
          dias_anuales_lft?: never
          dias_disponibles?: never
          dias_tomados_periodo?: never
          empleado_id?: string | null
          empresa_id?: string | null
          fecha_ingreso?: string | null
          nombre_completo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empleados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vehiculos_documentos_alertas: {
        Row: {
          categoria:
            | Database["public"]["Enums"]["categoria_documento_vehiculo"]
            | null
          created_at: string | null
          descripcion: string | null
          dias_para_vencer: number | null
          emisor: string | null
          empresa_id: string | null
          estado_vencimiento: string | null
          fecha_emision: string | null
          fecha_vencimiento: string | null
          id: string | null
          marca: string | null
          mime_type: string | null
          modelo: string | null
          monto: number | null
          nombre: string | null
          numero_documento: string | null
          placa: string | null
          storage_path: string | null
          subido_por: string | null
          subido_por_nombre: string | null
          tamano_bytes: number | null
          updated_at: string | null
          vehiculo_id: string | null
          visible_conductor: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_documentos_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "v_vehiculos_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_documentos_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      v_vehiculos_lista: {
        Row: {
          anio: number | null
          asignado_a: string | null
          color: string | null
          combustible: string | null
          combustible_12m: number | null
          created_at: string | null
          empresa_codigo: string | null
          empresa_id: string | null
          estatus: Database["public"]["Enums"]["estatus_vehiculo"] | null
          fecha_proximo_servicio: string | null
          fecha_termino_contrato: string | null
          fecha_ultimo_servicio: string | null
          fecha_vencimiento_seguro: string | null
          gasto_12m: number | null
          gasto_recurrente_id: string | null
          id: string | null
          km_actual: number | null
          km_proximo_servicio: number | null
          mantenimiento_12m: number | null
          marca: string | null
          mensualidad_arrendamiento: number | null
          modelo: string | null
          numero_economico: string | null
          placa: string | null
          proyecto_asignado_id: string | null
          tipo: string | null
          tipo_propiedad:
            | Database["public"]["Enums"]["tipo_propiedad_vehiculo"]
            | null
          uso: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_gasto_recurrente_id_fkey"
            columns: ["gasto_recurrente_id"]
            isOneToOne: false
            referencedRelation: "gastos_recurrentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_gasto_recurrente_id_fkey"
            columns: ["gasto_recurrente_id"]
            isOneToOne: false
            referencedRelation: "v_gastos_recurrentes_lista"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_proyecto_asignado_id_fkey"
            columns: ["proyecto_asignado_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehiculos_proyecto_asignado_id_fkey"
            columns: ["proyecto_asignado_id"]
            isOneToOne: false
            referencedRelation: "v_proyecto_avance"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
    }
    Functions: {
      calcular_semaforo_proveedor: {
        Args: { p_proveedor_id: string }
        Returns: string
      }
      cfdi_kpis_filtrados: {
        Args: {
          p_desde?: string
          p_direccion?: string
          p_empresa_id?: string
          p_estado?: string
          p_forma_pago?: string
          p_hasta?: string
          p_monto_min?: number
          p_q?: string
        }
        Returns: {
          cxc: number
          cxp: number
          iva_acreditable: number
          iva_trasladado: number
          n_emitidos: number
          n_recibidos: number
          total_emitido: number
          total_recibido: number
        }[]
      }
      devengar_intereses_dia: { Args: { p_fecha?: string }; Returns: number }
      dias_vacaciones_lft: {
        Args: { p_fecha_corte?: string; p_fecha_ingreso: string }
        Returns: number
      }
      empresa_actual: { Args: never; Returns: string }
      empresas_del_usuario: { Args: never; Returns: string[] }
      generar_numero_cotizacion: {
        Args: { p_empresa_id: string }
        Returns: string
      }
      generar_numero_prestamo: { Args: never; Returns: string }
      generar_obligaciones_anuales: {
        Args: { p_anio: number; p_empresa_id: string }
        Returns: number
      }
      limpiar_eventos_uso_antiguos: {
        Args: { p_dias?: number }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sugerir_match_movimiento: {
        Args: { p_movimiento_id: string }
        Returns: {
          contraparte: string
          fecha: string
          match_id: string
          monto: number
          numero_o_folio: string
          similitud: number
          tipo: string
        }[]
      }
      tiie_mas_reciente: { Args: never; Returns: number }
      top_paginas_uso: {
        Args: { p_dias?: number }
        Returns: {
          pagina: string
          usuarios_unicos: number
          visitas: number
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
      usuario_activo_grupo: { Args: never; Returns: boolean }
      usuario_es_ceo: { Args: never; Returns: boolean }
      usuario_puede_gestionar_catalogos: { Args: never; Returns: boolean }
      usuario_tiene_atributo: { Args: { p_atributo: string }; Returns: boolean }
      usuario_tiene_rol_en_empresa: {
        Args: { p_empresa_id: string; p_roles: string[] }
        Returns: boolean
      }
    }
    Enums: {
      categoria_documento_proyecto:
        | "contrato"
        | "plano"
        | "especificacion"
        | "diseno"
        | "cotizacion"
        | "foto"
        | "manual"
        | "permiso"
        | "acta"
        | "otro"
      categoria_documento_vehiculo:
        | "factura"
        | "seguro"
        | "tarjeta_circulacion"
        | "verificacion"
        | "tenencia"
        | "permiso_carga"
        | "permiso_federal"
        | "manual"
        | "contrato_arrendamiento"
        | "foto"
        | "placas"
        | "tarjeton_acceso"
        | "otro"
      categoria_gasto_recurrente:
        | "arrendamiento_vehiculo"
        | "renta_inmueble"
        | "telefonia_internet"
        | "software_saas"
        | "seguros"
        | "vigilancia"
        | "mantenimiento"
        | "limpieza"
        | "servicios_publicos"
        | "membresia_camara"
        | "asesoria_contable"
        | "asesoria_legal"
        | "otros_indirectos"
      categoria_inventario:
        | "panel_solar"
        | "inversor"
        | "estructura"
        | "cable"
        | "herraje"
        | "tablero"
        | "proteccion"
        | "monitoreo"
        | "baterias"
        | "herramienta"
        | "consumible"
        | "epp"
        | "otro"
      categoria_personal: "planta" | "por_obra" | "repse"
      categoria_sugerencia:
        | "bug"
        | "mejora_ux"
        | "feature_nuevo"
        | "rendimiento"
        | "otro"
      estado_capacitacion:
        | "inscrito"
        | "en_proceso"
        | "completado"
        | "reprobado"
        | "no_asistio"
      estado_cfdi:
        | "borrador"
        | "timbrado"
        | "enviado_cliente"
        | "pagado"
        | "cancelado"
      estado_entidad: "activo" | "inactivo" | "archivado"
      estado_no_conformidad:
        | "abierta"
        | "en_analisis"
        | "en_accion"
        | "cerrada"
        | "reabierta"
      estado_obligacion:
        | "pendiente"
        | "en_proceso"
        | "presentada"
        | "pagada"
        | "rechazada"
        | "fuera_plazo"
        | "extemporanea"
        | "no_aplica"
      estado_oc:
        | "borrador"
        | "pendiente_aprobacion"
        | "aprobada"
        | "enviada"
        | "parcial_recibida"
        | "recibida"
        | "pagada"
        | "cancelada"
      estado_oportunidad:
        | "lead"
        | "calificado"
        | "visita_tecnica"
        | "cotizacion_proceso"
        | "cotizacion_enviada"
        | "negociacion"
        | "ganado"
        | "perdido"
      estado_ot:
        | "solicitada"
        | "aprobada"
        | "en_proceso"
        | "completada_origen"
        | "confirmada_destino"
        | "lista_cobrar"
        | "facturada"
        | "cobrada"
        | "cancelada"
      estado_prestamo:
        | "solicitado"
        | "aprobado"
        | "ejecutado"
        | "confirmado"
        | "pagado_total"
        | "pagado_parcial"
        | "cancelado"
      estado_proyecto:
        | "cotizacion"
        | "contrato_firmado"
        | "planeacion"
        | "en_ejecucion"
        | "en_cierre"
        | "entregado"
        | "en_om"
        | "cerrado"
        | "cancelado"
      estado_reporte:
        | "borrador"
        | "emitido"
        | "en_seguimiento"
        | "resuelto"
        | "cerrado"
      estado_solicitud:
        | "solicitada"
        | "en_revision"
        | "aprobada"
        | "rechazada"
        | "ejecutada"
        | "cerrada"
      estado_sugerencia:
        | "nueva"
        | "en_revision"
        | "planeada"
        | "implementada"
        | "descartada"
      estado_tarea_proyecto:
        | "pendiente"
        | "en_curso"
        | "bloqueada"
        | "completada"
        | "cancelada"
      estado_ticket:
        | "abierto"
        | "en_proceso"
        | "esperando_cliente"
        | "resuelto"
        | "cerrado"
      estatus_vehiculo:
        | "activo"
        | "mantenimiento"
        | "reparacion"
        | "fuera_servicio"
        | "baja"
      frecuencia_gasto:
        | "mensual"
        | "bimestral"
        | "trimestral"
        | "semestral"
        | "anual"
      metodo_reparto:
        | "porcentaje_fijo"
        | "por_ingresos"
        | "por_empleados"
        | "por_proyectos"
        | "por_horas"
      nivel_autonomia_ia: "verde" | "amarillo" | "rojo"
      prioridad_tarea: "baja" | "media" | "alta" | "urgente"
      prioridad_ticket: "baja" | "media" | "alta" | "critica"
      rol_proyecto:
        | "pm"
        | "vendedor"
        | "supervisor_obra"
        | "ingeniero_diseno"
        | "ingeniero_electrico"
        | "instalador"
        | "soporte"
        | "admin_proyecto"
        | "cliente_contacto"
        | "observador"
      rol_usuario: "ceo" | "director" | "operativo" | "empleado" | "cliente"
      severidad_no_conformidad: "observacion" | "menor" | "mayor"
      severidad_reporte: "info" | "baja" | "media" | "alta" | "critica"
      subtipo_centro:
        | "servicio_compartido"
        | "operativo"
        | "comercial"
        | "mantenimiento"
        | "capacitacion"
        | "certificacion"
        | "otro"
      tipo_centro: "costo" | "utilidad"
      tipo_cfdi: "ingreso" | "egreso" | "traslado" | "pago" | "nomina"
      tipo_emision_reparto: "cfdi_inter_co" | "asiento_interno"
      tipo_evento_bitacora:
        | "avance"
        | "problema"
        | "decision"
        | "visita"
        | "foto"
        | "hito_alcanzado"
        | "cambio_alcance"
        | "reunion"
        | "nota"
      tipo_evento_vehiculo:
        | "carga_combustible"
        | "lectura_km"
        | "mantenimiento_preventivo"
        | "mantenimiento_correctivo"
        | "reparacion"
        | "verificacion"
        | "tenencia"
        | "siniestro"
        | "multa"
        | "lavado"
        | "otros"
      tipo_movimiento_centro:
        | "gasto_directo"
        | "reparto_recibido"
        | "ingreso_directo"
        | "ajuste"
        | "cierre_mensual"
        | "reparto_emitido"
      tipo_obligacion_sat:
        | "iva_mensual"
        | "isr_provisional"
        | "isr_retenciones"
        | "diot"
        | "iva_retenciones"
        | "declaracion_anual"
        | "iva_anual"
        | "isn"
        | "icsoe"
        | "sisub"
        | "aportacion_imss"
        | "pago_infonavit"
        | "pago_fonacot"
        | "estatales"
        | "otra"
      tipo_propiedad_vehiculo:
        | "propio"
        | "arrendamiento_financiero"
        | "arrendamiento_puro"
        | "rentado_corto_plazo"
        | "comodato"
      tipo_reporte_proyecto:
        | "incidente"
        | "avance_semanal"
        | "avance_mensual"
        | "inspeccion"
        | "no_conformidad"
        | "hallazgo_seguridad"
        | "retraso"
        | "cambio_alcance"
        | "ejecutivo"
        | "cierre_etapa"
        | "siniestro"
        | "auditoria"
        | "otro"
      tipo_solicitud_proyecto:
        | "compra"
        | "facturacion"
        | "anticipo_proveedor"
        | "cambio_alcance"
        | "reembolso_gasto"
        | "ot_inter_co"
        | "generica"
      urgencia_solicitud: "baja" | "normal" | "alta" | "critica"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      categoria_documento_proyecto: [
        "contrato",
        "plano",
        "especificacion",
        "diseno",
        "cotizacion",
        "foto",
        "manual",
        "permiso",
        "acta",
        "otro",
      ],
      categoria_documento_vehiculo: [
        "factura",
        "seguro",
        "tarjeta_circulacion",
        "verificacion",
        "tenencia",
        "permiso_carga",
        "permiso_federal",
        "manual",
        "contrato_arrendamiento",
        "foto",
        "placas",
        "tarjeton_acceso",
        "otro",
      ],
      categoria_gasto_recurrente: [
        "arrendamiento_vehiculo",
        "renta_inmueble",
        "telefonia_internet",
        "software_saas",
        "seguros",
        "vigilancia",
        "mantenimiento",
        "limpieza",
        "servicios_publicos",
        "membresia_camara",
        "asesoria_contable",
        "asesoria_legal",
        "otros_indirectos",
      ],
      categoria_inventario: [
        "panel_solar",
        "inversor",
        "estructura",
        "cable",
        "herraje",
        "tablero",
        "proteccion",
        "monitoreo",
        "baterias",
        "herramienta",
        "consumible",
        "epp",
        "otro",
      ],
      categoria_personal: ["planta", "por_obra", "repse"],
      categoria_sugerencia: [
        "bug",
        "mejora_ux",
        "feature_nuevo",
        "rendimiento",
        "otro",
      ],
      estado_capacitacion: [
        "inscrito",
        "en_proceso",
        "completado",
        "reprobado",
        "no_asistio",
      ],
      estado_cfdi: [
        "borrador",
        "timbrado",
        "enviado_cliente",
        "pagado",
        "cancelado",
      ],
      estado_entidad: ["activo", "inactivo", "archivado"],
      estado_no_conformidad: [
        "abierta",
        "en_analisis",
        "en_accion",
        "cerrada",
        "reabierta",
      ],
      estado_obligacion: [
        "pendiente",
        "en_proceso",
        "presentada",
        "pagada",
        "rechazada",
        "fuera_plazo",
        "extemporanea",
        "no_aplica",
      ],
      estado_oc: [
        "borrador",
        "pendiente_aprobacion",
        "aprobada",
        "enviada",
        "parcial_recibida",
        "recibida",
        "pagada",
        "cancelada",
      ],
      estado_oportunidad: [
        "lead",
        "calificado",
        "visita_tecnica",
        "cotizacion_proceso",
        "cotizacion_enviada",
        "negociacion",
        "ganado",
        "perdido",
      ],
      estado_ot: [
        "solicitada",
        "aprobada",
        "en_proceso",
        "completada_origen",
        "confirmada_destino",
        "lista_cobrar",
        "facturada",
        "cobrada",
        "cancelada",
      ],
      estado_prestamo: [
        "solicitado",
        "aprobado",
        "ejecutado",
        "confirmado",
        "pagado_total",
        "pagado_parcial",
        "cancelado",
      ],
      estado_proyecto: [
        "cotizacion",
        "contrato_firmado",
        "planeacion",
        "en_ejecucion",
        "en_cierre",
        "entregado",
        "en_om",
        "cerrado",
        "cancelado",
      ],
      estado_reporte: [
        "borrador",
        "emitido",
        "en_seguimiento",
        "resuelto",
        "cerrado",
      ],
      estado_solicitud: [
        "solicitada",
        "en_revision",
        "aprobada",
        "rechazada",
        "ejecutada",
        "cerrada",
      ],
      estado_sugerencia: [
        "nueva",
        "en_revision",
        "planeada",
        "implementada",
        "descartada",
      ],
      estado_tarea_proyecto: [
        "pendiente",
        "en_curso",
        "bloqueada",
        "completada",
        "cancelada",
      ],
      estado_ticket: [
        "abierto",
        "en_proceso",
        "esperando_cliente",
        "resuelto",
        "cerrado",
      ],
      estatus_vehiculo: [
        "activo",
        "mantenimiento",
        "reparacion",
        "fuera_servicio",
        "baja",
      ],
      frecuencia_gasto: [
        "mensual",
        "bimestral",
        "trimestral",
        "semestral",
        "anual",
      ],
      metodo_reparto: [
        "porcentaje_fijo",
        "por_ingresos",
        "por_empleados",
        "por_proyectos",
        "por_horas",
      ],
      nivel_autonomia_ia: ["verde", "amarillo", "rojo"],
      prioridad_tarea: ["baja", "media", "alta", "urgente"],
      prioridad_ticket: ["baja", "media", "alta", "critica"],
      rol_proyecto: [
        "pm",
        "vendedor",
        "supervisor_obra",
        "ingeniero_diseno",
        "ingeniero_electrico",
        "instalador",
        "soporte",
        "admin_proyecto",
        "cliente_contacto",
        "observador",
      ],
      rol_usuario: ["ceo", "director", "operativo", "empleado", "cliente"],
      severidad_no_conformidad: ["observacion", "menor", "mayor"],
      severidad_reporte: ["info", "baja", "media", "alta", "critica"],
      subtipo_centro: [
        "servicio_compartido",
        "operativo",
        "comercial",
        "mantenimiento",
        "capacitacion",
        "certificacion",
        "otro",
      ],
      tipo_centro: ["costo", "utilidad"],
      tipo_cfdi: ["ingreso", "egreso", "traslado", "pago", "nomina"],
      tipo_emision_reparto: ["cfdi_inter_co", "asiento_interno"],
      tipo_evento_bitacora: [
        "avance",
        "problema",
        "decision",
        "visita",
        "foto",
        "hito_alcanzado",
        "cambio_alcance",
        "reunion",
        "nota",
      ],
      tipo_evento_vehiculo: [
        "carga_combustible",
        "lectura_km",
        "mantenimiento_preventivo",
        "mantenimiento_correctivo",
        "reparacion",
        "verificacion",
        "tenencia",
        "siniestro",
        "multa",
        "lavado",
        "otros",
      ],
      tipo_movimiento_centro: [
        "gasto_directo",
        "reparto_recibido",
        "ingreso_directo",
        "ajuste",
        "cierre_mensual",
        "reparto_emitido",
      ],
      tipo_obligacion_sat: [
        "iva_mensual",
        "isr_provisional",
        "isr_retenciones",
        "diot",
        "iva_retenciones",
        "declaracion_anual",
        "iva_anual",
        "isn",
        "icsoe",
        "sisub",
        "aportacion_imss",
        "pago_infonavit",
        "pago_fonacot",
        "estatales",
        "otra",
      ],
      tipo_propiedad_vehiculo: [
        "propio",
        "arrendamiento_financiero",
        "arrendamiento_puro",
        "rentado_corto_plazo",
        "comodato",
      ],
      tipo_reporte_proyecto: [
        "incidente",
        "avance_semanal",
        "avance_mensual",
        "inspeccion",
        "no_conformidad",
        "hallazgo_seguridad",
        "retraso",
        "cambio_alcance",
        "ejecutivo",
        "cierre_etapa",
        "siniestro",
        "auditoria",
        "otro",
      ],
      tipo_solicitud_proyecto: [
        "compra",
        "facturacion",
        "anticipo_proveedor",
        "cambio_alcance",
        "reembolso_gasto",
        "ot_inter_co",
        "generica",
      ],
      urgencia_solicitud: ["baja", "normal", "alta", "critica"],
    },
  },
} as const
