-- ============================================================================
-- Actualizar identidad_visual de empresas a los colores REALES de cada logo
-- ============================================================================
-- El seed inicial usó la paleta del spec original que no coincidía con los
-- logos reales del cliente. Esta migración corrige los hex por empresa.
-- Decisión registrada en memory/project_palette_decision.md (opción C).
-- ============================================================================

UPDATE empresas
SET identidad_visual = jsonb_build_object(
  'color_primario', '#1E3A5F',
  'color_acento', '#F18F2C',
  'logo_path', '/logos/psenergia.png'
)
WHERE codigo = 'PSE';

UPDATE empresas
SET identidad_visual = jsonb_build_object(
  'color_primario', '#1F6B47',
  'color_acento', '#E89B45',
  'logo_path', '/logos/ciae.png'
)
WHERE codigo = 'CIAE';

UPDATE empresas
SET identidad_visual = jsonb_build_object(
  'color_primario', '#1F3A5F',
  'color_acento', '#C9A24E',
  'logo_path', '/logos/ied.png'
)
WHERE codigo = 'IED';

UPDATE empresas
SET identidad_visual = jsonb_build_object(
  'color_primario', '#B8E03A',
  'logo_path', '/logos/limson.png'
)
WHERE codigo = 'LIMSON';
