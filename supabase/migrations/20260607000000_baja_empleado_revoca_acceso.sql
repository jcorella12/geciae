-- ============================================================================
-- Trigger: cuando un empleado se da de baja (activo true→false), se desactivan
-- automáticamente sus vínculos en usuarios_empresas. El usuario auth queda en
-- existencia (puede reactivarse si el empleado regresa) pero pierde acceso a
-- todo lo que dependa de empresas_del_usuario() / vínculos activos.
--
-- Si el empleado se REACTIVA (activo false→true) y tiene usuario_id:
-- restaura el vínculo principal con la empresa del empleado. Vínculos a
-- otras empresas no se reactivan automáticamente (deben reactivarse manual
-- por director/CEO).
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_empleado_baja_revoca_acceso()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Solo actuamos si cambió el flag activo.
  IF OLD.activo IS NOT DISTINCT FROM NEW.activo THEN
    RETURN NEW;
  END IF;

  -- Empleado sin cuenta vinculada: nada que hacer.
  IF NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.activo = FALSE THEN
    -- BAJA: desactivar todos los vínculos del usuario para revocar acceso.
    UPDATE usuarios_empresas
    SET activo = FALSE
    WHERE usuario_id = NEW.usuario_id
      AND activo = TRUE;
  ELSIF NEW.activo = TRUE THEN
    -- REACTIVACIÓN: solo se reactiva el vínculo con la empresa del empleado
    -- (conservadoramente — si tenía otros, los reactiva manual el admin).
    UPDATE usuarios_empresas
    SET activo = TRUE
    WHERE usuario_id = NEW.usuario_id
      AND empresa_id = NEW.empresa_id
      AND activo = FALSE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_empleado_baja_revoca_acceso ON empleados;
CREATE TRIGGER tr_empleado_baja_revoca_acceso
  AFTER UPDATE OF activo ON empleados
  FOR EACH ROW EXECUTE FUNCTION trg_empleado_baja_revoca_acceso();

COMMENT ON FUNCTION trg_empleado_baja_revoca_acceso IS
  'Sincroniza activo de empleados con usuarios_empresas: baja desactiva todos los vínculos; reactivación reactiva solo el vínculo de la empresa del empleado.';
