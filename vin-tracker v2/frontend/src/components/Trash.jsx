import { useState, useEffect, useCallback, useMemo } from 'react';
import { vinService } from '../services/api';
import { showNotification } from '../utils/helpers';
import ConfirmModal from './modals/ConfirmModal';
import Filters from './Filters';
import TrashTableRow from './table/TrashTableRow';

// Iconos SVG independientes
const Icons = {
  trash: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  ),
  restore: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="1 4 1 10 7 10"/>
      <polyline points="23 20 23 14 17 14"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  ),
  emptyTrash: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  back: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  )
};

const Trash = ({ onBack }) => {
  const [deliveryRecords, setDeliveryRecords] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    date: '',
    registered: 'all',
    search: '',
    repeated: 'all'
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const loadDeletedRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await vinService.getDeleted();
      if (result.success) {
        setDeliveryRecords(result.delivery || []);
        setServiceRecords(result.service || []);
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al cargar registros eliminados'), 'danger');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeletedRecords();
  }, [loadDeletedRecords]);

  // Función para filtrar registros
  const filterRecords = useCallback((records) => {
    return records.filter(record => {
      // Filtro por fecha
      if (filters.date) {
        const recordDate = new Date(record.deleted_at).toISOString().split('T')[0];
        if (recordDate !== filters.date) return false;
      }

      // Filtro por estado de registro
      if (filters.registered !== 'all') {
        if (filters.registered === 'registered' && !record.registered) return false;
        if (filters.registered === 'not_registered' && record.registered) return false;
      }

      // Filtro por búsqueda de VIN
      if (filters.search) {
        if (!record.vin.toLowerCase().includes(filters.search.toLowerCase())) return false;
      }

      // Filtro por repetidos
      if (filters.repeated !== 'all') {
        if (filters.repeated === 'repeated' && record.repeat_count === 0) return false;
        if (filters.repeated === 'not_repeated' && record.repeat_count > 0) return false;
      }

      return true;
    });
  }, [filters]);

  // Memoizar registros filtrados
  const filteredDeliveryRecords = useMemo(() => 
    filterRecords(deliveryRecords), 
    [deliveryRecords, filterRecords]
  );

  const filteredServiceRecords = useMemo(() => 
    filterRecords(serviceRecords), 
    [serviceRecords, filterRecords]
  );

  // Manejadores de filtros
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      date: '',
      registered: 'all',
      search: '',
      repeated: 'all'
    });
  }, []);

  const handleRestore = useCallback((id, type, vin) => {
    setConfirmModal({
      isOpen: true,
      type: 'success',
      title: 'Restaurar VIN',
      message: `¿Desea restaurar este VIN?\n\nVIN: ${vin}\n\nSe restaurará a su estado anterior.`,
      confirmText: 'Restaurar',
      onConfirm: async () => {
        try {
          const result = await vinService.restoreVin(id, type);
          if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            loadDeletedRecords();
          }
        } catch (error) {
          showNotification('❌ ' + (error.message || 'Error al restaurar VIN'), 'danger');
        }
      }
    });
  }, [loadDeletedRecords]);

  const handleRestoreAll = useCallback((type) => {
    const typeName = type === 'delivery' ? 'DELIVERY' : 'SERVICE';
    const filteredRecords = type === 'delivery' ? filteredDeliveryRecords : filteredServiceRecords;
    const count = filteredRecords.length;
    const ids = filteredRecords.map(r => r.id);

    setConfirmModal({
      isOpen: true,
      type: 'success',
      title: `Restaurar Todos - ${typeName}`,
      message: `¿Restaurar todos los VINs de ${typeName}?\n\nSe restaurarán ${count} registros.`,
      confirmText: 'Restaurar Todos',
      onConfirm: async () => {
        try {
          const result = await vinService.restoreAll(type, ids);
          if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            loadDeletedRecords();
          }
        } catch (error) {
          showNotification('❌ ' + (error.message || 'Error al restaurar'), 'danger');
        }
      }
    });
  }, [filteredDeliveryRecords, filteredServiceRecords, loadDeletedRecords]);

  const handleEmptyTrash = useCallback((type) => {
    const typeName = type === 'delivery' ? 'DELIVERY' : 'SERVICE';
    const filteredRecords = type === 'delivery' ? filteredDeliveryRecords : filteredServiceRecords;
    const count = filteredRecords.length;
    const ids = filteredRecords.map(r => r.id);

    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: `Vaciar Papelera - ${typeName}`,
      message: `⚠️ ¿ELIMINAR PERMANENTEMENTE todos los VINs de ${typeName}?\n\nSe eliminarán ${count} registros.\n\n⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER`,
      confirmText: 'Eliminar Permanentemente',
      onConfirm: async () => {
        try {
          const result = await vinService.emptyTrash(type, true, ids);
          if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            loadDeletedRecords();
          }
        } catch (error) {
          showNotification('❌ ' + (error.message || 'Error al vaciar papelera'), 'danger');
        }
      }
    });
  }, [filteredDeliveryRecords, filteredServiceRecords, loadDeletedRecords]);

  const renderTable = (records, type, typeName) => {
    const hasRecords = records.length > 0;

    return (
      <div className="trash-section">
        <div className="trash-section-header">
          <div className="trash-section-title">
            <span className="trash-icon">{Icons.trash}</span>
            <h3>{typeName}</h3>
            <span className="trash-count">{records.length} {records.length === 1 ? 'registro' : 'registros'}</span>
          </div>
          
          {hasRecords && (
            <div className="trash-actions">
              <button 
                className="uk-button uk-button-small uk-button-default"
                onClick={() => handleRestoreAll(type)}
              >
                <span className="btn-icon">{Icons.restore}</span>
                Restaurar Todos
              </button>
              <button 
                className="uk-button uk-button-small uk-button-danger"
                onClick={() => handleEmptyTrash(type)}
              >
                <span className="btn-icon">{Icons.emptyTrash}</span>
                Vaciar Papelera
              </button>
            </div>
          )}
        </div>

        {!hasRecords ? (
          <div className="trash-empty">
            <p>✨ No hay registros eliminados en {typeName}</p>
          </div>
        ) : (
          <div className="uk-overflow-auto">
            <table className="uk-table uk-table-divider uk-table-striped uk-table-hover uk-table-small">
              <thead>
                <tr>
                  <th className="uk-table-shrink">#</th>
                  <th>VIN</th>
                  <th className="uk-text-center">Caracteres</th>
                  <th className="uk-text-center">Estado</th>
                  <th className="uk-text-center">Repeticiones</th>
                  <th>Eliminado</th>
                  <th className="uk-text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <TrashTableRow
                    key={record.id}
                    record={record}
                    index={index}
                    type={type}
                    onRestore={handleRestore}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const totalRecords = deliveryRecords.length + serviceRecords.length;
  const totalFilteredRecords = filteredDeliveryRecords.length + filteredServiceRecords.length;

  return (
    <>
      <div className="trash-container">
        <div className="trash-header">
          <button 
            className="uk-button uk-button-default back-btn"
            onClick={onBack}
          >
            <span className="btn-icon">{Icons.back}</span>
            Volver
          </button>
          
          <div className="trash-title-section">
            <h1 className="trash-title">
              <span className="title-icon">{Icons.trash}</span>
              Papelera de Reciclaje
            </h1>
            <p className="trash-subtitle">
              {totalRecords === 0 
                ? 'La papelera está vacía' 
                : `${totalRecords} ${totalRecords === 1 ? 'registro eliminado' : 'registros eliminados'}`
              }
              {totalRecords > 0 && totalFilteredRecords !== totalRecords && 
                ` (${totalFilteredRecords} ${totalFilteredRecords === 1 ? 'filtrado' : 'filtrados'})`
              }
            </p>
          </div>
        </div>

        {/* Filtros */}
        {totalRecords > 0 && (
          <Filters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            onRefresh={loadDeletedRecords}
            hideExportButtons={true}
          />
        )}

        {isLoading ? (
          <div className="uk-text-center" style={{ padding: '50px' }}>
            <div uk-spinner="ratio: 2"></div>
            <p style={{ marginTop: '20px' }}>Cargando registros eliminados...</p>
          </div>
        ) : (
          <>
            {renderTable(filteredDeliveryRecords, 'delivery', 'DELIVERY')}
            {renderTable(filteredServiceRecords, 'service', 'SERVICE')}
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
      />
    </>
  );
};

export default Trash;
