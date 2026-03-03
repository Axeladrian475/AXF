import type{ ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  className?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export default function Table<T>({ columns, data, emptyMessage = 'No hay datos disponibles' }: TableProps<T>) {
  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-[#071B2F]">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={`px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500 font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 ${col.className || ''}`}>
                    {typeof col.accessor === 'function' ? col.accessor(item) : (item[col.accessor] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}