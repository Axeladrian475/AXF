import { useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// Datos de prueba basados exactamente en tu tabla MySQL
const DATOS_MOCK = [
  { id_sucursal: 1, nombre: 'Sucursal Central AxF', direccion: 'Av. Principal 123', codigo_postal: '45000', usuario: 'admin', activa: 1 },
];

export default function Sucursales() {
  const [activeTab, setActiveTab] = useState<'agregar' | 'modificar' | 'lista'>('agregar');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Columnas mapeadas exactamente a tu base de datos
  const columns = [
    { header: 'ID', accessor: 'id_sucursal' as const },
    { header: 'Nombre', accessor: 'nombre' as const, className: 'font-bold text-[#071B2F]' },
    { header: 'Dirección', accessor: 'direccion' as const },
    { header: 'C.P.', accessor: 'codigo_postal' as const },
    { header: 'Usuario', accessor: 'usuario' as const },
    { 
      header: 'Estado', 
      accessor: (row: any) => <Badge text={row.activa === 1 ? 'Activa' : 'Inactiva'} variant={row.activa === 1 ? 'success' : 'danger'} />
    },
    {
      header: 'Acciones',
      accessor: (row: any) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setActiveTab('modificar')}>
            Modificar
          </Button>
          <Button variant="danger" size="sm" onClick={() => { setItemToDelete(row); setIsDeleteModalOpen(true); }}>
            Desactivar
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in" style={{ fontFamily: 'sans-serif' }}>
      
      {/* HEADER COMO EN EL MAQUETADO */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-4xl font-black text-[#071B2F] tracking-wide" style={{ fontFamily: 'Jockey One, sans-serif' }}>
          MÓDULO DE GESTIÓN DE SUCURSALES
        </h1>
      </div>

      {/* NAVEGACIÓN DE PESTAÑAS (Estilo clásico del maquetado) */}
      <div className="flex border-b-2 border-[#071B2F]">
        <button 
          className={`px-8 py-3 text-lg font-bold transition-colors ${activeTab === 'agregar' ? 'bg-[#F26A21] text-white' : 'bg-gray-200 text-[#071B2F] hover:bg-gray-300'}`}
          onClick={() => setActiveTab('agregar')}
        >
          Agregar Sucursal
        </button>
        <button 
          className={`px-8 py-3 text-lg font-bold transition-colors ${activeTab === 'modificar' ? 'bg-[#F26A21] text-white' : 'bg-gray-200 text-[#071B2F] hover:bg-gray-300'}`}
          onClick={() => setActiveTab('modificar')}
        >
          Modificar Sucursales
        </button>
        <button 
          className={`px-8 py-3 text-lg font-bold transition-colors ${activeTab === 'lista' ? 'bg-[#F26A21] text-white' : 'bg-gray-200 text-[#071B2F] hover:bg-gray-300'}`}
          onClick={() => setActiveTab('lista')}
        >
          Lista de Sucursales
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white rounded-b-xl shadow-lg border border-gray-200 p-8">
        
        {/* PESTAÑA 1: AGREGAR SUCURSAL */}
        {activeTab === 'agregar' && (
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold text-[#F26A21] mb-6 border-b-2 border-gray-100 pb-2">Registrar Nueva Sucursal</h3>
            
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert('Listo para conectar al backend'); }}>
              {/* Campos exactos de la BD */}
              <Input label="Nombre de la Sucursal:" name="nombre" required placeholder="Ej. Sucursal Providencia" />
              <Input label="Dirección Completa:" name="direccion" required placeholder="Calle, número, colonia" />
              <Input label="Código Postal:" name="codigo_postal" required placeholder="Ej. 45000" />
              
              <div className="pt-4 mt-4 border-t border-gray-100">
                <h4 className="text-lg font-bold text-[#071B2F] mb-4">Credenciales de Acceso</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Usuario:" name="usuario" required placeholder="Ej. admin_providencia" />
                  <Input label="Contraseña:" name="password" type="password" required placeholder="••••••••" />
                </div>
              </div>
              
              <div className="pt-6">
                <button type="submit" className="bg-[#071B2F] text-white font-bold text-lg py-3 px-8 rounded hover:bg-slate-800 transition-colors shadow-md">
                  Guardar Sucursal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PESTAÑA 2: MODIFICAR SUCURSAL */}
        {activeTab === 'modificar' && (
          <div className="max-w-2xl">
            <h3 className="text-2xl font-bold text-[#F26A21] mb-6 border-b-2 border-gray-100 pb-2">Modificar Información</h3>
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); }}>
              
              <Input 
                label="Seleccione Sucursal a Modificar:" 
                name="sucursal_select" 
                type="select" 
                options={[
                  { value: '1', label: 'Sucursal Central AxF' }
                ]} 
              />
              
              <Input label="Nombre:" name="nombre_mod" defaultValue="Sucursal Central AxF" />
              <Input label="Dirección:" name="direccion_mod" defaultValue="Av. Principal 123" />
              <Input label="Código Postal:" name="cp_mod" defaultValue="45000" />
              
              <Input 
                label="Estado de Operación:" 
                name="estado_mod" 
                type="select" 
                options={[
                  { value: '1', label: 'Activa' },
                  { value: '0', label: 'Inactiva' }
                ]} 
              />
              
              <div className="pt-6">
                <button type="submit" className="bg-[#071B2F] text-white font-bold text-lg py-3 px-8 rounded hover:bg-slate-800 transition-colors shadow-md">
                  Actualizar Datos
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PESTAÑA 3: LISTA DE SUCURSALES */}
        {activeTab === 'lista' && (
          <div>
            <h3 className="text-2xl font-bold text-[#F26A21] mb-6 border-b-2 border-gray-100 pb-2">Directorio de Sucursales</h3>
            <Table columns={columns} data={DATOS_MOCK} emptyMessage="No hay sucursales registradas." />
          </div>
        )}

      </div>

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title="Desactivar Sucursal"
        message={`¿Estás seguro de que quieres desactivar la sucursal ${itemToDelete?.nombre}? (Se cambiará activa = 0)`}
        confirmText="Sí, desactivar"
        isDanger={true}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          alert('Sucursal desactivada (simulación)');
          setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
}