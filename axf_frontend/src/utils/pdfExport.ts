// ============================================================================
//  utils/pdfExport.ts
//  Genera PDFs profesionales para Rutinas y Dietas abriendo una ventana HTML
//  que se auto-imprime. Evita html2canvas/oklch por completo.
// ============================================================================

const API_BASE = import.meta.env.VITE_SOCKET_URL ?? 'https://axfgymnet.com'
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
  prot:     string
  grasas:   string
  carbs:    string
  notas:    string
}

export interface DietaPDFData {
  suscriptor:  { nombre: string; sesiones: number }
  nutriologo:  string
  plan:        Record<string, ComidaPDF[]>
  metaDiaria:  number
  fecha:       string
}

// ── Análisis Incidencias ────────────────────────────────────────────────────

export interface AnalisisPDFData {
  sucursal: string
  fechaInicio: string
  fechaFin: string
  fechaGeneracion: string
  metricas: {
    total: number
    total_estadistico: number
    resueltos: number
    pendientes: number
    tasa_resolucion: number
  }
  reportes_prioritarios: any[]
  todos_resueltos: any[]
  todos_pendientes: any[]
  categorias: any[]
  personal: any[]
  chartEstado?: string | null
  chartCategorias?: string | null
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
    const totalKcalDia = Math.round(comidas.reduce((s, c) => s + (parseFloat(c.kcal) || 0), 0))
    const totalProtDia = Math.round(comidas.reduce((s, c) => s + (parseFloat(c.prot) || 0), 0))
    const totalGrasasDia = Math.round(comidas.reduce((s, c) => s + (parseFloat(c.grasas) || 0), 0))
    const totalCarbsDia = Math.round(comidas.reduce((s, c) => s + (parseFloat(c.carbs) || 0), 0))

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
            <div style="display:flex;gap:6px;">
              ${c.kcal && parseFloat(c.kcal) > 0 ? `<span style="background:#ea580c;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;">🔥 ${c.kcal} kcal</span>` : ''}
              ${c.prot && parseFloat(c.prot) > 0 ? `<span style="background:#2563eb;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;">🥩 ${c.prot} g</span>` : ''}
              ${c.grasas && parseFloat(c.grasas) > 0 ? `<span style="background:#eab308;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;">🥑 ${c.grasas} g</span>` : ''}
              ${c.carbs && parseFloat(c.carbs) > 0 ? `<span style="background:#16a34a;color:#fff;border-radius:20px;padding:2px 8px;font-size:10px;font-weight:700;">🍞 ${c.carbs} g</span>` : ''}
            </div>
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
        <div class="section-title" style="display:flex; justify-content:space-between; align-items:center;">
          <span>${dia}</span>
          ${totalKcalDia > 0
            ? `<div style="font-size:10px;font-weight:600;color:#64748b;text-transform:none;letter-spacing:0;display:flex;gap:10px;">
                 <span style="color:#ea580c;">🔥 ${totalKcalDia.toLocaleString()} kcal</span>
                 <span style="color:#2563eb;">🥩 ${totalProtDia} g</span>
                 <span style="color:#eab308;">🥑 ${totalGrasasDia} g</span>
                 <span style="color:#16a34a;">🍞 ${totalCarbsDia} g</span>
               </div>`
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

// ════════════════════════════════════════════════════════════════════════════
//  HISTORIAL FÍSICO
// ════════════════════════════════════════════════════════════════════════════

export interface RegistroHistorialPDF {
  id_registro:   number
  creado_en:     string
  peso_kg:       number
  altura_cm:     number | null
  pct_grasa:     number | null
  pct_musculo:   number | null
  objetivo:      string | null
  actividad:     string | null
  tmb:           number | null
  tdee:          number | null
  proteinas_min: number | null
  proteinas_max: number | null
  grasas_min:    number | null
  grasas_max:    number | null
  carbs_min:     number | null
  carbs_max:     number | null
  notas:         string | null
  nutriologo:    string
}

export interface HistorialPDFData {
  suscriptor: { nombre: string }
  nutriologo:  string
  registros:   RegistroHistorialPDF[]
  fecha:       string
}

export function generarPDFHistorial(data: HistorialPDFData) {
  const fmt = (v: number | null) => (v != null ? String(v) : '—')
  const fmtPct = (v: number | null) => (v != null ? `${v}%` : '—')
  const fmtRango = (a: number | null, b: number | null) =>
    a != null && b != null ? `${a}–${b}` : '—'

  const filas = data.registros.map((r, i) => {
    const fecha = new Date(r.creado_en).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
    const bg = i % 2 === 0 ? '#fff' : '#f8fafc'

    const macroRow = (r.proteinas_min != null || r.carbs_min != null || r.grasas_min != null)
      ? `<tr style="background:${bg};page-break-inside:avoid;">
           <td colspan="8" style="padding:0 10px 10px 10px;">
             <div style="display:flex;gap:8px;flex-wrap:wrap;">
               ${r.proteinas_min != null ? `<span style="background:#e0f2fe;color:#0369a1;border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;">Prot: ${fmtRango(r.proteinas_min, r.proteinas_max)} g</span>` : ''}
               ${r.carbs_min != null     ? `<span style="background:#dcfce7;color:#15803d;border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;">Carbs: ${fmtRango(r.carbs_min, r.carbs_max)} g</span>` : ''}
               ${r.grasas_min != null    ? `<span style="background:#fef9c3;color:#a16207;border-radius:20px;padding:2px 10px;font-size:10px;font-weight:700;">Grasas: ${fmtRango(r.grasas_min, r.grasas_max)} g</span>` : ''}
               ${r.notas ? `<span style="background:#fffbeb;color:#92400e;border-radius:4px;padding:2px 10px;font-size:10px;font-style:italic;">${r.notas}</span>` : ''}
             </div>
           </td>
         </tr>`
      : (r.notas
          ? `<tr style="background:${bg};page-break-inside:avoid;">
               <td colspan="8" style="padding:0 10px 10px 10px;">
                 <span style="background:#fffbeb;color:#92400e;border-radius:4px;padding:2px 10px;font-size:10px;font-style:italic;">${r.notas}</span>
               </td>
             </tr>`
          : '')

    return `
      <tr style="background:${bg};page-break-inside:avoid;border-top:1px solid #e2e8f0;">
        <td style="padding:10px 10px 4px;">${fecha}</td>
        <td style="padding:10px 10px 4px;font-weight:700;color:#1e293b;">${fmt(r.peso_kg)} kg</td>
        <td style="padding:10px 10px 4px;">${fmt(r.altura_cm)} cm</td>
        <td style="padding:10px 10px 4px;">${fmtPct(r.pct_grasa)}</td>
        <td style="padding:10px 10px 4px;">${fmtPct(r.pct_musculo)}</td>
        <td style="padding:10px 10px 4px;font-size:11px;color:#64748b;">${r.objetivo ?? '—'}</td>
        <td style="padding:10px 10px 4px;">
          <span style="background:#1e293b;color:#fff;border-radius:20px;padding:2px 10px;font-size:11px;font-weight:700;">
            ${fmt(r.tmb)} / ${fmt(r.tdee)}
          </span>
        </td>
        <td style="padding:10px 10px 4px;font-size:11px;color:#64748b;">${r.nutriologo}</td>
      </tr>
      ${macroRow}`
  }).join('')

  const totalRegistros = data.registros.length

  // Calcular progreso de peso (primero vs último)
  const pesoInicial = data.registros.length > 0 ? data.registros[data.registros.length - 1].peso_kg : null
  const pesoActual  = data.registros.length > 0 ? data.registros[0].peso_kg : null
  const difPeso     = pesoInicial != null && pesoActual != null
    ? (pesoActual - pesoInicial).toFixed(1)
    : null

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Historial Físico — ${data.suscriptor.nombre}</title>
  <style>
    ${BASE_CSS}
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
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
    .stat-card .val { font-size: 20px; font-weight: 800; color: #ea580c; }
    .stat-card .lbl { font-size: 10px; color: #64748b; margin-top: 2px; text-transform: uppercase; letter-spacing: .5px; }
    .hist-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      font-size: 12px;
    }
    .hist-table thead tr { background: #1e293b; }
    .hist-table thead th {
      padding: 9px 10px;
      color: #94a3b8;
      font-size: 10px;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: .5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${LOGO_URL}" alt="AXF GymNet" onerror="this.style.display='none'" />
    <div class="header-right">
      <div class="doc-title">Historial Físico</div>
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
          <span>Registros totales: <strong>${totalRegistros}</strong></span>
          ${difPeso != null
            ? `<span>Cambio de peso: <strong style="color:${parseFloat(difPeso) <= 0 ? '#16a34a' : '#dc2626'};">${parseFloat(difPeso) > 0 ? '+' : ''}${difPeso} kg</strong></span>`
            : ''}
        </div>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="val">${totalRegistros}</div>
        <div class="lbl">Mediciones</div>
      </div>
      <div class="stat-card">
        <div class="val">${pesoActual != null ? `${pesoActual} kg` : '—'}</div>
        <div class="lbl">Peso actual</div>
      </div>
      <div class="stat-card">
        <div class="val">${pesoInicial != null ? `${pesoInicial} kg` : '—'}</div>
        <div class="lbl">Peso inicial</div>
      </div>
      <div class="stat-card">
        <div class="val" style="color:${difPeso != null && parseFloat(difPeso) <= 0 ? '#16a34a' : '#dc2626'};">
          ${difPeso != null ? `${parseFloat(difPeso) > 0 ? '+' : ''}${difPeso} kg` : '—'}
        </div>
        <div class="lbl">Variación total</div>
      </div>
    </div>

    <div class="section-title">Historial de Mediciones</div>
    <table class="hist-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Peso</th>
          <th>Altura</th>
          <th>% Grasa</th>
          <th>% Músculo</th>
          <th>Objetivo</th>
          <th>TMB / TDEE</th>
          <th>Nutriólogo</th>
        </tr>
      </thead>
      <tbody>
        ${filas || `<tr><td colspan="8" style="padding:20px;text-align:center;color:#94a3b8;">Sin registros</td></tr>`}
      </tbody>
    </table>

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
//  ANÁLISIS DE INCIDENCIAS
// ════════════════════════════════════════════════════════════════════════════

export function generarPDFAnalisis(data: AnalisisPDFData) {
  const formatearFecha = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const prioritariosHtml = data.reportes_prioritarios.length > 0
    ? data.reportes_prioritarios.map(r => `
      <div style="border: 1px solid #fca5a5; background: #fef2f2; border-radius: 8px; padding: 12px; margin-bottom: 10px; page-break-inside: avoid;">
        <div style="display:flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-weight: 800; color: #991b1b; font-size: 13px;">#${r.id_reporte} - ${r.categoria.replace(/_/g, ' ')}</span>
          <span style="background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">
            ${r.num_strikes} Strikes
          </span>
        </div>
        <div style="color: #475569; font-size: 11px; margin-bottom: 8px;"><strong>Descripción del caso:</strong> ${r.descripcion}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #fca5a5; padding-top: 8px;">
          <span style="font-size: 10px; color: #991b1b; font-weight: 700;">Estado: ${r.estado}</span>
          <span style="font-size: 10px; color: #64748b;">Reportado el: ${formatearFecha(r.creado_en)}</span>
        </div>
      </div>
    `).join('')
    : '<div style="color: #64748b; font-size: 11px; font-style: italic; padding: 10px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; text-align: center;">No se encontraron incidentes críticos en este periodo. Excelente gestión.</div>'

  const categoriasHtml = data.categorias && data.categorias.length > 0
    ? `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">
        ${data.categorias.map(c => `
          <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; background: #f8fafc; page-break-inside: avoid;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">${c.name.replace(/_/g, ' ')}</div>
            <div style="font-size: 18px; color: #ea580c; font-weight: 900; margin-top: 4px;">${c.cantidad}</div>
            <div style="font-size: 9px; color: #94a3b8;">incidentes reportados</div>
          </div>
        `).join('')}
       </div>`
    : '<div style="margin-bottom: 20px; color: #64748b; font-size: 11px; font-style: italic;">Sin suficientes datos de categorías.</div>'

  const pendientesHtml = data.todos_pendientes.length > 0
    ? data.todos_pendientes.map(r => `
      <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; background: #fffbeb;">
        <td style="padding: 8px; font-weight: 700; color: #92400e;">#${r.id_reporte}</td>
        <td style="padding: 8px; color: #475569;">${r.categoria.replace(/_/g, ' ')}</td>
        <td style="padding: 8px; color: #64748b; font-size: 10px;">${r.descripcion}</td>
        <td style="padding: 8px; text-align: center; font-size: 10px;">${formatearFecha(r.creado_en)}</td>
        <td style="padding: 8px; text-align: center; font-weight: bold; color: #b45309;">${r.num_strikes}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #64748b; font-style: italic;">No hay reportes pendientes de resolución.</td></tr>'

  const resueltosHtml = data.todos_resueltos.length > 0
    ? data.todos_resueltos.map(r => {
        const diffMs = new Date(r.resuelto_en).getTime() - new Date(r.creado_en).getTime()
        const horas = Math.floor(diffMs / (1000 * 60 * 60))
        return `
        <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; background: #f0fdf4;">
          <td style="padding: 8px; font-weight: 700; color: #166534;">#${r.id_reporte}</td>
          <td style="padding: 8px; color: #475569;">${r.categoria.replace(/_/g, ' ')}</td>
          <td style="padding: 8px; text-align: center; font-size: 10px;">${formatearFecha(r.creado_en)}</td>
          <td style="padding: 8px; text-align: center; font-size: 10px; color: #15803d; font-weight: bold;">${formatearFecha(r.resuelto_en)}</td>
          <td style="padding: 8px; text-align: center; font-weight: bold; color: #475569;">${horas}h</td>
        </tr>
      `}).join('')
    : '<tr><td colspan="5" style="padding: 12px; text-align: center; color: #64748b; font-style: italic;">No hay reportes resueltos en este periodo.</td></tr>'

  const personalRows = data.personal.map((p, i) => `
    <tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'}; page-break-inside: avoid; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px; font-weight: 700; color: #1e293b;">
        ${p.nombre}<br>
        <span style="font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase;">${p.puesto.replace(/_/g, ' ')}</span>
      </td>
      <td style="padding: 10px; text-align: center; color: #64748b; font-weight: 600;">${p.total_dietas}</td>
      <td style="padding: 10px; text-align: center; color: #64748b; font-weight: 600;">${p.total_rutinas}</td>
      <td style="padding: 10px; text-align: center; color: #2563eb; font-weight: 800;">${p.total_servicios}</td>
      <td style="padding: 10px; text-align: center; color: #dc2626; font-weight: 800;">${p.total_reportes}</td>
      <td style="padding: 10px; text-align: center;">
        <span style="padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; 
          background: ${p.total_reportes === 0 ? '#dcfce7' : p.tasa_reportes > 10 || p.tasa_reportes === Infinity ? '#fee2e2' : '#fef3c7'};
          color: ${p.total_reportes === 0 ? '#15803d' : p.tasa_reportes > 10 || p.tasa_reportes === Infinity ? '#b91c1c' : '#b45309'};">
          ${p.total_reportes === 0 ? '0%' : p.tasa_reportes === Infinity ? 'Crítico' : `${p.tasa_reportes}%`}
        </span>
      </td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Informe Exhaustivo de Incidencias — AXF GymNet</title>
  <style>
    ${BASE_CSS}
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .stat-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 12px;
      text-align: center;
      page-break-inside: avoid;
    }
    .stat-card.main { border-color: #ea580c; background: #fffaf5; }
    .stat-card.success { border-color: #10b981; background: #f0fdf4; }
    .stat-card.warning { border-color: #f59e0b; background: #fffbeb; }
    
    .stat-card .val { font-size: 24px; font-weight: 900; }
    .stat-card.main .val { color: #ea580c; }
    .stat-card.success .val { color: #10b981; }
    .stat-card.warning .val { color: #f59e0b; }
    
    .stat-card .lbl { font-size: 10px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      font-size: 11px;
      margin-bottom: 24px;
    }
    .data-table thead tr { background: #1e293b; }
    .data-table thead th {
      padding: 10px;
      color: #f8fafc;
      font-size: 10px;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${LOGO_URL}" alt="AXF GymNet" onerror="this.style.display='none'" />
    <div class="header-right">
      <div class="doc-title" style="font-size: 18px; text-transform: uppercase;">Informe Directivo de Incidencias</div>
      <div class="doc-date">Evaluación de Periodo: ${data.fechaInicio} — ${data.fechaFin}</div>
    </div>
  </div>

  <div class="page">
    <div class="info-card">
      <div class="info-accent"></div>
      <div class="info-body">
        <div class="name">Sucursal Operativa: ${data.sucursal}</div>
        <div class="meta" style="margin-top: 10px;">
          <span>Fecha de Generación: <strong>${data.fechaGeneracion}</strong></span>
          <span>Impacto Estadístico (Total Histórico en Fechas): <strong style="color: #ea580c;">${data.metricas.total_estadistico} quejas procesadas</strong></span>
        </div>
      </div>
    </div>

    <!-- RESUMEN EJECUTIVO -->
    <div class="section-title">Resumen Ejecutivo</div>
    <div style="font-size: 12px; color: #475569; margin-bottom: 16px; line-height: 1.6; text-align: justify;">
      Este documento presenta un análisis detallado del desempeño del servicio y la gestión de quejas en la sucursal <strong>${data.sucursal}</strong>. Durante el periodo comprendido entre <strong>${data.fechaInicio}</strong> y <strong>${data.fechaFin}</strong>, se han registrado un total de <strong>${data.metricas.total}</strong> reportes activos, alcanzando una tasa de resolución global del <strong>${data.metricas.tasa_resolucion}%</strong>. El objetivo de este informe es proveer visibilidad sobre áreas críticas, identificar deficiencias operativas y evaluar la eficiencia del equipo de trabajo frente a las solicitudes de los suscriptores.
    </div>

    <div class="stat-grid">
      <div class="stat-card main">
        <div class="val">${data.metricas.total}</div>
        <div class="lbl">Reportes Ingresados</div>
      </div>
      <div class="stat-card success">
        <div class="val">${data.metricas.tasa_resolucion}%</div>
        <div class="lbl">Tasa de Efectividad</div>
      </div>
      <div class="stat-card success">
        <div class="val">${data.metricas.resueltos}</div>
        <div class="lbl">Casos Cerrados</div>
      </div>
      <div class="stat-card warning">
        <div class="val">${data.metricas.pendientes}</div>
        <div class="lbl">Casos Pendientes</div>
      </div>
    </div>

    <!-- CATEGORIZACION -->
    <div class="section-title">Análisis Visual y Categorización</div>
    
    <div style="display: flex; gap: 20px; margin-bottom: 20px;">
      ${data.chartEstado 
        ? `<div style="flex: 1; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; background: #fff; page-break-inside: avoid;">
             <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">Estado de Reportes</div>
             <img src="${data.chartEstado}" style="width: 100%; max-height: 200px; object-fit: contain;" />
           </div>`
        : ''}
      
      ${data.chartCategorias
        ? `<div style="flex: 2; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; background: #fff; page-break-inside: avoid;">
             <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-bottom: 10px;">Distribución de Reportes por Categoría</div>
             <img src="${data.chartCategorias}" style="width: 100%; max-height: 200px; object-fit: contain;" />
           </div>`
        : ''}
    </div>

    ${categoriasHtml}

    <!-- ALERTA CRITICA -->
    <div class="section-title" style="color: #b91c1c; border-bottom-color: #fca5a5;">🚨 Reportes de Atención Inmediata (Prioridad Alta y Críticos)</div>
    <div style="font-size: 11px; color: #475569; margin-bottom: 12px; line-height: 1.4;">
      A continuación se detallan los incidentes que requieren acción directiva, incluyendo aquellos que han superado los 3 strikes (quejas reiteradas del mismo suscriptor) o que pertenecen a categorías de alto riesgo como comportamiento del personal o fallas graves en equipo.
    </div>
    <div style="margin-bottom: 24px;">
      ${prioritariosHtml}
    </div>

    <!-- PERSONAL -->
    <div class="section-title" style="color: #1d4ed8; border-bottom-color: #bfdbfe;">👥 Auditoría de Desempeño del Personal</div>
    <div style="font-size: 11px; color: #475569; margin-bottom: 12px; line-height: 1.4;">
      Relación entre los servicios impartidos por el personal y la cantidad de quejas recibidas en su contra. Una Tasa de Riesgo superior al 10% requiere evaluación.
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Personal y Cargo</th>
          <th style="text-align: center;">Dietas Asignadas</th>
          <th style="text-align: center;">Rutinas Asignadas</th>
          <th style="text-align: center;">Total Servicios</th>
          <th style="text-align: center; color: #fca5a5;">Quejas en Contra</th>
          <th style="text-align: center;">Tasa de Riesgo</th>
        </tr>
      </thead>
      <tbody>
        ${personalRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#64748b;">No hay personal activo con servicios en este análisis.</td></tr>'}
      </tbody>
    </table>

    <!-- INVENTARIO PENDIENTES -->
    <div class="section-title" style="color: #b45309; border-bottom-color: #fde68a;">⏳ Inventario de Reportes Pendientes de Acción</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 10%;">ID</th>
          <th style="width: 25%;">Categoría</th>
          <th style="width: 35%;">Descripción</th>
          <th style="width: 20%; text-align: center;">Fecha de Creación</th>
          <th style="width: 10%; text-align: center;">Strikes</th>
        </tr>
      </thead>
      <tbody>
        ${pendientesHtml}
      </tbody>
    </table>

    <!-- INVENTARIO RESUELTOS -->
    <div class="section-title" style="color: #15803d; border-bottom-color: #bbf7d0;">✅ Histórico de Reportes Solucionados</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 10%;">ID</th>
          <th style="width: 30%;">Categoría</th>
          <th style="width: 25%; text-align: center;">Apertura</th>
          <th style="width: 25%; text-align: center;">Cierre</th>
          <th style="width: 10%; text-align: center;">Tiempo</th>
        </tr>
      </thead>
      <tbody>
        ${resueltosHtml}
      </tbody>
    </table>

    <div class="footer">
      <span class="brand">AXF GymNet Operaciones</span>
      <span>Documento Confidencial Generado Automáticamente</span>
      <span>Página 1 de 1</span>
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