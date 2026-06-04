import { useState, useEffect, useMemo } from 'react'
import { getSuscriptoresNutricion, getRecetas, getIngredientes, crearDieta, getRegistros } from '../../../api/nutricionApi'
import type { SuscriptorNutricion, RecetaAPI, IngredienteAPI } from '../../../api/nutricionApi'
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
  prot: string
  grasas: string
  carbs: string
  notas: string
  id_receta?: number
}

type Plan = Record<string, Comida[]>

let comidaCounter = 0
function nuevaComida(nombre?: string): Comida {
  comidaCounter++
  return { id: comidaCounter, nombre: nombre ?? 'Comida', texto: '', kcal: '', prot: '', grasas: '', carbs: '', notas: '' }
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
  const [ingredientes, setIngredientes] = useState<IngredienteAPI[]>([])
  const [cargando, setCargando]         = useState(true)
  const [loadError, setLoadError]       = useState('')

  // ── Plan ──────────────────────────────────────────────────────────────────
  const [diaActivo, setDiaActivo] = useState('Lunes')
  const [plan, setPlan]           = useState<Plan>({
    Lunes: [nuevaComida('Desayuno'), nuevaComida('Comida'), nuevaComida('Cena')],
  })
  
  const [tabSidebar, setTabSidebar] = useState<'recetas' | 'ingredientes'>('recetas')
  const [busqueda, setBusqueda] = useState('')
  const [dragItem, setDragItem] = useState<{ id: number, type: 'receta' | 'ingrediente' } | null>(null)
  
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState('')
  const [errorGuardar, setErrorGuardar] = useState('')
  const [mostrarModalCorreo, setMostrarModalCorreo] = useState(false)
  const [correoDestino, setCorreoDestino] = useState('')

  // ── Cargar datos ───────────────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const [sus, recs, ings] = await Promise.all([
          getSuscriptoresNutricion(), 
          getRecetas(),
          getIngredientes()
        ])
        setSuscriptores(sus)
        setRecetas(recs)
        setIngredientes(ings)
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

  const [metaDiaria, setMetaDiaria]       = useState(2600)
  const [cargandoMeta, setCargandoMeta]   = useState(false)
  const [grasasMin, setGrasasMin]         = useState<number | null>(null)
  const [grasasMax, setGrasasMax]         = useState<number | null>(null)
  
  const [protMin, setProtMin]         = useState<number | null>(null)
  const [protMax, setProtMax]         = useState<number | null>(null)
  
  const [carbsMin, setCarbsMin]         = useState<number | null>(null)
  const [carbsMax, setCarbsMax]         = useState<number | null>(null)

  // Cuando se selecciona un suscriptor, traer su último TDEE registrado
  useEffect(() => {
    if (!susSelId) return
    setCargandoMeta(true)
    getRegistros(susSelId)
      .then(registros => {
        if (registros.length > 0) {
          if (registros[0].tdee != null) setMetaDiaria(Math.round(registros[0].tdee))
          else setMetaDiaria(2600)
          setGrasasMin(registros[0].grasas_min)
          setGrasasMax(registros[0].grasas_max)
          setProtMin(registros[0].proteinas_min)
          setProtMax(registros[0].proteinas_max)
          setCarbsMin(registros[0].carbs_min)
          setCarbsMax(registros[0].carbs_max)
        } else {
          setMetaDiaria(2600)
          setGrasasMin(null); setGrasasMax(null);
          setProtMin(null); setProtMax(null);
          setCarbsMin(null); setCarbsMax(null);
        }
      })
      .catch(() => setMetaDiaria(2600))
      .finally(() => setCargandoMeta(false))
  }, [susSelId])

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

  // Drag & drop recetas / ingredientes
  const soltarItem = (comidaId: number) => {
    if (!dragItem) return
    let textoAgregado = ''
    let addKcal = 0, addProt = 0, addGrasas = 0, addCarbs = 0
    let idRecetaAsignada: number | undefined

    if (dragItem.type === 'receta') {
      const receta = recetas.find(r => r.id_receta === dragItem.id)
      if (!receta) return
      const ingsTexto = receta.ingredientes
        .map(i => `• ${i.nombre}: ${i.cantidad} ${i.unidad_medicion}`)
        .join('\n')
      textoAgregado = `📋 ${receta.nombre}\n${ingsTexto}`
      addKcal = parseFloat(receta.calorias as any) ?? 0
      addProt = parseFloat(receta.proteinas_g as any) ?? 0
      addGrasas = parseFloat(receta.grasas_g as any) ?? 0
      addCarbs = parseFloat(receta.carbohidratos_g as any) ?? 0
      idRecetaAsignada = receta.id_receta
    } else {
      const ing = ingredientes.find(i => i.id_ingrediente === dragItem.id)
      if (!ing) return
      textoAgregado = `• ${ing.nombre}: ${ing.cantidad_base} ${ing.unidad_medicion}`
      addKcal = parseFloat(ing.kcal_base as any) ?? 0
      addProt = parseFloat(ing.proteinas_base as any) ?? 0
      addGrasas = parseFloat(ing.grasas_base as any) ?? 0
      addCarbs = parseFloat(ing.carbohidratos_base as any) ?? 0
    }

    setComidas(comidas.map(c => {
      if (c.id !== comidaId) return c
      const kcalActual = parseFloat(c.kcal) || 0
      const protActual = parseFloat(c.prot) || 0
      const grasasActual = parseFloat(c.grasas) || 0
      const carbsActual = parseFloat(c.carbs) || 0
      
      return {
        ...c,
        texto: c.texto ? `${c.texto}\n\n${textoAgregado}` : textoAgregado,
        kcal: String(Math.round(kcalActual + addKcal)),
        prot: String(Math.round(protActual + addProt)),
        grasas: String(Math.round(grasasActual + addGrasas)),
        carbs: String(Math.round(carbsActual + addCarbs)),
        id_receta: dragItem.type === 'receta' ? idRecetaAsignada : c.id_receta,
      }
    }))
    setDragItem(null)
  }

  const totalesDia = useMemo(() => {
    return comidas.reduce((s, c) => ({
      kcal: s.kcal + (parseFloat(c.kcal) || 0),
      prot: s.prot + (parseFloat(c.prot) || 0),
      grasas: s.grasas + (parseFloat(c.grasas) || 0),
      carbs: s.carbs + (parseFloat(c.carbs) || 0),
    }), { kcal: 0, prot: 0, grasas: 0, carbs: 0 })
  }, [comidas])

  const recetasFiltradas = useMemo(() =>
    recetas.filter(r => r.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [busqueda, recetas])

  const ingredientesFiltrados = useMemo(() =>
    ingredientes.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase())),
    [busqueda, ingredientes])

  // ── Guardar dieta ─────────────────────────────────────────────────────────
  const guardarDieta = async () => {
    if (!susSel) return
    setGuardando(true)
    setErrorGuardar('')
    try {
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
        correo_destino: correoDestino.trim() || undefined,
        comidas: comidasPayload,
      })

      setExito('✅ Dieta guardada. Enviando correo con PDF...')
      setMostrarModalCorreo(false)

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

  const prepararGuardado = () => {
    const hayComidas = Object.values(plan).some(coms => coms.length > 0)
    if (!hayComidas) {
      setErrorGuardar('Agrega al menos una comida a la dieta.')
      return
    }

    setErrorGuardar('')
    setMostrarModalCorreo(true)
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
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Proteínas</p>
                <p className="text-sm font-black text-blue-600">{Math.round(totalesDia.prot)}g</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Grasas</p>
                <p className="text-sm font-black text-yellow-500">{Math.round(totalesDia.grasas)}g</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Carbs</p>
                <p className="text-sm font-black text-green-600">{Math.round(totalesDia.carbs)}g</p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">
                  Kcal {diaActivo} / Meta
                  {cargandoMeta && <span className="ml-1 text-gray-400 animate-pulse">···</span>}
                </p>
                <p className={`text-sm font-black ${totalesDia.kcal > metaDiaria ? 'text-red-500' : 'text-[#ea580c]'}`}>
                  {Math.round(totalesDia.kcal).toLocaleString()} / {metaDiaria.toLocaleString()}
                </p>
              </div>
            </div>
            {grasasMin != null && grasasMax != null && protMin != null && carbsMin != null && (
              <div className="flex items-center gap-4 mt-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500 uppercase">Rango Recomendado:</span>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-blue-600">PROT</span>
                    <span className="text-[11px] text-black font-bold">{protMin} - {protMax}g</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-yellow-600">GRAS</span>
                    <span className="text-[11px] text-black font-bold">{grasasMin} - {grasasMax}g</span>
                  </div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-green-600">CARB</span>
                    <span className="text-[11px] text-black font-bold">{carbsMin} - {carbsMax}g</span>
                  </div>
                </div>
              </div>
            )}
            <span className="text-[10px] text-gray-400 italic mt-2">PDF se genera al guardar</span>
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

        <div id="pdf-dieta" className="flex gap-4 items-start relative">
          
          {/* Panel recetas / ingredientes */}
          <div className="w-64 shrink-0 sticky top-4 flex flex-col max-h-[calc(100vh-120px)] bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div className="flex rounded-lg bg-gray-200 p-1 mb-3">
              <button
                onClick={() => { setTabSidebar('recetas'); setBusqueda(''); }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${tabSidebar === 'recetas' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                Recetas
              </button>
              <button
                onClick={() => { setTabSidebar('ingredientes'); setBusqueda(''); }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors ${tabSidebar === 'ingredientes' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                Ingredientes
              </button>
            </div>

            <input type="text" placeholder={`Buscar ${tabSidebar}...`} value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs text-black mb-3 bg-white shrink-0 focus:outline-none focus:border-[#ea580c]" />
            
            <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[300px]">
              {tabSidebar === 'recetas' ? (
                <>
                  {recetasFiltradas.map(r => (
                    <div key={r.id_receta} draggable onDragStart={() => setDragItem({ id: r.id_receta, type: 'receta' })}
                      className="bg-white border border-gray-200 rounded-lg p-2 cursor-grab hover:border-[#ea580c] hover:shadow-sm transition-all">
                      <p className="text-xs font-bold text-black mb-1">{r.nombre}</p>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        <span className="bg-orange-100 text-orange-800 px-1.5 rounded">{r.calorias ?? 0} Kcal</span>
                        <span className="bg-blue-100 text-blue-800 px-1.5 rounded">{r.proteinas_g ?? 0}g Prot</span>
                      </div>
                    </div>
                  ))}
                  {recetasFiltradas.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>}
                </>
              ) : (
                <>
                  {ingredientesFiltrados.map(ing => (
                    <div key={ing.id_ingrediente} draggable onDragStart={() => setDragItem({ id: ing.id_ingrediente, type: 'ingrediente' })}
                      className="bg-white border border-gray-200 rounded-lg p-2 cursor-grab hover:border-[#ea580c] hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start mb-1.5">
                        <p className="text-xs font-bold text-black leading-tight">{ing.nombre}</p>
                        <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 rounded ml-1 whitespace-nowrap">
                          {ing.cantidad_base}{ing.unidad_medicion}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center">
                        <div className="bg-gray-50 rounded py-0.5"><p className="text-[8px] text-gray-400">KCAL</p><p className="text-[9px] font-bold text-black">{ing.kcal_base}</p></div>
                        <div className="bg-gray-50 rounded py-0.5"><p className="text-[8px] text-gray-400">PROT</p><p className="text-[9px] font-bold text-black">{ing.proteinas_base}</p></div>
                        <div className="bg-gray-50 rounded py-0.5"><p className="text-[8px] text-gray-400">GRAS</p><p className="text-[9px] font-bold text-black">{ing.grasas_base}</p></div>
                        <div className="bg-gray-50 rounded py-0.5"><p className="text-[8px] text-gray-400">CARB</p><p className="text-[9px] font-bold text-black">{ing.carbohidratos_base}</p></div>
                      </div>
                    </div>
                  ))}
                  {ingredientesFiltrados.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>}
                </>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200 shrink-0">
              <p className="text-[10px] text-gray-400 italic text-center">Arrastra elementos hacia las comidas</p>
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

            <div className="space-y-4">
              {comidas.map(comida => (
                <div key={comida.id}
                  className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => soltarItem(comida.id)}
                >
                  <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <input
                      value={comida.nombre}
                      onChange={e => actualizarComida(comida.id, 'nombre', e.target.value)}
                      className="font-bold text-sm text-black bg-transparent border-none outline-none w-40" />
                    <button onClick={() => eliminarComida(comida.id)}
                      className="text-red-400 hover:text-red-600 font-bold text-sm">✕</button>
                  </div>

                  <div className="p-3">
                    <div className="mb-3">
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Ingredientes y Detalles <span className="font-normal text-gray-400">(escribe manual o suelta elementos aquí)</span>
                      </label>
                      <textarea
                        value={comida.texto}
                        onChange={e => actualizarComida(comida.id, 'texto', e.target.value)}
                        placeholder="Arrastra una receta o un ingrediente aquí..."
                        rows={comida.texto ? Math.max(3, comida.texto.split('\n').length + 1) : 3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-black bg-white resize-none focus:border-[#ea580c] focus:outline-none transition-colors" />
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Calorías (Kcal)</label>
                        <input type="number" value={comida.kcal} onChange={e => actualizarComida(comida.id, 'kcal', e.target.value)} placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-orange-600 bg-orange-50 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Proteínas (g)</label>
                        <input type="number" value={comida.prot} onChange={e => actualizarComida(comida.id, 'prot', e.target.value)} placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Grasas (g)</label>
                        <input type="number" value={comida.grasas} onChange={e => actualizarComida(comida.id, 'grasas', e.target.value)} placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-yellow-600 bg-yellow-50 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wide text-gray-500 font-bold mb-1">Carbs (g)</label>
                        <input type="number" value={comida.carbs} onChange={e => actualizarComida(comida.id, 'carbs', e.target.value)} placeholder="0"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-green-600 bg-green-50 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Notas Adicionales</label>
                      <input type="text" value={comida.notas}
                        onChange={e => actualizarComida(comida.id, 'notas', e.target.value)}
                        placeholder="Ej: Preparar sin sal, usar poco aceite..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-black bg-white focus:outline-none" />
                    </div>
                  </div>
                </div>
              ))}

              {comidas.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 bg-gray-50 rounded-xl p-8 text-center text-gray-500 text-sm font-medium">
                  Presiona "+ Agregar Comida" para comenzar el plan de este día
                </div>
              )}
            </div>

            {comidas.length > 0 && (
              <div className="flex justify-end mt-5">
                <button onClick={prepararGuardado} disabled={guardando}
                  className="bg-[#1e293b] text-white font-bold px-8 py-2.5 rounded-lg hover:bg-[#0f172a] transition-colors text-sm disabled:opacity-50 shadow-md flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {guardando ? 'Guardando...' : 'Guardar y Enviar Correo'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Correo */}
      {mostrarModalCorreo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-black text-lg mb-2 text-center">Enviar Dieta por Correo</h3>
            <p className="text-sm text-gray-500 mb-4 text-center">
              Se enviará la notificación y el PDF al correo registrado del suscriptor. Si deseas usar otro correo, escríbelo aquí:
            </p>
            <input 
              type="email" 
              placeholder="Correo alternativo (opcional)" 
              value={correoDestino}
              onChange={e => setCorreoDestino(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-black mb-4 focus:outline-none focus:border-[#ea580c]" 
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setMostrarModalCorreo(false)}
                className="flex-1 border border-gray-300 text-black font-bold py-2 rounded text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button 
                onClick={guardarDieta} disabled={guardando}
                className="flex-1 bg-[#1e293b] hover:bg-[#0f172a] font-bold py-2 rounded text-sm text-white transition-colors">
                {guardando ? 'Enviando...' : 'Confirmar Envío'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}