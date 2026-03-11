// ============================================================================
//  controllers/suscriptores.controller.js
//
//  Lógica de negocio para el Módulo de Usuarios (suscriptores).
//  Las rutas en suscriptores.routes.js llaman estos métodos.
// ============================================================================

import bcrypt from 'bcryptjs';
import db from '../config/database.js';

// ─── Constante: rondas de hashing bcrypt ─────────────────────────────────────
// 12 rondas es el balance recomendado seguridad/rendimiento (2025).
const SALT_ROUNDS = 12;

// ─── Helper: formatear ID público (SUS-00001) ─────────────────────────────────
function formatearId(id) {
  return `SUS-${String(id).padStart(5, '0')}`;
}

// ─── Helper: calcular edad a partir de fecha de nacimiento ───────────────────
function calcularEdad(fechaNacimiento) {
  const hoy  = new Date();
  const nac  = new Date(fechaNacimiento);
  let edad   = hoy.getFullYear() - nac.getFullYear();
  const diff = hoy.getMonth() - nac.getMonth();
  if (diff < 0 || (diff === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

// ════════════════════════════════════════════════════════════════════════════
// POST /api/suscriptores
// Registrar un nuevo suscriptor.
//
// Body esperado:
// {
//   nombres, apellido_paterno, apellido_materno?,
//   fecha_nacimiento (YYYY-MM-DD), sexo (M|F|Otro),
//   direccion?, codigo_postal?, telefono?,
//   correo, password,
//   terminos_aceptados (boolean)
// }
//
// La sucursal se asigna automáticamente desde el JWT del personal que registra.
// nfc_uid y huella_template se insertan como NULL (pendiente integración ESP32).
// ════════════════════════════════════════════════════════════════════════════
export async function registrarSuscriptor(req, res) {
  try {
    const {
      nombres,
      apellido_paterno,
      apellido_materno = null,
      fecha_nacimiento,
      sexo,
      direccion      = null,
      codigo_postal  = null,
      telefono       = null,
      correo,
      password,
      terminos_aceptados,
    } = req.body;

    // ── 1. Obtener id_sucursal del token JWT ──────────────────────────────────
    //    personal → JWT tiene { id: id_personal, rol: 'personal' }
    //              necesitamos consultar su sucursal en BD
    //    sucursal → JWT tiene { id: id_sucursal, rol: 'sucursal' }
    let id_sucursal_registro;

    if (req.usuario.rol === 'personal') {
      const [[emp]] = await db.query(
        `SELECT id_sucursal FROM personal WHERE id_personal = ? AND activo = 1`,
        [req.usuario.id]
      );
      if (!emp) {
        return res.status(403).json({ message: 'No se pudo verificar la sucursal del empleado.' });
      }
      id_sucursal_registro = emp.id_sucursal;
    } else if (req.usuario.rol === 'sucursal') {
      id_sucursal_registro = req.usuario.id;
    } else {
      return res.status(403).json({ message: 'Rol no autorizado para registrar suscriptores.' });
    }

    // ── 2. Validaciones de campos obligatorios ────────────────────────────────
    const faltantes = [];
    if (!nombres?.trim())          faltantes.push('nombres');
    if (!apellido_paterno?.trim()) faltantes.push('apellido_paterno');
    if (!fecha_nacimiento)         faltantes.push('fecha_nacimiento');
    if (!sexo)                     faltantes.push('sexo');
    if (!correo?.trim())           faltantes.push('correo');
    if (!password)                 faltantes.push('password');

    if (faltantes.length > 0) {
      return res.status(400).json({
        message: `Campos obligatorios faltantes: ${faltantes.join(', ')}.`,
      });
    }

    // ── 3. Validar enum sexo ──────────────────────────────────────────────────
    if (!['M', 'F', 'Otro'].includes(sexo)) {
      return res.status(400).json({ message: 'Sexo inválido. Valores aceptados: M, F, Otro.' });
    }

    // ── 4. Validar correo con regex básico ────────────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo.trim())) {
      return res.status(400).json({ message: 'Formato de correo electrónico inválido.' });
    }

    // ── 5. Validar edad mínima (13 años) ─────────────────────────────────────
    const edad = calcularEdad(fecha_nacimiento);
    if (edad < 13) {
      return res.status(400).json({ message: 'El suscriptor debe tener al menos 13 años.' });
    }

    // ── 6. Validar que se aceptaron los términos ──────────────────────────────
    if (!terminos_aceptados) {
      return res.status(400).json({ message: 'El suscriptor debe aceptar los términos y condiciones.' });
    }

    // ── 7. Validar contraseña mínima ──────────────────────────────────────────
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    // ── 8. Verificar correo duplicado (antes de hashear para no desperdiciar CPU)
    const [duplicado] = await db.query(
      `SELECT id_suscriptor FROM suscriptores WHERE correo = ?`,
      [correo.trim().toLowerCase()]
    );
    if (duplicado.length > 0) {
      return res.status(409).json({
        message: 'Ya existe un suscriptor registrado con ese correo electrónico.',
      });
    }

    // ── 9. Hashear contraseña con bcrypt ──────────────────────────────────────
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // ── 10. Hardware: NFC y Huella ────────────────────────────────────────────
    // TODO: Integrar lectura de NFC del ESP32 aquí
    //       Cuando el operador presione "Leer Tarjeta NFC" en el frontend,
    //       el ESP32 debe enviar el UID de la tarjeta al servidor vía
    //       POST /api/hardware/nfc antes de hacer submit del formulario,
    //       y el frontend incluirá el uid recibido en el body como nfc_uid.
    const nfc_uid = req.body.nfc_uid ?? null;

    // TODO: Insertar template de huella digital del sensor R307 aquí
    //       El ESP32 captura la huella y la envía al servidor vía
    //       POST /api/hardware/huella. El template resultante se incluye
    //       en el body como huella_template (base64 string).
    //       Por ahora se almacena NULL y se actualiza con PATCH /api/suscriptores/:id/huella.
    const huella_template = req.body.huella_template ?? null;

    // ── 11. Insertar en la base de datos ──────────────────────────────────────
    const [result] = await db.query(
      `INSERT INTO suscriptores
         (id_sucursal_registro, nombres, apellido_paterno, apellido_materno,
          fecha_nacimiento, sexo, direccion, codigo_postal, telefono,
          correo, password_hash, nfc_uid, huella_template, terminos_aceptados)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_sucursal_registro,
        nombres.trim(),
        apellido_paterno.trim(),
        apellido_materno?.trim() ?? null,
        fecha_nacimiento,
        sexo,
        direccion?.trim()     ?? null,
        codigo_postal?.trim() ?? null,
        telefono?.trim()      ?? null,
        correo.trim().toLowerCase(),
        password_hash,
        nfc_uid,            // NULL hasta integración ESP32
        huella_template,    // NULL hasta integración R307
        terminos_aceptados ? 1 : 0,
      ]
    );

    const id_suscriptor = result.insertId;

    // ── 12. Respuesta 201 Created ─────────────────────────────────────────────
    res.status(201).json({
      message: `Suscriptor registrado correctamente.`,
      id_suscriptor,
      id_publico: formatearId(id_suscriptor),
    });

  } catch (error) {
    // MySQL: ER_DUP_ENTRY (correo o nfc_uid duplicado por índice UNIQUE)
    if (error.code === 'ER_DUP_ENTRY') {
      const campo = error.message.includes('nfc') ? 'NFC' : 'correo electrónico';
      return res.status(409).json({
        message: `Ya existe un registro con ese ${campo}.`,
      });
    }
    console.error('[POST /suscriptores]', error);
    res.status(500).json({ message: 'Error interno al registrar el suscriptor.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/suscriptores
// Listar suscriptores de la sucursal con búsqueda opcional.
//
// Query params:
//   q       → buscar por nombre, apellido o id_suscriptor
//   limite  → máximo de resultados (default 50)
//   offset  → paginación (default 0)
// ════════════════════════════════════════════════════════════════════════════
export async function listarSuscriptores(req, res) {
  try {
    const { q = '', limite = 50, offset = 0 } = req.query;

    // Obtener sucursal del token
    let id_sucursal;
    if (req.usuario.rol === 'personal') {
      const [[emp]] = await db.query(
        `SELECT id_sucursal FROM personal WHERE id_personal = ? AND activo = 1`,
        [req.usuario.id]
      );
      id_sucursal = emp?.id_sucursal;
    } else if (req.usuario.rol === 'sucursal') {
      id_sucursal = req.usuario.id;
    }

    if (!id_sucursal) {
      return res.status(400).json({ message: 'No se pudo determinar la sucursal.' });
    }

    const busqueda = `%${q.trim()}%`;
    const lim      = Math.min(parseInt(limite) || 50, 200);
    const off      = parseInt(offset) || 0;

    const [suscriptores] = await db.query(
      `SELECT
         s.id_suscriptor,
         LPAD(s.id_suscriptor, 5, '0')                          AS id_publico,
         s.nombres,
         s.apellido_paterno,
         s.apellido_materno,
         CONCAT(s.nombres, ' ', s.apellido_paterno,
           IFNULL(CONCAT(' ', s.apellido_materno),''))           AS nombre_completo,
         s.correo,
         s.telefono,
         suc.nombre                                              AS sucursal_registro,
         s.activo,
         s.puntos,
         s.creado_en
       FROM suscriptores s
       INNER JOIN sucursales suc ON suc.id_sucursal = s.id_sucursal_registro
       WHERE s.id_sucursal_registro = ?
         AND s.activo = 1
         AND (
           s.nombres           LIKE ? OR
           s.apellido_paterno  LIKE ? OR
           s.apellido_materno  LIKE ? OR
           s.correo            LIKE ? OR
           CAST(s.id_suscriptor AS CHAR) LIKE ?
         )
       ORDER BY s.creado_en DESC
       LIMIT ? OFFSET ?`,
      [id_sucursal, busqueda, busqueda, busqueda, busqueda, busqueda, lim, off]
    );

    res.json(suscriptores);
  } catch (error) {
    console.error('[GET /suscriptores]', error);
    res.status(500).json({ message: 'Error al obtener la lista de suscriptores.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// GET /api/suscriptores/:id
// Obtener un suscriptor por ID (detalle completo, sin password_hash).
// ════════════════════════════════════════════════════════════════════════════
export async function obtenerSuscriptor(req, res) {
  try {
    const { id } = req.params;

    const [[suscriptor]] = await db.query(
      `SELECT
         s.id_suscriptor,
         s.nombres, s.apellido_paterno, s.apellido_materno,
         s.fecha_nacimiento, s.sexo,
         s.direccion, s.codigo_postal, s.telefono, s.correo,
         s.puntos, s.racha_dias, s.dias_descanso_semana,
         s.terminos_aceptados, s.activo, s.creado_en,
         CASE WHEN s.nfc_uid      IS NOT NULL THEN 1 ELSE 0 END AS tiene_nfc,
         CASE WHEN s.huella_template IS NOT NULL THEN 1 ELSE 0 END AS tiene_huella,
         suc.nombre AS sucursal_registro
       FROM suscriptores s
       INNER JOIN sucursales suc ON suc.id_sucursal = s.id_sucursal_registro
       WHERE s.id_suscriptor = ? AND s.activo = 1`,
      [id]
    );

    if (!suscriptor) {
      return res.status(404).json({ message: 'Suscriptor no encontrado.' });
    }

    res.json(suscriptor);
  } catch (error) {
    console.error('[GET /suscriptores/:id]', error);
    res.status(500).json({ message: 'Error al obtener el suscriptor.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/suscriptores/:id
// Modificar datos de un suscriptor existente.
// No modifica password ni campos de hardware (NFC/huella tienen sus propios endpoints).
// ════════════════════════════════════════════════════════════════════════════
export async function modificarSuscriptor(req, res) {
  try {
    const { id } = req.params;
    const {
      nombres, apellido_paterno, apellido_materno,
      fecha_nacimiento, sexo, direccion, codigo_postal, telefono, correo,
    } = req.body;

    // Verificar que el suscriptor existe
    const [[existe]] = await db.query(
      `SELECT id_suscriptor FROM suscriptores WHERE id_suscriptor = ? AND activo = 1`,
      [id]
    );
    if (!existe) {
      return res.status(404).json({ message: 'Suscriptor no encontrado.' });
    }

    // Verificar correo duplicado en otro suscriptor
    if (correo) {
      const [dupCorreo] = await db.query(
        `SELECT id_suscriptor FROM suscriptores WHERE correo = ? AND id_suscriptor != ?`,
        [correo.trim().toLowerCase(), id]
      );
      if (dupCorreo.length > 0) {
        return res.status(409).json({ message: 'Ese correo ya pertenece a otro suscriptor.' });
      }
    }

    if (sexo && !['M', 'F', 'Otro'].includes(sexo)) {
      return res.status(400).json({ message: 'Sexo inválido. Valores aceptados: M, F, Otro.' });
    }

    await db.query(
      `UPDATE suscriptores SET
         nombres           = COALESCE(?, nombres),
         apellido_paterno  = COALESCE(?, apellido_paterno),
         apellido_materno  = COALESCE(?, apellido_materno),
         fecha_nacimiento  = COALESCE(?, fecha_nacimiento),
         sexo              = COALESCE(?, sexo),
         direccion         = COALESCE(?, direccion),
         codigo_postal     = COALESCE(?, codigo_postal),
         telefono          = COALESCE(?, telefono),
         correo            = COALESCE(?, correo)
       WHERE id_suscriptor = ?`,
      [
        nombres?.trim()           ?? null,
        apellido_paterno?.trim()  ?? null,
        apellido_materno?.trim()  ?? null,
        fecha_nacimiento          ?? null,
        sexo                      ?? null,
        direccion?.trim()         ?? null,
        codigo_postal?.trim()     ?? null,
        telefono?.trim()          ?? null,
        correo?.trim().toLowerCase() ?? null,
        id,
      ]
    );

    res.json({ message: 'Suscriptor actualizado correctamente.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Correo electrónico ya registrado.' });
    }
    console.error('[PUT /suscriptores/:id]', error);
    res.status(500).json({ message: 'Error al modificar el suscriptor.' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/suscriptores/:id
// Soft delete: desactiva el suscriptor (activo = 0).
// No se borra físicamente para preservar historial de accesos, canjes, etc.
// ════════════════════════════════════════════════════════════════════════════
export async function eliminarSuscriptor(req, res) {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `UPDATE suscriptores SET activo = 0 WHERE id_suscriptor = ? AND activo = 1`,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Suscriptor no encontrado.' });
    }

    res.json({ message: 'Suscriptor eliminado correctamente.' });
  } catch (error) {
    console.error('[DELETE /suscriptores/:id]', error);
    res.status(500).json({ message: 'Error al eliminar el suscriptor.' });
  }
}