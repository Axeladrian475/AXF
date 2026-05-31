import nodemailer from 'nodemailer';

// ── Configuración del transportador ──────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS?.replace(/\s+/g, ''), // Asegurar que no haya espacios
  },
});

/**
 * Función genérica para enviar correos.
 * @param {string} to - Destinatario.
 * @param {string} subject - Asunto.
 * @param {string} html - Contenido HTML.
 * @param {Array} attachments - Archivos adjuntos.
 */
export async function enviarCorreo(to, subject, html, attachments = []) {
  try {
    const mailOptions = {
      from: `"AXF Gymnet" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] Correo enviado a ${to} (ID: ${info.messageId})`);
    return true;
  } catch (error) {
    console.error(`[MAILER] Error al enviar correo a ${to}:`, error.message);
    return false;
  }
}

// ── Plantillas predefinidas (Ejemplos listos para usarse) ───────────────────

/**
 * Envía un correo cuando un reporte se resuelve.
 */
export async function notificarReporteResuelto(to, id_reporte) {
  const subject = `✅ Tu reporte #${id_reporte} ha sido resuelto`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #15803d;">¡Hola!</h2>
      <p>Queríamos avisarte que tu <strong>Reporte #${id_reporte}</strong> ya fue marcado como resuelto por el equipo de tu sucursal.</p>
      <p>Agradecemos mucho tu ayuda para mantener nuestras instalaciones en las mejores condiciones.</p>
      <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">Este es un mensaje automático de AXF Gymnet. No es necesario responder.</p>
    </div>
  `;
  return await enviarCorreo(to, subject, html);
}

/**
 * Envía un correo de bienvenida.
 */
export async function enviarBienvenida(to, nombre) {
  const subject = `¡Bienvenido a AXF Gymnet, ${nombre}! 🚀`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #ea580c;">¡Bienvenido, ${nombre}!</h2>
      <p>Estamos muy felices de que te unas a nuestra comunidad.</p>
      <p>Ya puedes acceder a nuestra plataforma y comenzar tu transformación.</p>
      <br/>
      <p>Atentamente,<br/><strong>El equipo de AXF Gymnet</strong></p>
    </div>
  `;
  return await enviarCorreo(to, subject, html);
}
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const LOGO_PATH = path.resolve(__dirname, '..', '..', 'axf_frontend', 'public', 'axfLogo.png');

/**
 * Envía un correo cuando se le asigna una nueva rutina al suscriptor.
 */
export async function notificarNuevaRutina(to, nombre, pdfBuffer = null) {
  const subject = `💪 ¡Tu nueva rutina de entrenamiento está lista!`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; background-color: #0f172a; color: #f8fafc;">
      
      <!-- Cabecera -->
      <div style="background-color: #071B2F; padding: 24px; text-align: center; border-bottom: 3px solid #F26A21;">
        <img src="cid:axflogo" alt="AXF Logo" style="max-width: 150px; margin-bottom: 10px;" />
        <h1 style="color: #F26A21; margin: 0; font-size: 28px; letter-spacing: 1px; text-transform: uppercase;">AXF Gymnet</h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Supera tus límites</p>
      </div>

      <!-- Cuerpo -->
      <div style="padding: 32px 24px;">
        <h2 style="color: #f8fafc; margin-top: 0;">¡Hola, ${nombre}! 👋</h2>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">
          Tu entrenador acaba de asignarte una <strong>nueva rutina de entrenamiento</strong> personalizada.
        </p>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">
          Hemos adjuntado en este correo el documento PDF con tu rutina. También podrás consultarla desde tu aplicación móvil de AXF en cualquier momento.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #071B2F; padding: 20px; text-align: center;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">Este es un mensaje automático de AXF Gymnet. Por favor, no respondas a este correo.</p>
        <p style="color: #475569; font-size: 12px; margin: 5px 0 0 0;">© ${new Date().getFullYear()} AXF Solutions. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
  
  const attachments = [
    { filename: 'axfLogo.png', path: LOGO_PATH, cid: 'axflogo' }
  ];
  if (pdfBuffer) attachments.push({ filename: 'Rutina_AXF.pdf', content: pdfBuffer });

  return await enviarCorreo(to, subject, html, attachments);
}

/**
 * Envía un correo cuando se le asigna una nueva dieta al suscriptor.
 */
export async function notificarNuevaDieta(to, nombre, pdfBuffer = null) {
  const subject = `🥗 ¡Tu nuevo plan de nutrición está listo!`;
  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; background-color: #0f172a; color: #f8fafc;">
      
      <!-- Cabecera -->
      <div style="background-color: #071B2F; padding: 24px; text-align: center; border-bottom: 3px solid #10b981;">
        <img src="cid:axflogo" alt="AXF Logo" style="max-width: 150px; margin-bottom: 10px;" />
        <h1 style="color: #F26A21; margin: 0; font-size: 28px; letter-spacing: 1px; text-transform: uppercase;">AXF Gymnet</h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Nutrición para resultados</p>
      </div>

      <!-- Cuerpo -->
      <div style="padding: 32px 24px;">
        <h2 style="color: #f8fafc; margin-top: 0;">¡Hola, ${nombre}! 👋</h2>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">
          Tu nutriólogo ha terminado de armar tu <strong>nuevo plan de alimentación</strong> a tu medida.
        </p>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.5;">
          Hemos adjuntado en este correo el documento PDF con tu dieta. También podrás ver tus comidas e ingredientes directamente en la aplicación móvil de AXF.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #071B2F; padding: 20px; text-align: center;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">Este es un mensaje automático de AXF Gymnet. Por favor, no respondas a este correo.</p>
        <p style="color: #475569; font-size: 12px; margin: 5px 0 0 0;">© ${new Date().getFullYear()} AXF Solutions. Todos los derechos reservados.</p>
      </div>
    </div>
  `;
  
  const attachments = [
    { filename: 'axfLogo.png', path: LOGO_PATH, cid: 'axflogo' }
  ];
  if (pdfBuffer) attachments.push({ filename: 'Dieta_AXF.pdf', content: pdfBuffer });

  return await enviarCorreo(to, subject, html, attachments);
}
