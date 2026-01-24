import { useState, useCallback, useMemo, memo } from 'react';
import { vinService } from '../services/api';
import { showNotification } from '../utils/helpers';
import ConfirmModal from './modals/ConfirmModal';
import EditVinModal from './modals/EditVinModal';
import TableHeader from './table/TableHeader';
import TableBody from './table/TableBody';

const VinTable = memo(({ title, type, records, isLoading, onRecordsChange, filters }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [editModal, setEditModal] = useState({
    isOpen: false,
    id: null,
    currentVin: ''
  });

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const handleToggleRegistered = useCallback(async (id, isRegistered) => {
    console.log('VinTable handleToggleRegistered:', id, isRegistered);
    const newStatus = isRegistered ? 'No Registrado' : 'Registrado';
    const actionText = isRegistered ? 'desregistrar' : 'registrar';

    setConfirmModal({
      isOpen: true,
      type: isRegistered ? 'warning' : 'success',
      title: `${isRegistered ? 'Desregistrar' : 'Registrar'} VIN`,
      message: `¿Desea ${actionText} este VIN?\n\nEl estado cambiará a: ${newStatus}`,
      onConfirm: async () => {
        try {
          const result = await vinService.toggleRegistered(id, type);
          if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            onRecordsChange && onRecordsChange();
          }
        } catch (error) {
          showNotification('❌ ' + (error.message || 'Error al actualizar estado'), 'danger');
        }
      }
    });
  }, [type, onRecordsChange]);

  const handleEdit = useCallback((id, currentVin) => {
    console.log('VinTable handleEdit:', id, currentVin);
    setEditModal({
      isOpen: true,
      id: id,
      currentVin: currentVin
    });
  }, []);

  const handleEditSave = useCallback(async (newVin) => {
    try {
      const result = await vinService.updateVin(editModal.id, type, newVin);
      if (result.success) {
        showNotification('✅ VIN actualizado correctamente', 'success');
        onRecordsChange && onRecordsChange();
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al actualizar VIN'), 'danger');
    }
  }, [editModal.id, type, onRecordsChange]);

  const handleDelete = useCallback((id, vin) => {
    console.log('VinTable handleDelete:', id, vin);
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar VIN',
      message: `¿Está seguro de eliminar este registro?\n\nVIN: ${vin}\n\nEsta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          const result = await vinService.deleteVin(id, type);
          if (result.success) {
            showNotification('✅ VIN eliminado correctamente', 'success');
            onRecordsChange && onRecordsChange();
          }
        } catch (error) {
          showNotification('❌ ' + (error.message || 'Error al eliminar VIN'), 'danger');
        }
      }
    });
  }, [type, onRecordsChange]);

  const handleRegisterAll = useCallback(() => {
    // Construir mensaje con información sobre los filtros activos
    let filterInfo = '';
    if (filters.date) {
      filterInfo += `\nFecha: ${filters.date}`;
    }
    if (filters.registered === 'registered') {
      filterInfo += '\nEstado: Solo registrados';
    } else if (filters.registered === 'not_registered') {
      filterInfo += '\nEstado: Solo no registrados';
    }
    if (!filterInfo) {
      filterInfo = '\nSin filtros - Se registrarán TODOS los no registrados';
    }

    setConfirmModal({
      isOpen: true,
      type: 'success',
      title: 'Registrar Todos',
      message: `¿Registrar los VINs de ${type.toUpperCase()} con los siguientes filtros?${filterInfo}`,
      confirmText: 'Registrar Todos',
      onConfirm: async () => {
        try {
          const result = await vinService.registerAll(type, filters);
          if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            onRecordsChange && onRecordsChange();
          }
        } catch (error) {
          showNotification('❌ ' + (error.message || 'Error al registrar todos'), 'danger');
        }
      }
    });
  }, [type, filters, onRecordsChange]);

  const handleUnregisterAll = useCallback(() => {
    // Construir mensaje con información sobre los filtros activos
    let filterInfo = '';
    if (filters.date) {
      filterInfo += `\nFecha: ${filters.date}`;
    }
    if (filters.registered === 'registered') {
      filterInfo += '\nEstado: Solo registrados';
    } else if (filters.registered === 'not_registered') {
      filterInfo += '\nEstado: Solo no registrados';
    }
    if (!filterInfo) {
      filterInfo = '\nSin filtros - Se desregistrarán TODOS los registrados';
    }

    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Desregistrar Todos',
      message: `¿Desregistrar los VINs de ${type.toUpperCase()} con los siguientes filtros?${filterInfo}`,
      confirmText: 'Desregistrar Todos',
      onConfirm: async () => {
        try {
          const result = await vinService.unregisterAll(type, filters);
          if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            onRecordsChange && onRecordsChange();
          }
        } catch (error) {
          showNotification('❌ ' + (error.message || 'Error al desregistrar todos'), 'danger');
        }
      }
    });
  }, [type, filters, onRecordsChange]);

  const handleDeleteAll = useCallback(() => {
    // Construir mensaje con información sobre los filtros activos
    let filterInfo = '';
    if (filters.date) {
      filterInfo += `\nFecha: ${filters.date}`;
    }
    if (filters.registered === 'registered') {
      filterInfo += '\nEstado: Solo registrados';
    } else if (filters.registered === 'not_registered') {
      filterInfo += '\nEstado: Solo no registrados';
    }
    if (!filterInfo) {
      filterInfo = '\nSin filtros - Se eliminarán TODOS los registros';
    }

    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Eliminar Todos',
      message: `⚠️ ¿Eliminar los VINs de ${type.toUpperCase()} con los siguientes filtros?${filterInfo}\n\n⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER`,
      confirmText: 'Eliminar Todos',
      onConfirm: async () => {
        try {
          const result = await vinService.deleteAll(type, filters);
          if (result.success) {
            showNotification('✅ ' + result.message, 'success');
            onRecordsChange && onRecordsChange();
          }
        } catch (error) {
          showNotification('❌ ' + (error.message || 'Error al eliminar todos'), 'danger');
        }
      }
    });
  }, [type, filters, onRecordsChange]);

  return (
    <>
      <div className="uk-card uk-card-default uk-card-body uk-margin-medium slide-in">
        {/* Header */}
        <TableHeader
          title={title}
          count={records.length}
          isCollapsed={isCollapsed}
          onToggle={toggleCollapse}
          onRegisterAll={handleRegisterAll}
          onUnregisterAll={handleUnregisterAll}
          onDeleteAll={handleDeleteAll}
        />

        {/* Table */}
        <div className={`dropdown-content ${isCollapsed ? 'collapsed' : ''}`}>
          <TableBody
            records={records}
            type={type}
            isLoading={isLoading}
            onToggleRegistered={handleToggleRegistered}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText || 'Confirmar'}
      />

      <EditVinModal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ ...editModal, isOpen: false })}
        onSave={handleEditSave}
        currentVin={editModal.currentVin}
      />
    </>
  );
});

VinTable.displayName = 'VinTable';

export default VinTable;
