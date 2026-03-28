import { useState, useEffect, useMemo } from 'react'
import { getSuscriptoresNutricion, getRecetas, crearDieta } from '../../../api/nutricionApi'
import type { SuscriptorNutricion, RecetaAPI } from '../../../api/nutricionApi'
import { generarPDFDieta } from '../../../utils/pdfExport'
import type { DietaPDFData } from '../../../utils/pdfExport'

interface Props { onBack: () => void }

const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
const DIA_NUM: Record<string, number> = { Lunes:1, Martes:2, Miércoles:3, Jueves:4, Viernes:5, Sábado:6, Domingo:7 }

interface Comida {
  id: number
  nombre: string
  texto: string
  kcal: string
  notas: string
  id_receta?: number
}

type Plan = Record<string, Comida[]>

let comidaCounter = 0
function nuevaComida(nombre?: string): Comida {
  comidaCounter++
  return { id: comidaCounter, nombre: nombre ?? `Comida ${comidaCounter}`, texto: '', kcal: '', notas: '' }
}

export default function CrearDieta({ onBack }: Props) {
  // ── Verificación ──────────────────────────────────────────────────────────
  const [verificando, setVerificando] = useState(true)
  const [busVerif, setBusVerif]       = useState('')
  const [susSelId, setSusSelId]       = useState<number | null>(null)
  const [errorSesion, setErrorSesion] = useState('')

  // ── Datos del servidor ─────────────────────────────────────────────────────
  const [suscriptores, setSuscriptores] = useState<SuscriptorNutricion[]>([])
  const [recetas, setRecetas]           = useState<RecetaAPI[]>([])
  const [cargando, setCargando]         = useState(true)
  const [loadError, setLoadError]       = useState('')

  // ── Plan ──────────────────────────────────────────────────────────────────
  const [diaActivo, setDiaActivo] = useState('Lunes')
  const [plan, setPlan]           = useState<Plan>({
    Lunes: [nuevaComida('Desayuno'), nuevaComida('Comida'), nuevaComida('Cena')],
  })
  const [busReceta, setBusReceta] = useState('')
  const [dragId, setDragId]       = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState('')
  const [errorGuardar, setErrorGuardar] = useState('')

  // ── Cargar datos ───────────────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const [sus, recs] = await Promise.all([getSuscriptoresNutricion(), getRecetas()])
        setSuscriptores(sus)
        setRecetas(recs)
      } catch (e: any) {
        setLoadError(e?.response?.data?.message ?? 'Error al cargar datos. Verifica tu sesión.')
      } finally { setCargando(false) }
    }
    cargar()
  }, [])

  const susFiltrados = useMemo(() =>
    suscriptores.filter(s => {
      const full = `${s.nombres} ${s.apellido_paterno} ${s.apellido_materno ?? ''}`.toLowerCase()
      return full.includes(busVerif.toLowerCase())
    }), [busVerif, suscriptores])

  const susSel = suscriptores.find(s => s.id_suscriptor === susSelId) ?? null
  const nombreCompleto = (s: SuscriptorNutricion) =>
    `${s.nombres} ${s.apellido_paterno} ${s.apellido_materno ?? ''}`.trim()

  const metaDiaria = 2600

  // ── Verificar sesión ──────────────────────────────────────────────────────
  const verificar = () => {
    if (!susSel) { setErrorSesion('Selecciona un suscriptor.'); return }
    if (susSel.sesiones_nutriologo <= 0) {
      setErrorSesion(`Acceso denegado: ${nombreCompleto(susSel)} no tiene sesiones de nutriólogo disponibles.`)
      return
    }
    setErrorSesion('')
    setVerificando(false)
  }

  // ── Helpers plan ──────────────────────────────────────────────────────────
  const comidas = plan[diaActivo] ?? []

  const setComidas = (nuevas: Comida[]) =>
    setPlan(prev => ({ ...prev, [diaActivo]: nuevas }))

  const agregarComida = () =>
    setComidas([...comidas, nuevaComida()])

  const eliminarComida = (id: number) =>
    setComidas(comidas.filter(c => c.id !== id))

  const actualizarComida = (id: number, campo: keyof Comida, val: string) =>
    setComidas(comidas.map(c => c.id === id ? { ...c, [campo]: val } : c))

  // Receta drag & drop
  const soltarReceta = (comidaId: number, recetaId: number) => {
    const receta = recetas.find(r => r.id_receta === recetaId)
    if (!receta) return
    const ingsTexto = receta.ingredientes
      .map(i => `• ${i.nombre}: ${i.cantidad} ${i.unidad_medicion}`)
      .join('\n')
    const texto = `📋 ${receta.nombre} (${receta.calorias ?? 0} Kcal | ${receta.proteinas_g ?? 0}g prot)\n${ingsTexto}`

    setComidas(comidas.map(c => {
      if (c.id !== comidaId) return c
      return {
        ...c,
        texto: c.texto ? `${c.texto}\n\n${texto}` : texto,
        kcal: c.kcal ? String(parseInt(c.kcal) + (receta.calorias ?? 0)) : String(receta.calorias ?? 0),
        id_receta: receta.id_receta,
      }
    }))
  }

  const totalKcal = comidas.reduce((s, c) => s + (parseInt(c.kcal) || 0), 0)

  const recetasFiltradas = useMemo(() =>
    recetas.filter(r => r.nombre.toLowerCase().includes(busReceta.toLowerCase())),
    [busReceta, recetas])

  // ── Guardar dieta ─────────────────────────────────────────────────────────
  const guardarDieta = async () => {
    if (!susSel) return
    setGuardando(true)
    setErrorGuardar('')
    try {
      // Construir array de comidas para todos los días
      const comidasPayload: { dia: number; orden_comida: number; descripcion: string; id_receta?: number; calorias?: number; notas?: string }[] = []

      for (const [dia, coms] of Object.entries(plan)) {
        const numDia = DIA_NUM[dia] ?? 1
        coms.forEach((c, idx) => {
          comidasPayload.push({
            dia: numDia,
            orden_comida: idx + 1,
            descripcion: c.texto || c.nombre,
            id_receta: c.id_receta,
            calorias: parseInt(c.kcal) || undefined,
            notas: c.notas || undefined,
          })
        })
      }

      await crearDieta({
        id_suscriptor: susSel.id_suscriptor,
        comidas: comidasPayload,
      })

      setExito('✅ Dieta guardada. Generando PDF...')

      // — Generar PDF profesional automáticamente —
      const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
      const usuario = JSON.parse(localStorage.getItem('usuario') ?? '{}')
      const nombreNutriologo = usuario.nombre ?? usuario.usuario ?? 'Nutriólogo'

      const pdfData: DietaPDFData = {
        suscriptor: {
          nombre: nombreCompleto(susSel),
          sesiones: susSel.sesiones_nutriologo - 1,
        },
        nutriologo: nombreNutriologo,
        plan,
        metaDiaria,
        fecha,
      }
      setTimeout(() => generarPDFDieta(pdfData), 300)
      setTimeout(() => setExito(''), 6000)
    } catch (err: any) {
      setErrorGuardar(err.response?.data?.message || 'Error al guardar dieta')
    } finally {
      setGuardando(false)
    }
  }


  // ── MODAL VERIFICACIÓN ────────────────────────────────────────────────────
  if (verificando) {
    return (
      <div className="p-4">
        <div className="bg-[#f5f5f5] rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4 opacity-30 pointer-events-none">
            <h2 className="text-xl font-bold text-black">Crear Dieta</h2>
          </div>
          <div className="opacity-20 pointer-events-none mb-4 flex gap-4">
            <div className="w-48 space-y-2">
              {['Desayuno','Comida','Cena'].map(n => (
                <div key={n} className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-black">{n}</p>
                  <div className="h-6 bg-gray-100 rounded mt-1" />
                </div>
              ))}
            </div>
            <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg min-h-32" />
          </div>

          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
              <div className="flex justify-center mb-3">
                <svg className="w-12 h-12 text-[#1e293b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="font-bold text-black text-lg mb-1 text-center">Verificación de Sesiones</h3>
              <p className="text-sm text-gray-500 mb-4 text-center">Seleccione al suscriptor para verificar disponibilidad.</p>

              {cargando ? (
                <p className="text-xs text-gray-400 text-center py-4">Cargando suscriptores...</p>
              ) : loadError ? (
                <p className="text-red-600 text-xs font-bold text-center py-4">❌ {loadError}</p>
              ) : (
                <>
                  <input type="text" placeholder="Buscar suscriptor..." value={busVerif}
                    onChange={e => { setBusVerif(e.target.value); setSusSelId(null) }}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black mb-1" />

                  <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 max-h-32 overflow-y-auto">
                    {susFiltrados.map(s => (
                      <button key={s.id_suscriptor}
                        onClick={() => { setSusSelId(s.id_suscriptor); setBusVerif(nombreCompleto(s)) }}
                        className={`w-full text-left px-3 py-2 text-sm border-b border-gray-100 last:border-0 transition-colors
                          ${susSelId === s.id_suscriptor ? 'bg-[#ea580c] text-white font-bold' : 'text-black hover:bg-orange-50'}`}>
                        <span>{nombreCompleto(s)}</span>
                        <span className={`ml-2 text-xs ${susSelId === s.id_suscriptor ? 'text-orange-100' : s.sesiones_nutriologo > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {s.sesiones_nutriologo} sesión{s.sesiones_nutriologo !== 1 ? 'es' : ''}
                        </span>
                      </button>
                    ))}
                    {susFiltrados.length === 0 && (
                      <p className="px-3 py-2 text-xs text-gray-400">Sin resultados</p>
                    )}
                  </div>
                </>
              )}

              {errorSesion && (
                <p className="text-red-600 text-xs font-bold text-center mb-3">{errorSesion}</p>
              )}

              <div className="flex gap-2">
                <button onClick={onBack}
                  className="flex-1 border border-gray-300 text-black font-bold py-2 rounded text-sm hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={verificar} disabled={!susSelId}
                  className={`flex-1 font-bold py-2 rounded text-sm text-white transition-colors
                    ${susSelId ? 'bg-[#1e293b] hover:bg-[#0f172a]' : 'bg-gray-300 cursor-not-allowed'}`}>
                  Verificar y Acceder
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── INTERFAZ PRINCIPAL ────────────────────────────────────────────────────
  return (
    <div className="p-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-500 hover:text-black">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold text-black">Crear Dieta</h2>
              <p className="text-xs text-gray-500">Diseñando para: <span className="font-bold text-[#ea580c]">{susSel ? nombreCompleto(susSel) : ''}</span>
                <span className="ml-2 text-green-600">({susSel?.sesiones_nutriologo} sesiones disponibles)</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 italic">PDF se genera al guardar</span>
            <div className="text-right">
              <p className="text-xs text-gray-500">Meta Diaria</p>
              <p className="font-black text-black">{metaDiaria.toLocaleString()} Kcal</p>
              <p className={`text-xs font-bold ${totalKcal > metaDiaria ? 'text-red-500' : 'text-green-600'}`}>
                Total hoy: {totalKcal.toLocaleString()} Kcal
              </p>
            </div>
          </div>
        </div>

        {exito && (
          <div className="mb-4 bg-green-50 border border-green-300 text-green-800 text-sm font-bold px-4 py-3 rounded-lg">
            ✅ {exito}
          </div>
        )}
        {errorGuardar && (
          <div className="mb-4 bg-red-50 border border-red-300 text-red-800 text-sm font-bold px-4 py-3 rounded-lg">
            ❌ {errorGuardar}
          </div>
        )}

        {/* Selector día */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {DIAS.map(d => (
            <button key={d} onClick={() => {
              setDiaActivo(d)
              if (!plan[d]) setPlan(prev => ({ ...prev, [d]: [nuevaComida('Desayuno'), nuevaComida('Comida'), nuevaComida('Cena')] }))
            }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all
                ${diaActivo === d ? 'bg-[#ea580c] text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}>
              {d}
            </button>
          ))}
        </div>

        <div id="pdf-dieta" className="flex gap-4">
          {/* Panel recetas */}
          <div className="w-52 shrink-0">
            <p className="font-bold text-sm text-black mb-2">🔍 Buscar Receta</p>
            <input type="text" placeholder="Buscar receta por nombre..." value={busReceta}
              onChange={e => setBusReceta(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs text-black mb-2 bg-white" />
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {recetasFiltradas.map(r => (
                <div key={r.id_receta} draggable onDragStart={() => setDragId(r.id_receta)}
                  className="bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-grab hover:border-[#ea580c] hover:shadow-sm transition-all">
                  <p className="text-xs font-bold text-black">{r.nombre}</p>
                  <p className="text-xs text-gray-500">{r.calorias ?? 0} Kcal | {r.proteinas_g ?? 0}g Prot</p>
                </div>
              ))}
              {recetasFiltradas.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs text-gray-400 italic text-center">📄 PDF se genera automáticamente al guardar</p>
            </div>
          </div>

          {/* Plan del día */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm text-black">Plan Alimenticio: {diaActivo}</p>
              <button onClick={agregarComida}
                className="bg-[#ea580c] text-white font-bold px-4 py-1.5 rounded text-xs hover:bg-[#c94a0a] transition-colors flex items-center gap-1">
                + Agregar Comida
              </button>
            </div>

            <div className="space-y-3">
              {comidas.map(comida => (
                <div key={comida.id}
                  className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <input
                      value={comida.nombre}
                      onChange={e => actualizarComida(comida.id, 'nombre', e.target.value)}
                      className="font-bold text-sm text-black bg-transparent border-none outline-none w-40" />
                    <button onClick={() => eliminarComida(comida.id)}
                      className="text-red-400 hover:text-red-600 font-bold text-sm">✕</button>
                  </div>

                  <div className="p-3 space-y-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Ingredientes y Detalles <span className="text-gray-400">(arrastra una receta o escribe manualmente)</span>
                      </label>
                      <textarea
                        value={comida.texto}
                        onChange={e => actualizarComida(comida.id, 'texto', e.target.value)}
                        placeholder="Escribe ingredientes o arrastra una receta aquí..."
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => { if (dragId) soltarReceta(comida.id, dragId); setDragId(null) }}
                        rows={comida.texto ? Math.max(2, comida.texto.split('\n').length + 1) : 2}
                        className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-black bg-white resize-none focus:border-[#ea580c] focus:outline-none transition-colors" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Calorías (Kcal)</label>
                        <input type="number" value={comida.kcal}
                          onChange={e => actualizarComida(comida.id, 'kcal', e.target.value)}
                          placeholder="0"
                          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm text-black bg-white focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Notas (Restricciones / Preparación)</label>
                        <input type="text" value={comida.notas}
                          onChange={e => actualizarComida(comida.id, 'notas', e.target.value)}
                          placeholder="Ej: Usar poco aceite de oliva..."
                          className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm text-black bg-white focus:outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {comidas.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
                  Presiona "+ Agregar Comida" para comenzar el plan de este día
                </div>
              )}
            </div>

            {comidas.length > 0 && (
              <div className="flex justify-end mt-4">
                <button onClick={guardarDieta} disabled={guardando}
                  className="bg-[#ea580c] text-white font-bold px-6 py-2 rounded hover:bg-[#c94a0a] transition-colors text-sm disabled:opacity-50">
                  {guardando ? 'Guardando...' : '💾 Guardar Dieta Completa'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
