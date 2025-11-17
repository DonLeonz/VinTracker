import { useState, useEffect } from 'react';
import { processVin, validateVinLength } from '../../utils/helpers';

const EditVinModal = ({
  isOpen,
  onClose,
  onSave,
  currentVin = '',
  title = 'Editar VIN'
}) => {
  const [vin, setVin] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVin(currentVin);
      const processed = processVin(currentVin);
      setPreview(`${processed} (${processed.length} caracteres)`);
      
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, currentVin]);

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

  const handleSave = () => {
    const trimmedVin = vin.trim();

    if (!trimmedVin) {
      return;
    }

    onSave(trimmedVin);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  if (!isOpen) return null;

  const isValid = validateVinLength(vin);

  return (
    <div className="edit-vin-modal-overlay" onClick={onClose}>
      <div className="edit-vin-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="edit-vin-modal-header">
          <div className="edit-vin-modal-icon">
            <span data-uk-icon="icon: pencil; ratio: 1.5"></span>
          </div>
          <h3 className="edit-vin-modal-title">{title}</h3>
          <button className="edit-vin-modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="edit-vin-modal-body">
          <label className="edit-vin-modal-label">
            Número VIN
          </label>
          <input
            type="text"
            className={`edit-vin-modal-input ${!isValid && vin ? 'invalid' : ''}`}
            placeholder="Ingrese el VIN (O se convierte en 0)"
            value={vin}
            onChange={handleVinChange}
            onKeyPress={handleKeyPress}
            maxLength="25"
            autoFocus
          />

          {preview && (
            <div className={`edit-vin-modal-preview ${!isValid ? 'invalid' : ''}`}>
              {preview}
            </div>
          )}

          <div className="edit-vin-modal-hint">
            <strong>Nota:</strong> Los VINs válidos tienen exactamente 17 caracteres. La letra "O" se convertirá automáticamente en "0" (cero).
          </div>
        </div>

        <div className="edit-vin-modal-footer">
          <button
            className="edit-vin-modal-btn edit-vin-modal-btn-cancel"
            onClick={onClose}
          >
            <span data-uk-icon="icon: close; ratio: 0.9"></span>
            Cancelar
          </button>
          <button
            className="edit-vin-modal-btn edit-vin-modal-btn-save"
            onClick={handleSave}
            disabled={!vin.trim()}
          >
            <span data-uk-icon="icon: check; ratio: 0.9"></span>
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditVinModal;
