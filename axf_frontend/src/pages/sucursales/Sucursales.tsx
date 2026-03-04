import { useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import SearchBar from '../../components/ui/SearchBar';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input from '../../components/ui/Input';

// Datos de prueba basados en tu HTML
const DATOS_MOCK = [
  { id: 1, nombre: 'Sucursal Centro', direccion: 'Av. Principal 123', codigo_postal: '44100', estado: 'Activa' },
  { id: 2, nombre: 'Sucursal Norte', direccion: 'Blvd. Norte 456', codigo_postal: '45000', estado: 'Inactiva' },
];

export default function Sucursales() {
  const [activeTab, setActiveTab] = useState<'lista' | 'agregar' | 'modificar'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el modal de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Configuración de las columnas de tu tabla
  const columns = [
    { header: 'ID', accessor: 'id' as const },
    { header: 'Nombre', accessor: 'nombre' as const },
    { header: 'Dirección', accessor: 'direccion' as const },
    { header: 'C.P.', accessor: 'codigo_postal' as const },
    { 
      header: 'Estado', 
      accessor: (row: any) => <Badge text={row.estado} variant={row.estado === 'Activa' ? 'success' : 'danger'} />
    },
    {
      header: 'Acciones',
      accessor: (row: any) => (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setActiveTab('modificar')}>
            Editar
          </Button>
          <Button variant="danger" size="sm" onClick={() => { setItemToDelete(row); setIsDeleteModalOpen(true); }}>
            Eliminar
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-full">
      {/* HEADER DEL MÓDULO */}
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#071B2F]">Gestión de Sucursales</h1>
          <p className="text-gray-500 text-sm mt-1">Administra la información de todas las sucursales del sistema.</p>
        </div>
        
        {/* NAVEGACIÓN TIPO PESTAÑAS (Basado en tu HTML) */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'lista' ? 'bg-white shadow text-[#071B2F]' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('lista')}
          >
            Lista de Sucursales
          </button>
          <button 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'agregar' ? 'bg-white shadow text-[#071B2F]' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('agregar')}
          >
            Agregar Nueva
          </button>
          {activeTab === 'modificar' && (
            <button className="px-4 py-2 text-sm font-medium rounded-md bg-[#F26A21] text-white shadow">
              Modificando...
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO DINÁMICO */}
      <div className="p-6">
        
        {/* VISTA: LISTA */}
        {activeTab === 'lista' && (
          <div className="space-y-4">
            <div className="w-full max-w-md">
              <SearchBar placeholder="Buscar sucursal por nombre..." onSearch={setSearchTerm} />
            </div>
            <Table columns={columns} data={DATOS_MOCK} emptyMessage="No hay sucursales registradas." />
          </div>
        )}

        {/* VISTA: AGREGAR */}
        {activeTab === 'agregar' && (
          <form className="max-w-2xl space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Sucursal agregada (Simulación)'); setActiveTab('lista'); }}>
            <h3 className="text-lg font-bold text-[#F26A21] border-b pb-2">Datos de la Nueva Sucursal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nombre de la Sucursal" name="nombre" required placeholder="Ej. Sucursal Centro" />
              <Input label="Código Postal" name="cp" required placeholder="Ej. 44100" />
              <div className="md:col-span-2">
                <Input label="Dirección Completa" name="direccion" required placeholder="Calle, número, colonia..." />
              </div>
              <Input label="Usuario (Login)" name="usuario" required placeholder="usuario_admin" />
              <Input label="Contraseña Temporal" name="password" type="password" required placeholder="••••••••" />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit">Guardar Sucursal</Button>
            </div>
          </form>
        )}

        {/* VISTA: MODIFICAR */}
        {activeTab === 'modificar' && (
          <form className="max-w-2xl space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Sucursal actualizada (Simulación)'); setActiveTab('lista'); }}>
            <h3 className="text-lg font-bold text-blue-600 border-b pb-2">Modificar Sucursal Existente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nombre de la Sucursal" name="nombre_mod" required defaultValue="Sucursal Centro" />
              <Input label="Código Postal" name="cp_mod" required defaultValue="44100" />
              <div className="md:col-span-2">
                <Input label="Dirección Completa" name="direccion_mod" required defaultValue="Av. Principal 123" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="secondary" onClick={() => setActiveTab('lista')} type="button">Cancelar</Button>
              <Button type="submit">Actualizar Datos</Button>
            </div>
          </form>
        )}

      </div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title="Eliminar Sucursal"
        message={`¿Estás seguro de que deseas eliminar la ${itemToDelete?.nombre}? Esta acción no se puede deshacer.`}
        confirmText="Sí, eliminar"
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          alert(`Sucursal ${itemToDelete?.id} eliminada.`);
          setIsDeleteModalOpen(false);
        }}
      />
    </div>
  );
}