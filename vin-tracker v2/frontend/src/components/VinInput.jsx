import { useState, useCallback, memo } from 'react';
import { processVin, validateVinLength, showNotification } from '../utils/helpers';
import { vinService } from '../services/api';
import ConfirmModal from './modals/ConfirmModal';

const VinInput = ({ onVinAdded }) => {
  const [vin, setVin] = useState('');
  const [type, setType] = useState('delivery');
  const [preview, setPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const handleVinChange = useCallback((e) => {
    const value = e.target.value;
    setVin(value);

    if (value) {
      const processed = processVin(value);
      setPreview(`${processed} (${processed.length} caracteres)`);
    } else {
      setPreview('');
    }
  }, []);

  const handleClearVin = useCallback(() => {
    setVin('');
    setPreview('');
  }, []);

  const handleAddRepeated = useCallback(async (vinValue) => {
    try {
      const result = await vinService.addRepeatedVin(vinValue, type);

      if (result.success) {
        setVin('');
        setPreview('');
        showNotification('✅ ' + result.message, 'success');
        onVinAdded && onVinAdded();
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al agregar VIN repetido'), 'danger');
    }
  }, [type, onVinAdded]);

  const handleAddVin = useCallback(async (e) => {
    e.preventDefault();

    const trimmedVin = vin.trim();

    if (!trimmedVin) {
      showNotification('⚠️ Por favor ingrese un VIN', 'warning');
      return;
    }

    const processedVin = processVin(trimmedVin);

    if (!validateVinLength(trimmedVin)) {
      showNotification(
        `⚠️ El VIN debe tener exactamente 17 caracteres (tiene ${processedVin.length})`,
        'danger'
      );
      return;
    }

    setIsLoading(true);

    // Check database connection before adding VIN
    const connectionStatus = await vinService.checkConnection();
    if (!connectionStatus.isConnected) {
      showNotification(
        '❌ No se puede agregar el VIN: La base de datos está desconectada',
        'danger'
      );
      setIsLoading(false);
      return;
    }

    try {
      const result = await vinService.addVin(trimmedVin, type);

      if (result.is_duplicate) {
        if (result.is_not_registered) {
          showNotification('⚠️ ' + result.message, 'warning');
        } else {
          // Mostrar modal de confirmación para VIN duplicado
          setConfirmModal({
            isOpen: true,
            type: 'warning',
            title: 'VIN Duplicado',
            message: `${result.message}\n\n¿Desea agregarlo como repetido?\n\nContador actual: ${result.repeat_count} repeticiones`,
            confirmText: 'Agregar como Repetido',
            onConfirm: async () => {
              await handleAddRepeated(trimmedVin);
            }
          });
        }
      } else if (result.success) {
        setVin('');
        setPreview('');
        showNotification('✅ VIN agregado correctamente', 'success');
        onVinAdded && onVinAdded();
      }
    } catch (error) {
      showNotification('❌ ' + (error.message || 'Error al agregar VIN'), 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [vin, type, onVinAdded, handleAddRepeated]);

  return (
    <>
      <div className="uk-card uk-card-default uk-card-body uk-margin-medium fade-in">
        <form onSubmit={handleAddVin}>
          <div className="uk-grid-small" data-uk-grid>
            {/* Input VIN con botón X */}
            <div className="uk-width-1-2@m">
              <label className="uk-form-label">Número VIN</label>
              <div className="vin-input-wrapper">
                <input
                  type="text"
                  className="uk-input vin-input-with-clear"
                  placeholder="Ingrese el VIN (O se convierte en 0)"
                  value={vin}
                  onChange={handleVinChange}
                  maxLength="25"
                  disabled={isLoading}
                />
                {vin && !isLoading && (
                  <button
                    type="button"
                    className="vin-clear-btn"
                    onClick={handleClearVin}
                    aria-label="Limpiar"
                  >
                    ✕
                  </button>
                )}
              </div>
              {preview && (
                <div className="vin-preview">
                  Vista previa: {preview}
                </div>
              )}
            </div>

            {/* Select Tipo */}
            <div className="uk-width-1-4@m">
              <label className="uk-form-label">Tipo</label>
              <select
                className="uk-select"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={isLoading}
              >
                <option value="delivery">📦 Delivery</option>
                <option value="service">🔧 Service</option>
              </select>
            </div>

            {/* Botón Agregar */}
            <div className="uk-width-1-4@m uk-flex uk-flex-middle vin-form-submit-wrapper">
              <button
                type="submit"
                className="uk-button uk-button-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span data-uk-spinner="ratio: 0.6"></span>
                    <span className="uk-margin-small-left">Agregando...</span>
                  </>
                ) : (
                  <>
                    <span data-uk-icon="plus"></span>
                    <span className="uk-margin-small-left">Agregar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText || 'Confirmar'}
      />
    </>
  );
};

export default memo(VinInput);
