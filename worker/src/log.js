/**
 * @param {Record<string, unknown>} fields
 */
export function logEvent(fields) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      ...fields,
    }),
  );
}
