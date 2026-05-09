/**
 * Stub de tipos para yauzl-promise. La librería no publica .d.ts.
 * Tratamos su API como estructural (open/fromBuffer + iteración + close).
 */
declare module "yauzl-promise" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yauzl: any;
  export default yauzl;
}
