// ============================================================================
//  controllers/maestro.controller.js
//  Controlador para operaciones exclusivas del rol Maestro (Administrador Global).
//  Implementa creación de sucursales y borrado lógico transaccional.
//
//  Funciones exportadas:
//    crearSucursal     → POST /api/maestro/sucursales
//    desactivarSucursal → DELETE /api/maestro/sucursales/:id_sucursal
// ============================================================================

import db     from '../config/database.js';
import bcrypt from 'bcryptjs';

// ── Expresiones regulares para validación RQNF3 (espejo del frontend) ─────────
// Validar aquí también protege el API ante llamadas directas sin pasar por React.
const REGEX_MAYUS    = /[A-Z]/;
const REGEX_MINUS    = /[a-z]/;
const REGEX_NUMERO   = /[0-9]/;
const REGEX_ESPECIAL = /[^A-Za-z0-9]/;

/**
 * validarPasswordBackend
 * RQNF 3: Mínimo 8 chars, 1 mayúscula, 1 minúscula, 1 número,
 *         1 carácter especial y no debe coincidir con el usuario.
 *
 * @param {string} password - Contraseña en texto plano.
 * @param {string} usuario  - Nombre de usuario de la sucursal.
 * @returns {string|null}   - Mensaje de error, o null si es válida.
 */
function validarPasswordBackend(password, usuario) {
  if (!password || password.length < 8)
    return 'La contraseña debe tener al menos 8 caracteres.';
  if (!REGEX_MAYUS.test(password))
    return 'La contraseña debe incluir al menos una letra mayúscula.';
  if (!REGEX_MINUS.test(password))
    return 'La contraseña debe incluir al menos una letra minúscula.';
  if (!REGEX_NUMERO.test(password))
    return 'La contraseña debe incluir al menos un número.';
  if (!REGEX_ESPECIAL.test(password))
    return 'La contraseña debe incluir al menos un carácter especial (ej. @, #, !, $).';
  if (usuario && password.toLowerCase() === usuario.trim().toLowerCase())
    return 'La contraseña no puede ser igual al nombre de usuario.';
  return null;
}

/**
 * crearSucursal – Crea una nueva sucursal o reactiva una desactivada.
 *
 * CAUSA RAÍZ DEL BUG ANTERIOR:
 *   Esta función no existía en el controlador. La lógica estaba mezclada como
 *   handler anónimo dentro de sucursales.routes.js, sin validación RQNF3 en
 *   backend ni manejo semántico del error ER_DUP_ENTRY (devolvía 500 en lugar
 *   de 409). Además, maestro.routes.js no registraba la ruta POST, por lo que
 *   el endpoint POST /api/maestro/sucursales nunca existió.
 *
 * Flujo:
 *   1. Validar campos obligatorios (RQF2 / RQNF4).
 *   2. Validar fortaleza de contraseña (RQNF3).
 *   3. Verificar unicidad de usuario (RQNF2 — consulta previa).
 *   4. Hash de contraseña con bcrypt (salt=10).
 *   5. INSERT en sucursales con columnas explícitas (evita desajuste con capacidad_maxima DEFAULT).
 *   6. Manejo de ER_DUP_ENTRY como respaldo (race condition entre paso 3 y 5).
 *
 * @route POST /api/maestro/sucursales
 */
export async function crearSucursal(req, res) {
  // ─── 1. Desestructurar payload (debe coincidir EXACTAMENTE con lo que envía React) ────
  // React envía: { nombre, direccion, codigo_postal, usuario, password }
  const { nombre, direccion, codigo_postal, usuario, password } = req.body;

  // ─── 2. Validación RQF2 / RQNF4: ningún campo requerido puede estar vacío ────
  if (!nombre || !direccion || !codigo_postal || !usuario || !password) {
    return res.status(400).json({
      success: false,
      message: 'Todos los campos son requeridos: nombre, dirección, código postal, usuario y contraseña.',
    });
  }

  // ─── 3. Validación RQNF3: fortaleza de contraseña en el backend ─────────────
  // Crítico: no confiar solo en la validación del frontend para proteger el API.
  const errorPassword = validarPasswordBackend(password, usuario);
  if (errorPassword) {
    return res.status(400).json({ success: false, message: errorPassword });
  }

  try {
    // ─── 4. Verificación RQNF2: unicidad de usuario antes del INSERT ───────────
    // Esto permite devolver un mensaje claro (409) en lugar de depender del error
    // ER_DUP_ENTRY de MySQL, que antes llegaba al catch genérico como HTTP 500.
    const [existe] = await db.query(
      'SELECT id_sucursal, activa FROM sucursales WHERE usuario = ?',
      [usuario]
    );

    if (existe.length > 0) {
      const sucursalExistente = existe[0];

      // Si el usuario existe y la sucursal está ACTIVA → conflicto real
      if (sucursalExistente.activa === 1) {
        return res.status(409).json({
          success: false,
          message: 'El nombre de usuario ya está en uso por otra sucursal activa.',
        });
      }

      // Si existe pero está INACTIVA → reactivar y actualizar datos
      // BUG ANTERIOR: el hash se intentaba antes sin await en contexto erróneo;
      // aquí se garantiza que bcrypt.hash resuelve su Promise ANTES del UPDATE.
      const password_hash = await bcrypt.hash(password, 10);

      await db.query(
        `UPDATE sucursales
            SET nombre = ?, direccion = ?, codigo_postal = ?, password_hash = ?, activa = 1
          WHERE id_sucursal = ?`,
        [nombre, direccion, codigo_postal, password_hash, sucursalExistente.id_sucursal]
      );

      return res.status(200).json({
        success: true,
        message: 'Sucursal reactivada y actualizada correctamente.',
        id_sucursal: sucursalExistente.id_sucursal,
      });
    }

    // ─── 5. Hashear contraseña ANTES del INSERT ──────────────────────────────
    // CAUSA RAÍZ POTENCIAL: si bcrypt.hash lanza (ej. password undefined), la
    // Promise rechaza y el error caía al catch sin mensaje útil para React.
    // Aquí está dentro del try/catch y el campo ya fue validado en el paso 2.
    const password_hash = await bcrypt.hash(password, 10);

    // ─── 6. INSERT con columnas explícitas ───────────────────────────────────
    // IMPORTANTE: se listan solo las columnas que enviamos.
    // La columna `capacidad_maxima` usa DEFAULT 50 en la BD y NO se incluye
    // en el INSERT para evitar desajuste de columnas / valores.
    const [result] = await db.query(
      `INSERT INTO sucursales (nombre, direccion, codigo_postal, usuario, password_hash, activa)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nombre, direccion, codigo_postal, usuario, password_hash]
    );

    return res.status(201).json({
      success: true,
      message: 'Sucursal creada correctamente.',
      id_sucursal: result.insertId,
    });

  } catch (error) {
    // ─── Manejo semántico de errores de MySQL ────────────────────────────────
    // ER_DUP_ENTRY: race condition — otro request insertó el mismo usuario entre
    // el SELECT de verificación (paso 4) y el INSERT (paso 6).
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'El nombre de usuario ya está en uso. Por favor elige uno diferente.',
      });
    }

    // Error genérico de servidor — loguear en consola para trazabilidad
    console.error('[POST /api/maestro/sucursales] Error inesperado:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al crear la sucursal. Contacte al administrador.',
      detalle: error.message,
    });
  }
}


/**
 * eliminarSucursal – Borrado FÍSICO (Hard Delete) transaccional.
 *
 * CORRECCIÓN APLICADA:
 *   Antes se usaba desactivarSucursal (soft delete, activa = 0) que no
 *   eliminaba realmente los registros de la BD. El usuario espera que al
 *   presionar "Eliminar" la sucursal desaparezca de la base de datos.
 *
 *   Como la BD NO tiene FOREIGN KEY constraints definidos, las tablas
 *   se pueden limpiar directamente con DELETE. Se usa transacción para
 *   garantizar atomicidad: si algo falla → ROLLBACK completo.
 *
 * Flujo:
 *   1. Verificar existencia de la sucursal.
 *   2. Iniciar transacción (BEGIN).
 *   3. Eliminar dependencias en cascada (orden inverso a FK lógicas).
 *   4. Eliminar la sucursal.
 *   5. Confirmar transacción (COMMIT).
 *
 * @route DELETE /api/maestro/sucursales/:id_sucursal
 */
export async function eliminarSucursal(req, res) {
  const { id_sucursal } = req.params;
  let connection;

  try {
    // ─── 1. Obtener conexión dedicada del pool para la transacción ───────────
    connection = await db.getConnection();

    // ─── 2. Verificar que la sucursal existe ────────────────────────────────
    const [rows] = await connection.query(
      'SELECT id_sucursal FROM sucursales WHERE id_sucursal = ?',
      [id_sucursal]
    );

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'La sucursal especificada no existe.',
      });
    }

    // ─── 3. Iniciar transacción SQL ─────────────────────────────────────────
    await connection.beginTransaction();

    // ─── 4. Eliminar dependencias en cascada ────────────────────────────────
    // Orden: tablas hijas primero, tabla principal al final.

    // 4a. Accesos de suscriptores en esta sucursal
    await connection.query(
      'DELETE FROM accesos WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // 4b. Avisos y sus destinatarios
    const [avisos] = await connection.query(
      'SELECT id_aviso FROM avisos WHERE id_sucursal = ?',
      [id_sucursal]
    );
    if (avisos.length > 0) {
      const idsAvisos = avisos.map(a => a.id_aviso);
      await connection.query(
        `DELETE FROM aviso_destinatarios WHERE id_aviso IN (${idsAvisos.map(() => '?').join(',')})`,
        idsAvisos
      );
      await connection.query(
        'DELETE FROM avisos WHERE id_sucursal = ?',
        [id_sucursal]
      );
    }

    // 4c. Chat mensajes (dependen de personal de esta sucursal)
    const [personalRows] = await connection.query(
      'SELECT id_personal FROM personal WHERE id_sucursal = ?',
      [id_sucursal]
    );
    if (personalRows.length > 0) {
      const idsPersonal = personalRows.map(p => p.id_personal);
      await connection.query(
        `DELETE FROM chat_mensajes WHERE id_personal IN (${idsPersonal.map(() => '?').join(',')})`,
        idsPersonal
      );
    }

    // 4d. Canjes y registros relacionados a suscriptores de esta sucursal
    const [suscriptoresRows] = await connection.query(
      'SELECT id_suscriptor FROM suscriptores WHERE id_sucursal_registro = ?',
      [id_sucursal]
    );

    const idsSubs = suscriptoresRows.length > 0 ? suscriptoresRows.map(s => s.id_suscriptor) : [];
    if (idsSubs.length > 0) {
      const placeholdersSubs = idsSubs.map(() => '?').join(',');

      // Accesos y registros que apuntan a suscriptores
      await connection.query(
        `DELETE FROM accesos WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      await connection.query(
        `DELETE FROM canjes WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      await connection.query(
        `DELETE FROM suscripciones WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      await connection.query(
        `DELETE FROM reporte_sumados WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      await connection.query(
        `DELETE FROM registro_entrenamiento WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      await connection.query(
        `DELETE FROM sensor_huella_posiciones WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      await connection.query(
        `DELETE FROM chat_mensajes WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      await connection.query(
        `DELETE FROM registros_fisicos WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );

      // Dietas y comidas
      const [dietas] = await connection.query(
        `SELECT id_dieta FROM dietas WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      const idsDietas = dietas.map(d => d.id_dieta);
      if (idsDietas.length > 0) {
        const placeholdersDietas = idsDietas.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM dieta_comidas WHERE id_dieta IN (${placeholdersDietas})`,
          idsDietas
        );
        await connection.query(
          `DELETE FROM dietas WHERE id_dieta IN (${placeholdersDietas})`,
          idsDietas
        );
      }

      // Rutinas y ejercicios de rutinas
      const [rutinas] = await connection.query(
        `SELECT id_rutina FROM rutinas WHERE id_suscriptor IN (${placeholdersSubs})`,
        idsSubs
      );
      const idsRutinas = rutinas.map(r => r.id_rutina);
      if (idsRutinas.length > 0) {
        const placeholdersRutinas = idsRutinas.map(() => '?').join(',');
        await connection.query(
          `DELETE FROM rutina_ejercicios WHERE id_rutina IN (${placeholdersRutinas})`,
          idsRutinas
        );
        await connection.query(
          `DELETE FROM rutinas WHERE id_rutina IN (${placeholdersRutinas})`,
          idsRutinas
        );
      }
    }

    // 4e. Recompensas de esta sucursal
    await connection.query(
      'DELETE FROM recompensas WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // 4f. Reportes de esta sucursal (también se borran reportes de suscriptores arriba)
    await connection.query(
      'DELETE FROM reportes WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // 4g. Configuración de reportes periódicos
    await connection.query(
      'DELETE FROM config_reportes_periodicos WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // 4h. Promociones de esta sucursal
    await connection.query(
      'DELETE FROM promociones WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // 4i. Suscriptores registrados en esta sucursal
    await connection.query(
      'DELETE FROM suscriptores WHERE id_sucursal_registro = ?',
      [id_sucursal]
    );
    // 4k. Ejercicios creados por personal de esta sucursal
    if (personalRows.length > 0) {
      const idsPersonal = personalRows.map(p => p.id_personal);
      await connection.query(
        `DELETE FROM ejercicios WHERE creado_por IN (${idsPersonal.map(() => '?').join(',')})`,
        idsPersonal
      );
      await connection.query(
        `DELETE FROM registros_fisicos WHERE id_nutriologo IN (${idsPersonal.map(() => '?').join(',')})`,
        idsPersonal
      );
    }

    // 4l. Personal de esta sucursal
    await connection.query(
      'DELETE FROM personal WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // 4m. Aforo de esta sucursal
    await connection.query(
      'DELETE FROM sucursal_aforo WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // ─── 5. Eliminar la sucursal ────────────────────────────────────────────
    await connection.query(
      'DELETE FROM sucursales WHERE id_sucursal = ?',
      [id_sucursal]
    );

    // ─── 6. Confirmar la transacción ────────────────────────────────────────
    await connection.commit();
    connection.release();

    // ─── 7. Respuesta exitosa ───────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: 'Sucursal y todas sus dependencias eliminadas correctamente.',
    });

  } catch (error) {
    // ─── ROLLBACK: revertir cambios parciales ante cualquier fallo ───────────
    if (connection) {
      try { await connection.rollback(); } catch (_) { /* noop */ }
      connection.release();
    }

    console.error('[DELETE /api/maestro/sucursales/:id_sucursal]', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno al eliminar la sucursal.',
      detalle: error.message,
    });
  }
}

