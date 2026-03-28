// ============================================================================
//  utils/pdfExport.ts
//  Genera PDFs profesionales para Rutinas y Dietas abriendo una ventana HTML
//  que se auto-imprime. Evita html2canvas/oklch por completo.
// ============================================================================

const API_BASE = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001'
const LOGO_URL = `${window.location.origin}/axfLogo.png`

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface EjercicioPDF {
  nombre:    string
  imagen_url: string | null
  series:    number | string
  reps:      number | string
  descanso:  number | string
  rutina:    string   // nombre del bloque / día
  notas?:    string
}

export interface RutinaPDFData {
  suscriptor: { nombre: string; sesiones: number }
  entrenador: string
  rutinas: { nombre: string; notas: string; ejercicios: EjercicioPDF[] }[]
  fecha: string
}

export interface ComidaPDF {
  nombre:   string
  texto:    string
  kcal:     string
  notas:    string
}

export interface DietaPDFData {
  suscriptor:  { nombre: string; sesiones: number }
  nutriologo:  string
  plan:        Record<string, ComidaPDF[]>
  metaDiaria:  number
  fecha:       string
}

// ── Helper: abrir ventana e imprimir ──────────────────────────────────────

function imprimirVentana(html: string) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) throw new Error('El navegador bloqueó la ventana emergente. Permite popups para este sitio.')
  win.document.open()
  win.document.write(html)
  win.document.close()
  // Esperar a que carguen las imágenes antes de imprimir
  win.onload = () => {
    setTimeout(() => {
      win.focus()
      win.print()
    }, 400)
  }
}

// ── CSS compartido ────────────────────────────────────────────────────────

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    color: #111;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { max-width: 760px; margin: 0 auto; padding: 0 28px 40px; }

  /* Cabecera */
  .header {
    background: #1e293b;
    color: #fff;
    padding: 18px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    page-break-inside: avoid;
  }
  .header img { height: 44px; object-fit: contain; }
  .header-right { text-align: right; }
  .header-right .doc-title {
    color: #ea580c;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: .3px;
  }
  .header-right .doc-date {
    color: #94a3b8;
    font-size: 11px;
    margin-top: 3px;
  }

  /* Tarjeta suscriptor */
  .info-card {
    display: flex;
    gap: 0;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    margin-bottom: 22px;
    page-break-inside: avoid;
  }
  .info-accent {
    width: 6px;
    background: #ea580c;
    flex-shrink: 0;
  }
  .info-body { padding: 14px 18px; flex: 1; }
  .info-body .name {
    font-size: 17px;
    font-weight: 700;
    color: #1e293b;
  }
  .info-body .meta {
    display: flex;
    gap: 24px;
    margin-top: 6px;
    flex-wrap: wrap;
  }
  .info-body .meta span {
    font-size: 11px;
    color: #64748b;
  }
  .info-body .meta strong { color: #1e293b; }

  /* Divider */
  .section-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #ea580c;
    border-bottom: 1.5px solid #fde5d4;
    padding-bottom: 5px;
    margin: 20px 0 12px;
  }

  /* Footer */
  .footer {
    margin-top: 36px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #94a3b8;
    font-size: 10px;
    page-break-inside: avoid;
  }
  .footer .brand { font-weight: 700; color: #1e293b; }

  @media print {
    html, body { font-size: 11px; }
    .page { padding: 0 20px 20px; }
    .header { margin-bottom: 16px; }
    .no-print { display: none !important; }
  }
`

// ════════════════════════════════════════════════════════════════════════════
//  RUTINAS
// ════════════════════════════════════════════════════════════════════════════

export function generarPDFRutina(data: RutinaPDFData) {
  const rutinaBlocks = data.rutinas.map(r => {
    if (r.ejercicios.length === 0) return ''

    const filas = r.ejercicios.map((ej, i) => {
      const imgHtml = ej.imagen_url
        ? `<img src="${API_BASE}${ej.imagen_url}" alt="${ej.nombre}"
               style="width:46px;height:46px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;" />`
        : `<div style="width:46px;height:46px;border-radius:6px;background:#f1f5f9;
                        display:flex;align-items:center;justify-content:center;font-size:20px;">💪</div>`

      return `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}; page-break-inside:avoid;">
          <td style="padding:8px 10px; width:54px;">${imgHtml}</td>
          <td style="padding:8px 10px; font-weight:600; color:#1e293b;">${ej.nombre}</td>
          <td style="padding:8px 10px; text-align:center;">
            <span style="background:#1e293b;color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;">
              ${ej.series} × ${ej.reps}
            </span>
          </td>
          <td style="padding:8px 10px; text-align:center; color:#64748b; font-size:11px;">
            ${ej.descanso}s descanso
          </td>
          ${ej.notas ? `<td style="padding:8px 10px; font-size:11px; color:#64748b; font-style:italic;">${ej.notas}</td>` : '<td></td>'}
        </tr>`
    }).join('')

    const notaBloque = r.notas
      ? `<div style="margin-top:8px;padding:8px 12px;background:#fffbeb;border-left:3px solid #f59e0b;
                     border-radius:4px;font-size:11px;color:#92400e;">
           📝 ${r.notas}
         </div>`
      : ''

    return `
      <div class="section-title">${r.nombre}</div>
      <table style="width:100%;border-collapse:collapse;border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#1e293b;">
            <th style="padding:8px 10px;color:#94a3b8;font-size:10px;text-align:left;"></th>
            <th style="padding:8px 10px;color:#94a3b8;font-size:10px;text-align:left;text-transform:uppercase;">Ejercicio</th>
            <th style="padding:8px 10px;color:#94a3b8;font-size:10px;text-align:center;text-transform:uppercase;">Series × Reps</th>
            <th style="padding:8px 10px;color:#94a3b8;font-size:10px;text-align:center;text-transform:uppercase;">Descanso</th>
            <th style="padding:8px 10px;color:#94a3b8;font-size:10px;text-align:left;text-transform:uppercase;">Notas técnicas</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      ${notaBloque}
    `
  }).join('')

  const totalEjercicios = data.rutinas.reduce((s, r) => s + r.ejercicios.length, 0)
  const totalSeries = data.rutinas.reduce((s, r) =>
    s + r.ejercicios.reduce((ss, e) => ss + (parseInt(String(e.series)) || 0), 0), 0)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Plan de Entrenamiento — ${data.suscriptor.nombre}</title>
  <style>
    ${BASE_CSS}
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .stat-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      page-break-inside: avoid;
    }
    .stat-card .val { font-size: 22px; font-weight: 800; color: #ea580c; }
    .stat-card .lbl { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: .5px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${LOGO_URL}" alt="AXF GymNet" onerror="this.style.display='none'" />
    <div class="header-right">
      <div class="doc-title">Plan de Entrenamiento</div>
      <div class="doc-date">${data.fecha}</div>
    </div>
  </div>

  <div class="page">
    <div class="info-card">
      <div class="info-accent"></div>
      <div class="info-body">
        <div class="name">${data.suscriptor.nombre}</div>
        <div class="meta">
          <span>Entrenador: <strong>${data.entrenador}</strong></span>
          <span>Sesiones restantes: <strong>${data.suscriptor.sesiones}</strong></span>
          <span>Rutinas: <strong>${data.rutinas.length}</strong></span>
        </div>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="val">${data.rutinas.length}</div>
        <div class="lbl">Bloques</div>
      </div>
      <div class="stat-card">
        <div class="val">${totalEjercicios}</div>
        <div class="lbl">Ejercicios</div>
      </div>
      <div class="stat-card">
        <div class="val">${totalSeries}</div>
        <div class="lbl">Series totales</div>
      </div>
    </div>

    ${rutinaBlocks}

    <div class="footer">
      <span class="brand">AXF GymNet</span>
      <span>Documento generado el ${data.fecha}</span>
      <span>Uso exclusivo del suscriptor</span>
    </div>
  </div>
</body>
</html>`

  imprimirVentana(html)
}

// ════════════════════════════════════════════════════════════════════════════
//  DIETAS
// ════════════════════════════════════════════════════════════════════════════

export function generarPDFDieta(data: DietaPDFData) {
  const DIAS_ORDEN = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

  const diasConComidas = DIAS_ORDEN.filter(d => data.plan[d] && data.plan[d].length > 0)

  const diaBlocks = diasConComidas.map(dia => {
    const comidas = data.plan[dia]
    const totalKcalDia = comidas.reduce((s, c) => s + (parseInt(c.kcal) || 0), 0)

    const comidaCards = comidas.map((c, i) => {
      const lineas = c.texto
        ? c.texto.split('\n').map(l => `<div style="font-size:11px;color:#334155;line-height:1.6;">${l}</div>`).join('')
        : `<div style="font-size:11px;color:#94a3b8;font-style:italic;">Sin descripción</div>`

      return `
        <div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;
                    page-break-inside:avoid; ${i > 0 ? 'margin-top:10px;' : ''}">
          <div style="background:#f8fafc;padding:8px 14px;display:flex;
                      justify-content:space-between;align-items:center;
                      border-bottom:1px solid #e2e8f0;">
            <span style="font-weight:700;color:#1e293b;font-size:13px;">${c.nombre}</span>
            ${c.kcal ? `<span style="background:#ea580c;color:#fff;border-radius:20px;
                                     padding:2px 10px;font-size:11px;font-weight:700;">
                          ${c.kcal} kcal
                        </span>` : ''}
          </div>
          <div style="padding:10px 14px;">
            ${lineas}
            ${c.notas ? `<div style="margin-top:6px;padding:6px 10px;background:#fffbeb;
                                      border-left:3px solid #f59e0b;border-radius:4px;
                                      font-size:11px;color:#92400e;">📝 ${c.notas}</div>` : ''}
          </div>
        </div>`
    }).join('')

    return `
      <div style="page-break-inside:avoid;">
        <div class="section-title">
          ${dia}
          ${totalKcalDia > 0
            ? `<span style="float:right;font-size:11px;font-weight:600;color:#64748b;text-transform:none;letter-spacing:0;">
                 Total: <span style="color:#ea580c;">${totalKcalDia.toLocaleString()} kcal</span>
               </span>`
            : ''}
        </div>
        <div style="margin-bottom:18px;">${comidaCards}</div>
      </div>`
  }).join('')

  const totalKcalSemana = DIAS_ORDEN
    .filter(d => data.plan[d])
    .reduce((s, d) => s + data.plan[d].reduce((ss, c) => ss + (parseInt(c.kcal) || 0), 0), 0)
  const totalComidas = DIAS_ORDEN
    .filter(d => data.plan[d])
    .reduce((s, d) => s + data.plan[d].length, 0)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Plan Alimenticio — ${data.suscriptor.nombre}</title>
  <style>
    ${BASE_CSS}
    .macro-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .macro-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px;
      text-align: center;
      page-break-inside: avoid;
    }
    .macro-card .val  { font-size: 18px; font-weight: 800; color: #ea580c; }
    .macro-card .lbl  { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: .5px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="${LOGO_URL}" alt="AXF GymNet" onerror="this.style.display='none'" />
    <div class="header-right">
      <div class="doc-title">Plan Alimenticio</div>
      <div class="doc-date">${data.fecha}</div>
    </div>
  </div>

  <div class="page">
    <div class="info-card">
      <div class="info-accent"></div>
      <div class="info-body">
        <div class="name">${data.suscriptor.nombre}</div>
        <div class="meta">
          <span>Nutriólogo: <strong>${data.nutriologo}</strong></span>
          <span>Sesiones restantes: <strong>${data.suscriptor.sesiones}</strong></span>
          <span>Días planificados: <strong>${diasConComidas.length}</strong></span>
        </div>
      </div>
    </div>

    <div class="macro-grid">
      <div class="macro-card">
        <div class="val">${diasConComidas.length}</div>
        <div class="lbl">Días</div>
      </div>
      <div class="macro-card">
        <div class="val">${totalComidas}</div>
        <div class="lbl">Comidas</div>
      </div>
      <div class="macro-card">
        <div class="val">${data.metaDiaria.toLocaleString()}</div>
        <div class="lbl">Meta/día kcal</div>
      </div>
      <div class="macro-card">
        <div class="val">${totalKcalSemana > 0 ? Math.round(totalKcalSemana / diasConComidas.length).toLocaleString() : '—'}</div>
        <div class="lbl">Prom. kcal/día</div>
      </div>
    </div>

    ${diaBlocks}

    <div class="footer">
      <span class="brand">AXF GymNet</span>
      <span>Documento generado el ${data.fecha}</span>
      <span>Uso exclusivo del suscriptor</span>
    </div>
  </div>
</body>
</html>`

  imprimirVentana(html)
}

// Mantener compatibilidad con el exportarPDF anterior si alguien lo usa
export async function exportarPDF(
  _elementId: string,
  _filename: string,
  _title: string
): Promise<void> {
  throw new Error('Usa generarPDFRutina() o generarPDFDieta() en su lugar.')
}
