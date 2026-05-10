/**
 * Sprint 8.2 — Engine que habla con el SAT vía @nodecfdi/sat-ws-descarga-masiva.
 *
 * Solo importable desde server actions. La librería es ESM-only y se carga
 * dinámicamente. NO se exporta la FIEL ni la password fuera de buildSatClient.
 */

import { cargarFiel } from "./fiel-loader";

/**
 * Construye un cliente SAT autenticado para una empresa específica. Carga la
 * FIEL desde Storage y devuelve el Service listo para query/verify/download.
 */
async function buildSatClient(empresaId: string): Promise<{
  service: unknown;
  rfc: string;
}> {
  const fielData = await cargarFiel(empresaId);

  // Cargar la librería ESM dinámicamente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lib: any = await import("@nodecfdi/sat-ws-descarga-masiva");

  const fiel = lib.Fiel.create(
    fielData.cer.toString("binary"),
    fielData.key.toString("binary"),
    fielData.password,
  );

  if (!fiel.isValid()) {
    throw new Error("FIEL inválida al inicializar cliente SAT.");
  }

  const webClient = new lib.HttpsWebClient();
  const requestBuilder = new lib.FielRequestBuilder(fiel);
  const service = new lib.Service(
    requestBuilder,
    webClient,
    undefined,
    lib.ServiceEndpoints.cfdi(),
  );

  return { service, rfc: fielData.rfc };
}

/**
 * PASO 2 del SAT: presentar solicitud. Retorna requestId.
 */
export async function presentarSolicitud(opts: {
  empresaId: string;
  tipoDescarga: "emitidos" | "recibidos";
  fechaInicio: string;
  fechaFin: string;
}): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lib: any = await import("@nodecfdi/sat-ws-descarga-masiva");
  const { service } = await buildSatClient(opts.empresaId);

  const periodo = lib.DateTimePeriod.createFromValues(
    `${opts.fechaInicio} 00:00:00`,
    `${opts.fechaFin} 23:59:59`,
  );

  // En v2 DownloadType/RequestType son BaseEnum: se construyen con `new` y
  // toman la KEY del enum ('issued'/'received'/'xml'), no el value
  // ('RfcEmisor'/'RfcReceptor'). Si pasas DownloadTypeEnum.issued
  // (que es "RfcEmisor") la librería falla isTypeOf("issued") y arma
  // una solicitud SOAP vacía → SAT responde "XML mal formado".
  const downloadType = new lib.DownloadType(
    opts.tipoDescarga === "emitidos" ? "issued" : "received",
  );

  const requestType = new lib.RequestType("xml");

  let params = lib.QueryParameters.create()
    .withPeriod(periodo)
    .withDownloadType(downloadType)
    .withRequestType(requestType);

  // Restricción del SAT: para descargar XML de RECIBIDOS hay que filtrar
  // documentStatus = 'active' (no se permite bajar XMLs cancelados como
  // receptor). Para emitidos el SAT permite cualquiera, pero por
  // consistencia también activos.
  params = params.withDocumentStatus(new lib.DocumentStatus("active"));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (service as any).query(params);

  if (!result.getStatus().isAccepted()) {
    throw new Error(`SAT rechazó solicitud: ${result.getStatus().getMessage()}`);
  }

  return result.getRequestId();
}

/**
 * PASO 3 del SAT: verificar estado.
 * Códigos:
 *   1 = Aceptada y procesando
 *   2 = En proceso
 *   3 = Terminada (lista para descarga)
 *   4 = Error
 *   5 = Vencida (>72h)
 */
export async function verificarEstadoSolicitud(opts: {
  empresaId: string;
  requestId: string;
}): Promise<{
  listo: boolean;
  packageIds: string[];
  numeroCfdis: number;
  mensajeEstado: string;
  codigo: number;
}> {
  const { service } = await buildSatClient(opts.empresaId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (service as any).verify(opts.requestId);

  const status = result.getStatus();
  const verificationStatus = result.getCodeRequest();
  const codigo = Number(verificationStatus.getValue?.() ?? verificationStatus);

  return {
    listo: codigo === 3,
    packageIds: codigo === 3 ? result.getPackagesIds() : [],
    numeroCfdis: result.getNumberCfdis?.() ?? 0,
    mensajeEstado:
      typeof status.getMessage === "function"
        ? status.getMessage()
        : `Código SAT: ${codigo}`,
    codigo,
  };
}

/**
 * PASO 4 del SAT: descarga un paquete específico (ZIP base64).
 */
export async function descargarPaquete(opts: {
  empresaId: string;
  packageId: string;
}): Promise<Buffer> {
  const { service } = await buildSatClient(opts.empresaId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (service as any).download(opts.packageId);

  if (!result.getStatus().isAccepted()) {
    throw new Error(
      `Error descargando paquete: ${result.getStatus().getMessage()}`,
    );
  }

  const packageBase64 = result.getPackageContent();
  return Buffer.from(packageBase64, "base64");
}
