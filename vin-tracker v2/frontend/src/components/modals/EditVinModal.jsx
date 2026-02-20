import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { processVin, validateVinLength } from '../../utils/helpers';

// Iconos SVG independientes - no dependen de UIKit
const Icons = {
  pencil: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
};

const EditVinModal = ({
  isOpen,
  onClose,
  onSave,
  currentVin = '',
  title = 'Editar VIN'
}) => {
  const [vin, setVin] = useState('');
  const [preview, setPreview] = useState('');

  const handleSave = useCallback(() => {
    const trimmedVin = vin.trim();

    if (!trimmedVin || !validateVinLength(trimmedVin)) {
      return;
    }

    onSave(processVin(trimmedVin));
    onClose();
  }, [vin, onSave, onClose]);

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

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleSave]);

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

  if (!isOpen) return null;

  const isValid = validateVinLength(vin);

  return createPortal(
    <div className="edit-vin-modal-overlay" onClick={onClose}>
      <div className="edit-vin-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="edit-vin-modal-header">
          <div className="edit-vin-modal-icon">
            {Icons.pencil}
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
            <span className="edit-vin-modal-btn-icon">{Icons.close}</span>
            Cancelar
            <span className="keyboard-hint">Esc</span>
          </button>
          <button
            className="edit-vin-modal-btn edit-vin-modal-btn-save"
            onClick={handleSave}
            disabled={!vin.trim() || !validateVinLength(vin)}
          >
            <span className="edit-vin-modal-btn-icon">{Icons.check}</span>
            Guardar Cambios
            <span className="keyboard-hint">Enter ↵</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EditVinModal;
