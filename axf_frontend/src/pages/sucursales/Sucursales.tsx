import { useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

// Datos de prueba basados en tu tabla HTML original
const DATOS_MOCK = [
  { id: 1, nombre: 'Sucursal Centro', direccion: 'Av. Principal 123', gerente: 'gerente_centro', estado: 'Activa' },
  { id: 2, nombre: 'Sucursal Norte', direccion: 'Blvd. Norte 456', gerente: 'gerente_norte', estado: 'Inactiva' },
];

export default function Sucursales() {
  // Las 3 pestañas exactas de tu maquetado
  const [activeTab, setActiveTab] = useState<'agregar' | 'modificar' | 'lista'>('agregar');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Columnas exactas de tu tabla HTML
  const columns = [
    { header: 'ID', accessor: 'id' as const },
    { header: 'Nombre', accessor: 'nombre' as const, className: 'font-bold text-[#071B2F]' },
    { header: 'Dirección', accessor: 'direccion' as const },
    { header: 'Gerente', accessor: 'gerente' as const },
    { 
      header: 'Estado', 
      accessor: (row: any) => <Badge text={row.estado} variant={row.estado === 'Activa' ? 'success' : 'danger'} />
    },
    {
      header: 'Acciones',
      accessor: (row: any) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => {
            setActiveTab('modificar');
            // Aquí en un futuro cargaríamos los datos reales en el formulario
          }}>
            Modificar
          </Button>
          <Button variant="danger" size="sm" onClick={() => { setItemToDelete(row); setIsDeleteModalOpen(true); }}>
            Eliminar
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER Y NAVEGACIÓN */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <img src="/axfLogo.png" alt="AxF Logo" className="h-12 object-contain hidden sm:block" />
          <div>
            <h1 className="text-3xl font-black text-[#071B2F] tracking-tight">Módulo de Gestión de Sucursales</h1>
          </div>
        </div>

        {/* Botones de navegación (module-nav) */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
          <button 
            className={`px-6 py-2 text-sm font-bold rounded-t-lg transition-colors border-b-4 ${activeTab === 'agregar' ? 'border-[#F26A21] text-[#071B2F] bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('agregar')}
          >
            Agregar Sucursal
          </button>
          <button 
            className={`px-6 py-2 text-sm font-bold rounded-t-lg transition-colors border-b-4 ${activeTab === 'modificar' ? 'border-[#F26A21] text-[#071B2F] bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('modificar')}
          >
            Modificar Sucursales
          </button>
          <button 
            className={`px-6 py-2 text-sm font-bold rounded-t-lg transition-colors border-b-4 ${activeTab === 'lista' ? 'border-[#F26A21] text-[#071B2F] bg-gray-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('lista')}
          >
            Lista de Sucursales
          </button>
        </div>
      </div>

      {/* CONTENIDO DE LAS PESTAÑAS */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        
        {/* SECCIÓN 1: AGREGAR SUCURSAL */}
        {activeTab === 'agregar' && (
          <div className="max-w-3xl">
            <h3 className="text-xl font-bold text-[#071B2F] mb-6 border-b border-gray-100 pb-2">Agregar Nueva Sucursal</h3>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Sucursal guardada'); }}>
              <Input label="Nombre de la Sucursal:" name="nombre" required />
              <Input label="Dirección:" name="direccion" required />
              <Input label="Teléfono:" name="telefono" />
              <Input label="Email de Contacto:" name="email" type="email" />
              <Input label="Gerente Asignado (Usuario):" name="gerente" required />
              <Input label="Contraseña del Gerente:" name="password" type="password" required />
              
              <div className="pt-4">
                <Button type="submit" className="bg-[#071B2F] hover:bg-[#0a2642] w-full sm:w-auto">
                  Guardar Sucursal
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* SECCIÓN 2: MODIFICAR SUCURSAL */}
        {activeTab === 'modificar' && (
          <div className="max-w-3xl">
            <h3 className="text-xl font-bold text-[#071B2F] mb-6 border-b border-gray-100 pb-2">Modificar Sucursal</h3>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Sucursal actualizada'); }}>
              
              <Input 
                label="Seleccione Sucursal:" 
                name="sucursal_select" 
                type="select" 
                options={[
                  { value: '1', label: 'Sucursal Centro' },
                  { value: '2', label: 'Sucursal Norte' }
                ]} 
              />
              
              <Input label="Nombre de la Sucursal:" name="nombre_modificar" id="nombre_modificar" />
              <Input label="Dirección:" name="direccion_modificar" id="direccion_modificar" />
              
              <Input 
                label="Estado:" 
                name="estado_modificar" 
                type="select" 
                options={[
                  { value: 'Activa', label: 'Activa' },
                  { value: 'Inactiva', label: 'Inactiva' }
                ]} 
              />
              
              <div className="pt-4">
                <Button type="submit" className="bg-[#071B2F] hover:bg-[#0a2642] w-full sm:w-auto">
                  Actualizar Sucursal
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* SECCIÓN 3: LISTA DE SUCURSALES */}
        {activeTab === 'lista' && (
          <div>
            <h3 className="text-xl font-bold text-[#071B2F] mb-6 border-b border-gray-100 pb-2">Lista de Sucursales</h3>
            <Table columns={columns} data={DATOS_MOCK} emptyMessage="No hay sucursales registradas." />
          </div>
        )}

      </div>

      {/* MODAL DE ELIMINACIÓN */}
      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title="Eliminar Sucursal"
        message={`¿Estás seguro de que quieres eliminar la sucursal ID: ${itemToDelete?.id}?`}
        confirmText="Sí, eliminar"
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          alert(`Sucursal ID: ${itemToDelete?.id} eliminada (simulación).`);
          setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
}