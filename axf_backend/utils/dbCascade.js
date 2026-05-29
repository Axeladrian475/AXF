/** Ejecuta DELETE/UPDATE con IN (?) solo si hay IDs. */
export async function deleteIfAny(connection, sql, ids, extraParams = []) {
  if (!ids?.length) return;
  await connection.query(sql, [...extraParams, ids]);
}
