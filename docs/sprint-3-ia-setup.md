# Sprint 3 — Setup de capa IA (Claude)

## Lo que se construyó

Capa transversal de IA que autocompleta formularios leyendo documentos:

- **Cliente y proveedor**: leer **CSF** del SAT → autocompleta razón social, RFC, régimen fiscal, CP, domicilio, representante legal.
- **Empleado**: leer **INE/IFE** → autocompleta nombre completo, CURP, fecha de nacimiento, género, domicilio.

Arquitectura:

```
[Formulario] ──> <DocumentExtractor /> ──> server action ──┐
                                                          │
                                              ┌───────────┴───────────┐
                                              │  lib/claude/extract   │  (cache + audit)
                                              │      ↓                │
                                              │  Anthropic SDK        │
                                              │  (claude-sonnet-4-6)  │
                                              └───────────┬───────────┘
                                                          │
                                                  ┌───────┴───────┐
                                                  │ ia_invocaciones│
                                                  │ ia_cache       │
                                                  └────────────────┘
```

## Configuración

### 1. Obtén una API key de Anthropic

https://console.anthropic.com → API Keys → **Create Key**.

Anthropic suele dar **$5 USD de crédito** al registrarte. Una llamada típica de extracción cuesta ~$0.01 USD, así que con eso te alcanzan ~500 documentos.

### 2. Agrega la key a `.env.local`

```bash
# .env.local (no se commitea)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 3. Reinicia el servidor

```bash
# Mata el dev (Ctrl+C) y reinicia:
npm run dev
```

Las env vars se cargan al arrancar Next; sin reinicio la key no se ve.

### 4. (Opcional) Configura límite de gasto en Anthropic

https://console.anthropic.com/settings/limits → poner **límite mensual** (ej. $100 USD) para que no se dispare si alguien sube cientos de docs.

## Cómo se usa en la UI

### Cliente / Proveedor (CSF)

1. Click "Nuevo cliente" o "Nuevo proveedor".
2. Arriba del form aparece un card con `✨ ¿Tienes el CSF? Cargar`.
3. Click "Cargar" → selector de archivo.
4. Sube PDF o imagen del CSF (PDF, JPG, PNG, WEBP — máx 10 MB).
5. Espera ~3-6 segundos (icono "Leyendo…").
6. El form se autocompleta. Aparece banner verde con confianza, latencia y costo.
7. Revisa los campos extraídos, completa lo demás (empresas, observaciones), guarda.

### Empleado (INE)

Mismo flujo pero arriba del form de empleado, con la INE/IFE.

## Cache

- Si subes el **mismo documento** dos veces (mismo hash), la 2ª llamada usa cache: 0 tokens, instantáneo.
- TTL del cache: 30 días.
- El cache vive en la tabla `ia_cache` con la respuesta JSON normalizada.

## Audit log

Cada llamada (cache hit o miss) inserta una fila en `ia_invocaciones`:

- `usuario_id`, `tarea`, `modelo_usado`, `tokens_input/output`, `costo_usd/mxn`, `tipo_cache`, `confidence_score`, `duracion_ms`.
- CEO ve todas las filas; otros usuarios ven solo las suyas (RLS).

## Dashboard `/configuracion/ia` (CEO)

- KPIs últimos 30 días: invocaciones, costo USD/MXN, tokens, cache hit rate, latencia promedio.
- Distribución por modelo (Sonnet/Haiku/Opus).
- Top tareas por costo (csf_lectura, ine_lectura, …).
- Top usuarios por consumo.

## Modelos y costos

Default usado: `claude-sonnet-4-6` (balance precisión/costo, soporta visión y PDF).

| Modelo | $/MTok input | $/MTok output | Uso recomendado |
|---|---|---|---|
| Haiku 4.5 | $1.0 | $5.0 | Validaciones, categorización (Sprint 4+) |
| **Sonnet 4.6** | $3.0 | $15.0 | **Lectura de docs (CSF, INE, CFDI)** ← actual |
| Opus 4.7 | $15.0 | $75.0 | Análisis complejo, predicción flujo (Sprint 5+) |

Costo típico de una extracción CSF: ~$0.005‑$0.015 USD.

## Limitaciones conocidas (entran en sprints siguientes)

- **Validación 69-B contra SAT**: requiere endpoint del SAT (no IA). Sprint 4.
- **CFDI XML parsing**: el XML es estructurado, no requiere IA. Se hará parser directo en Sprint 6.
- **Anomalías financieras / categorización gastos**: Sprint 4.
- **Flujo de caja predicho**: Sprint 5+ (usa Opus).
- **Asistente conversacional contextual**: drawer de chat global. Sprint 5+.
- **Niveles de autonomía verde/amarillo/rojo**: tabla `ia_configuracion_autonomia` ya existe pero la UI de control es Sprint 9 (hardening).

## Seguridad

- La key vive **solo server-side** (`ANTHROPIC_API_KEY` sin prefijo `NEXT_PUBLIC_`).
- Las llamadas a Claude ocurren en server actions; el navegador NUNCA toca la key.
- El audit log + cache respeta RLS.
- Documentos suben a Claude pero NO se almacenan en Supabase Storage (por ahora). Si quieres archivar el original, agrega `.from("storage").upload()` en el server action — Sprint 4.

## Privacidad

- Anthropic [no entrena con tus inputs](https://www.anthropic.com/legal/privacy) cuando usas la API directa.
- El audit log guarda `prompt_tokens`/`completion_tokens` pero NO el contenido del documento ni la respuesta cruda. La respuesta JSON parseada SÍ va al `ia_cache` para reúso.
- Para datos altamente sensibles (CSF con domicilio, INE con CURP), considera cifrar `ia_cache.resultado` antes de Sprint 9 — está en el roadmap de hardening.
