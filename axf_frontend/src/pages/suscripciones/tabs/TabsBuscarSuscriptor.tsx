import { useState, useEffect, useCallback } from 'react'
import {
  getSuscriptoresLocales,
  getSuscriptoresOtrasSucursales,
  migrarSuscriptor,
  type SuscriptorResumen,
} from '../../../api/suscripcionesApi'

interface Props {
  onGestionar: (id: string, nombre: string) => void
}

type Vista = 'local' | 'otras'

export default function TabsBuscarSuscriptor({ onGestionar }: Props) {
  const [vista, setVista] = useState<Vista>('local')
  const [busqueda, setBusqueda] = useState('')
  const [suscriptores, setSuscriptores] = useState<SuscriptorResumen[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [migrando, setMigrando] = useState<number | null>(null)
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; msg: string } | null>(null)

  const mostrarToast = (tipo: 'ok' | 'err', msg: string) => {
    setToast({ tipo, msg })
    setTimeout(() => setToast(null), 3500)
  }

  const cargar = useCallback(async (q: string, v: Vista) => {
    setCargando(true)
    setError(null)
    try {
      const data = v === 'local'
        ? await getSuscriptoresLocales(q)
        : await getSuscriptoresOtrasSucursales(q)
      setSuscriptores(data)
    } catch {
      setError('No se pudo cargar la lista de suscriptores.')
      setSuscriptores([])
    } finally {
      setCargando(false)
    }
  }, [])

  // Cargar al montar y cuando cambia la vista
  useEffect(() => {
    cargar(busqueda, vista)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vista])

  const handleBuscar = () => cargar(busqueda, vista)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleBuscar()
  }

  const handleMigrar = async (s: SuscriptorResumen) => {
    if (!confirm(`¿Migrar a ${s.nombre_completo} a esta sucursal?`)) return
    setMigrando(s.id_suscriptor)
    try {
      const res = await migrarSuscriptor(s.id_suscriptor)
      mostrarToast('ok', res.message)
      // Quitar al suscriptor de la lista de otras sucursales
      setSuscriptores(prev => prev.filter(x => x.id_suscriptor !== s.id_suscriptor))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Error al migrar el suscriptor.'
      mostrarToast('err', msg)
    } finally {
      setMigrando(null)
    }
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-bold transition-all
          ${toast.tipo === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.tipo === 'ok' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      <h2 className="text-xl font-bold text-black mb-4">Gestión de Suscripciones</h2>

      {/* Tabs Vista */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setVista('local'); setBusqueda('') }}
          className={`px-5 py-1.5 rounded-full text-sm font-bold border-2 transition-all
            ${vista === 'local' ? 'bg-[#1e293b] text-white border-[#1e293b]' : 'bg-white text-black border-gray-300 hover:bg-gray-100'}`}>
          Suscriptores Locales
        </button>
        <button
          onClick={() => { setVista('otras'); setBusqueda('') }}
          className={`px-5 py-1.5 rounded-full text-sm font-bold border-2 transition-all
            ${vista === 'otras' ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-white text-black border-gray-300 hover:bg-gray-100'}`}>
          Otras Sucursales
        </button>
      </div>

      {/* Descripción de vista */}
      {vista === 'otras' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 mb-4 text-sm text-orange-800">
          <span className="font-bold">ℹ️ Suscriptores foráneos:</span> Puedes migrar a cualquier suscriptor a esta sucursal.
          Una vez migrado aparecerá en la lista local y podrás administrar su suscripción.
        </div>
      )}

      {/* Barra de búsqueda */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center border border-gray-300 rounded bg-white px-3 gap-2">
          <span className="text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nombre, correo o ID..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 py-2 text-sm text-black bg-transparent outline-none"
          />
        </div>
        <button
          onClick={handleBuscar}
          disabled={cargando}
          className="bg-gray-700 text-white font-bold px-5 py-2 rounded text-sm hover:bg-gray-800 transition-colors disabled:opacity-50">
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <div className="text-center py-10 text-gray-400 text-sm">Cargando suscriptores...</div>
      ) : suscriptores.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          {vista === 'local' ? 'No hay suscriptores en esta sucursal.' : 'No se encontraron suscriptores en otras sucursales.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left font-bold text-black pb-2 pr-4">ID</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Suscriptor</th>
                <th className="text-left font-bold text-black pb-2 pr-4">Correo</th>
                {vista === 'otras' && (
                  <th className="text-left font-bold text-black pb-2 pr-4">Sucursal Origen</th>
                )}
                <th className="text-left font-bold text-black pb-2">Acción</th>
              </tr>
            </thead>
            <tbody>
              {suscriptores.map(s => (
                <tr key={s.id_suscriptor} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4 text-black font-mono text-xs">SUS-{s.id_publico}</td>
                  <td className="py-3 pr-4">
                    <p className="text-black font-bold">{s.nombre_completo}</p>
                    {s.telefono && <p className="text-gray-400 text-xs">{s.telefono}</p>}
                  </td>
                  <td className="py-3 pr-4 text-gray-600 text-xs">{s.correo}</td>
                  {vista === 'otras' && (
                    <td className="py-3 pr-4">
                      <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded">
                        {s.sucursal_registro}
                      </span>
                    </td>
                  )}
                  <td className="py-3">
                    {vista === 'local' ? (
                      <button
                        onClick={() => onGestionar(String(s.id_suscriptor), s.nombre_completo)}
                        className="bg-[#1e293b] text-white text-xs font-bold px-4 py-2 rounded hover:bg-[#0f172a] transition-colors">
                        Gestionar Suscripción
                      </button>
                    ) : (
                      <button
                        onClick={() => handleMigrar(s)}
                        disabled={migrando === s.id_suscriptor}
                        className="bg-[#ea580c] text-white text-xs font-bold px-4 py-2 rounded hover:bg-[#c94a0a] transition-colors disabled:opacity-50">
                        {migrando === s.id_suscriptor ? 'Migrando...' : '📥 Migrar a esta sucursal'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-gray-400 text-xs mt-3">{suscriptores.length} suscriptor(es) encontrado(s).</p>
        </div>
      )}
    </div>
  )
}