// @ts-nocheck — archivo generado por `npx supabase gen types typescript --linked`. No editar a mano.
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
          banco: string
          clabe: string | null
          created_at: string | null
          empresa_id: string
          fecha_actualizacion_saldo: string | null
          id: string
          moneda: string | null
          numero_cuenta: string
          saldo_actual: number | null
          tipo: string | null
        }
        Insert: {
          activa?: boolean | null
          alias?: string | null
          banco: string
          clabe?: string | null
          created_at?: string | null
          empresa_id: string
          fecha_actualizacion_saldo?: string | null
          id?: string
          moneda?: string | null
          numero_cuenta: string
          saldo_actual?: number | null
          tipo?: string | null
        }
        Update: {
          activa?: boolean | null
          alias?: string | null
          banco?: string
          clabe?: string | null
          created_at?: string | null
          empresa_id?: string
          fecha_actualizacion_saldo?: string | null
          id?: string
          moneda?: string | null
          numero_cuenta?: string
          saldo_actual?: number | null
          tipo?: string | null
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
      bancos_movimientos: {
        Row: {
          cfdi_relacionado_id: string | null
          concepto: string | null
          conciliado: boolean | null
          created_at: string | null
          cuenta_id: string
          fecha: string
          fecha_aplicacion: string | null
          id: string
          monto: number
          observaciones: string | null
          origen: string | null
          prestamo_relacionado_id: string | null
          referencia: string | null
          saldo_resultante: number | null
          tipo: string | null
        }
        Insert: {
          cfdi_relacionado_id?: string | null
          concepto?: string | null
          conciliado?: boolean | null
          created_at?: string | null
          cuenta_id: string
          fecha: string
          fecha_aplicacion?: string | null
          id?: string
          monto: number
          observaciones?: string | null
          origen?: string | null
          prestamo_relacionado_id?: string | null
          referencia?: string | null
          saldo_resultante?: number | null
          tipo?: string | null
        }
        Update: {
          cfdi_relacionado_id?: string | null
          concepto?: string | null
          conciliado?: boolean | null
          created_at?: string | null
          cuenta_id?: string
          fecha?: string
          fecha_aplicacion?: string | null
          id?: string
          monto?: number
          observaciones?: string | null
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
          costo_promedio: number | null
          created_at: string | null
          descripcion: string | null
          garantia_meses: number | null
          id: string
          marca: string | null
          modelo: string | null
          nombre: string
          precio_lista: number | null
          requiere_serie: boolean | null
          stock_maximo: number | null
          stock_minimo: number | null
          unidad_capacidad: string | null
          unidad_medida: string | null
          unidad_sat: string | null
          url_datasheet: string | null
        }
        Insert: {
          activo?: boolean | null
          capacidad?: number | null
          categoria?: string | null
          clave_sat?: string | null
          codigo: string
          costo_promedio?: number | null
          created_at?: string | null
          descripcion?: string | null
          garantia_meses?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre: string
          precio_lista?: number | null
          requiere_serie?: boolean | null
          stock_maximo?: number | null
          stock_minimo?: number | null
          unidad_capacidad?: string | null
          unidad_medida?: string | null
          unidad_sat?: string | null
          url_datasheet?: string | null
        }
        Update: {
          activo?: boolean | null
          capacidad?: number | null
          categoria?: string | null
          clave_sat?: string | null
          codigo?: string
          costo_promedio?: number | null
          created_at?: string | null
          descripcion?: string | null
          garantia_meses?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre?: string
          precio_lista?: number | null
          requiere_serie?: boolean | null
          stock_maximo?: number | null
          stock_minimo?: number | null
          unidad_capacidad?: string | null
          unidad_medida?: string | null
          unidad_sat?: string | null
          url_datasheet?: string | null
        }
        Relationships: []
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
            foreignKeyName: "cfdi_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
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
          cp_fiscal: string | null
          created_at: string | null
          cuenta_bancaria: Json | null
          curp: string | null
          direccion_entrega: Json | null
          direccion_fiscal: Json | null
          email_facturacion: string | null
          id: string
          nombre_comercial: string | null
          observaciones: string | null
          razon_social: string
          regimen_fiscal: string | null
          rfc: string
          riesgo: string | null
          score_pago: number | null
          score_satisfaccion: number | null
          segmento: string | null
          tipo: string | null
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
          id?: string
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social: string
          regimen_fiscal?: string | null
          rfc: string
          riesgo?: string | null
          score_pago?: number | null
          score_satisfaccion?: number | null
          segmento?: string | null
          tipo?: string | null
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
          id?: string
          nombre_comercial?: string | null
          observaciones?: string | null
          razon_social?: string
          regimen_fiscal?: string | null
          rfc?: string
          riesgo?: string | null
          score_pago?: number | null
          score_satisfaccion?: number | null
          segmento?: string | null
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
            foreignKeyName: "contratos_cliente_cotizacion_id_fkey"
            columns: ["cotizacion_id"]
            isOneToOne: false
            referencedRelation: "cotizaciones"
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
            foreignKeyName: "ema_certificaciones_emitidas_ei_externo_id_fkey"
            columns: ["ei_externo_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
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
            foreignKeyName: "ema_dictamenes_uvie_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
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
            foreignKeyName: "encuestas_satisfaccion_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
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
        ]
      }
      inventario_movimientos: {
        Row: {
          almacen_destino_id: string | null
          almacen_id: string
          autorizado_por: string | null
          cantidad: number
          capturado_por: string
          created_at: string | null
          id: string
          motivo: string | null
          observaciones: string | null
          oc_id: string | null
          producto_id: string
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
          created_at?: string | null
          id?: string
          motivo?: string | null
          observaciones?: string | null
          oc_id?: string | null
          producto_id: string
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
          created_at?: string | null
          id?: string
          motivo?: string | null
          observaciones?: string | null
          oc_id?: string | null
          producto_id?: string
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
            foreignKeyName: "inventario_movimientos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
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
            foreignKeyName: "ordenes_compra_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
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
            foreignKeyName: "productos_serie_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "catalogo_productos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_serie_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
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
        ]
      }
      proyectos: {
        Row: {
          activo: boolean | null
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
        ]
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
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      empresa_actual: { Args: never; Returns: string }
      empresas_del_usuario: { Args: never; Returns: string[] }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
      usuario_es_ceo: { Args: never; Returns: boolean }
      usuario_tiene_atributo: { Args: { p_atributo: string }; Returns: boolean }
      usuario_tiene_rol_en_empresa: {
        Args: { p_empresa_id: string; p_roles: string[] }
        Returns: boolean
      }
    }
    Enums: {
      categoria_personal: "planta" | "por_obra" | "repse"
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
      estado_no_conformidad:
        | "abierta"
        | "en_analisis"
        | "en_accion"
        | "cerrada"
        | "reabierta"
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
      estado_ticket:
        | "abierto"
        | "en_proceso"
        | "esperando_cliente"
        | "resuelto"
        | "cerrado"
      nivel_autonomia_ia: "verde" | "amarillo" | "rojo"
      prioridad_ticket: "baja" | "media" | "alta" | "critica"
      rol_usuario: "ceo" | "director" | "operativo" | "empleado" | "cliente"
      severidad_no_conformidad: "observacion" | "menor" | "mayor"
      tipo_cfdi: "ingreso" | "egreso" | "traslado" | "pago" | "nomina"
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
    Enums: {
      categoria_personal: ["planta", "por_obra", "repse"],
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
      estado_no_conformidad: [
        "abierta",
        "en_analisis",
        "en_accion",
        "cerrada",
        "reabierta",
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
      estado_ticket: [
        "abierto",
        "en_proceso",
        "esperando_cliente",
        "resuelto",
        "cerrado",
      ],
      nivel_autonomia_ia: ["verde", "amarillo", "rojo"],
      prioridad_ticket: ["baja", "media", "alta", "critica"],
      rol_usuario: ["ceo", "director", "operativo", "empleado", "cliente"],
      severidad_no_conformidad: ["observacion", "menor", "mayor"],
      tipo_cfdi: ["ingreso", "egreso", "traslado", "pago", "nomina"],
    },
  },
} as const
