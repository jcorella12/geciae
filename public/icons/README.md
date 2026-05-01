# Iconos PWA

Reemplazar antes de Sprint 9 (go-live) por los iconos definitivos del logo PSE.

Tamaños requeridos por `manifest.webmanifest`:

- `icon-192.png` — 192×192, PNG con fondo verde principal `#2D8B5A` o transparente, isotipo PSE centrado.
- `icon-512.png` — 512×512, mismo diseño, alta resolución.

Idealmente generar también:
- `icon-180.png` (180×180) para Apple touch icon (referenciar desde `app/layout.tsx` con `<link rel="apple-touch-icon">`).
- `favicon.ico` actualizado.

Mientras no existan archivos PNG aquí, la PWA seguirá siendo instalable pero usará iconos genéricos.
