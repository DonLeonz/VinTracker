import { memo } from 'react';
import TableRow from './TableRow';

const TableBody = memo(({ 
  records, 
  type, 
  isLoading, 
  onToggleRegistered, 
  onEdit, 
  onDelete 
}) => {
  if (isLoading) {
    return (
      <div className="uk-text-center uk-padding">
        <span data-uk-spinner="ratio: 2"></span>
        <p className="uk-margin-small-top">Cargando...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="empty-state">
        No hay registros de {type}
      </div>
    );
  }

  return (
    <div className="uk-overflow-auto">
      <table className="uk-table uk-table-hover uk-table-divider uk-table-small">
        <thead>
          <tr>
            <th className="table-col-counter">#</th>
            <th className="table-col-id">ID</th>
            <th className="table-col-chars">Caracteres</th>
            <th>VIN</th>
            <th className="table-col-date">Fecha</th>
            <th className="table-col-status uk-text-center">Estado</th>
            <th className="table-col-actions uk-text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <TableRow
              key={record.id}
              record={record}
              type={type}
              onToggleRegistered={onToggleRegistered}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

TableBody.displayName = 'TableBody';

export default TableBody;
