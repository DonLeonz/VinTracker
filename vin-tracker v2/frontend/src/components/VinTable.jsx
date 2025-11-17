import { useState } from 'react';
import { formatDate, showNotification } from '../utils/helpers';
import { vinService } from '../services/api';

const VinTable = ({ title, type, records, isLoading, onRecordsChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleRegistered = async (id) => {
    try {
      const result = await vinService.toggleRegistered(id, type);
      if (result.success) {
        showNotification('✅ ' + result.message, 'success');
        onRecordsChange && onRecordsChange();
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al actualizar estado'), 'danger');
    }
  };

  const handleEdit = async (id, currentVin) => {
    const newVin = prompt('Editar VIN:\n(O se convierte en 0)', currentVin);

    if (newVin === null) return;

    const trimmedVin = newVin.trim();

    if (!trimmedVin) {
      showNotification('⚠️ El VIN no puede estar vacío', 'warning');
      return;
    }

    try {
      const result = await vinService.updateVin(id, type, trimmedVin);
      if (result.success) {
        showNotification('✅ VIN actualizado correctamente', 'success');
        onRecordsChange && onRecordsChange();
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al actualizar VIN'), 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;

    try {
      const result = await vinService.deleteVin(id, type);
      if (result.success) {
        showNotification('✅ VIN eliminado correctamente', 'success');
        onRecordsChange && onRecordsChange();
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al eliminar VIN'), 'danger');
    }
  };

  const handleRegisterAll = async () => {
    if (!window.confirm(`¿Registrar TODOS los VINs sin registrar de ${type.toUpperCase()}?`)) return;

    try {
      const result = await vinService.registerAll(type);
      if (result.success) {
        showNotification('✅ ' + result.message, 'success');
        onRecordsChange && onRecordsChange();
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al registrar todos'), 'danger');
    }
  };

  const handleUnregisterAll = async () => {
    if (
      !window.confirm(
        `¿Desregistrar TODOS los VINs registrados de ${type.toUpperCase()}? (Volverán a rojo ❌)`
      )
    )
      return;

    try {
      const result = await vinService.unregisterAll(type);
      if (result.success) {
        showNotification('✅ ' + result.message, 'success');
        onRecordsChange && onRecordsChange();
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al desregistrar todos'), 'danger');
    }
  };

  return (
    <div className="uk-card uk-card-default uk-card-body uk-margin-medium slide-in">
      {/* Header */}
      <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-bottom">
        <div className="uk-flex uk-flex-middle">
          <div className="dropdown-header" onClick={toggleCollapse}>
            <span className={`dropdown-icon ${isCollapsed ? 'collapsed' : ''}`}>
              {isCollapsed ? '▶' : '▼'}
            </span>
            <h2 className="uk-card-title uk-margin-remove">
              {title} <span className="count-badge">{records.length}</span>
            </h2>
          </div>
        </div>

        <div className="uk-flex" data-uk-margin>
          <button
            className="uk-button uk-button-secondary uk-button-small"
            onClick={handleRegisterAll}
          >
            <span data-uk-icon="check"></span>
            <span className="uk-margin-small-left">Registrar Todos</span>
          </button>
          <button
            className="uk-button uk-button-danger uk-button-small"
            onClick={handleUnregisterAll}
          >
            <span data-uk-icon="close"></span>
            <span className="uk-margin-small-left">Desregistrar Todos</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`dropdown-content ${isCollapsed ? 'collapsed' : ''}`}>
        {isLoading ? (
          <div className="uk-text-center uk-padding">
            <span data-uk-spinner="ratio: 2"></span>
            <p className="uk-margin-small-top">Cargando...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            No hay registros de {type}
          </div>
        ) : (
          <div className="uk-overflow-auto">
            <table className="uk-table uk-table-hover uk-table-divider uk-table-small">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th style={{ width: '80px' }}>ID</th>
                  <th style={{ width: '100px' }}>Caracteres</th>
                  <th>VIN</th>
                  <th style={{ width: '180px' }}>Fecha</th>
                  <th style={{ width: '150px' }} className="uk-text-center">Estado</th>
                  <th style={{ width: '120px' }} className="uk-text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="text-gold" style={{ fontWeight: 'bold' }}>
                      {record.counter}
                    </td>
                    <td>{record.id}</td>
                    <td>
                      <span className={`char-badge ${record.char_count === 17 ? 'valid' : 'invalid'}`}>
                        {record.char_count}
                      </span>
                    </td>
                    <td>
                      <span className={`vin-badge ${type}`}>{record.vin}</span>
                      {record.repeat_count > 0 && (
                        <div className="repeat-info">
                          🔄 Repetido {record.repeat_count}{' '}
                          {record.repeat_count === 1 ? 'vez' : 'veces'}
                          <br />
                          Última: {formatDate(record.last_repeated_at || record.created_at)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.9rem' }}>{formatDate(record.created_at)}</td>
                    <td className="uk-text-center">
                      <span
                        className={`status-badge ${record.registered ? 'registered' : 'not-registered'}`}
                        onClick={() => handleToggleRegistered(record.id)}
                      >
                        {record.registered ? '✅ Registrado' : '❌ No Registrado'}
                      </span>
                    </td>
                    <td className="uk-text-center">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEdit(record.id, record.vin)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDelete(record.id)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VinTable;
