import { useState } from 'react';
import { processVin, validateVinLength, showNotification } from '../utils/helpers';
import { vinService } from '../services/api';

const VinInput = ({ onVinAdded }) => {
  const [vin, setVin] = useState('');
  const [type, setType] = useState('delivery');
  const [preview, setPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVinChange = (e) => {
    const value = e.target.value;
    setVin(value);

    if (value) {
      const processed = processVin(value);
      setPreview(`${processed} (${processed.length} caracteres)`);
    } else {
      setPreview('');
    }
  };

  const handleClearVin = () => {
    setVin('');
    setPreview('');
  };

  const handleAddVin = async (e) => {
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

    try {
      const result = await vinService.addVin(trimmedVin, type);

      if (result.is_duplicate) {
        if (result.is_not_registered) {
          showNotification('⚠️ ' + result.message, 'warning');
        } else {
          const confirmMessage = `🔄 ${result.message}\n\n¿Desea agregarlo como repetido?\n\nContador actual: ${result.repeat_count} repeticiones`;

          if (window.confirm(confirmMessage)) {
            await handleAddRepeated(trimmedVin);
          } else {
            showNotification('⚠️ No se agregó el VIN duplicado', 'warning');
          }
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
  };

  const handleAddRepeated = async (vinValue) => {
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
  };

  return (
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
          <div className="uk-width-1-4@m uk-flex uk-flex-middle" style={{ paddingTop: '25px' }}>
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
  );
};

export default VinInput;
