import { useState, useEffect } from 'react';
import { processVin, validateVinLength } from '../utils/helpers';

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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
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

  const processedVin = processVin(vin);
  const isValid = validateVinLength(vin);

  return (
    <>
      <style>{`
        .edit-vin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(8px);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .edit-vin-modal-container {
          background: var(--vin-dark-secondary);
          border: 2px solid var(--vin-golden);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          max-width: 600px;
          width: 90%;
          animation: slideUp 0.3s ease;
          overflow: hidden;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .edit-vin-modal-header {
          background: linear-gradient(135deg, var(--vin-golden), var(--vin-golden-dark));
          padding: 25px 30px;
          display: flex;
          align-items: center;
          gap: 15px;
          position: relative;
        }

        .edit-vin-modal-icon {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000000;
          font-size: 24px;
        }

        .edit-vin-modal-title {
          color: #000000;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          flex: 1;
          letter-spacing: 0.5px;
        }

        .edit-vin-modal-close-btn {
          background: rgba(0, 0, 0, 0.2);
          border: none;
          color: #000000;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 20px;
          font-weight: bold;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .edit-vin-modal-close-btn:hover {
          background: rgba(0, 0, 0, 0.3);
          transform: rotate(90deg);
        }

        .edit-vin-modal-body {
          padding: 35px 30px;
        }

        .edit-vin-modal-label {
          color: var(--vin-golden);
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 12px;
          display: block;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .edit-vin-modal-input {
          width: 100%;
          padding: 15px 20px;
          background: var(--vin-dark-tertiary);
          border: 2px solid var(--vin-golden);
          border-radius: 8px;
          color: var(--vin-light);
          font-size: 1.1rem;
          font-family: 'Courier New', monospace;
          letter-spacing: 1.5px;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .edit-vin-modal-input:focus {
          outline: none;
          border-color: var(--vin-golden-light);
          box-shadow: 0 0 0 3px rgba(212, 167, 98, 0.2);
          background: var(--vin-dark-secondary);
        }

        .edit-vin-modal-input.invalid {
          border-color: var(--vin-error);
        }

        .edit-vin-modal-preview {
          margin-top: 15px;
          padding: 15px 20px;
          background: var(--vin-dark-tertiary);
          border: 2px solid ${isValid ? 'var(--vin-success)' : 'var(--vin-error)'};
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          color: ${isValid ? 'var(--vin-success)' : 'var(--vin-error)'};
          font-weight: 700;
          letter-spacing: 1.5px;
          font-size: 1rem;
          text-align: center;
        }

        .edit-vin-modal-hint {
          margin-top: 12px;
          padding: 12px 16px;
          background: rgba(212, 167, 98, 0.1);
          border-left: 4px solid var(--vin-golden);
          border-radius: 6px;
          font-size: 0.9rem;
          color: var(--vin-light-muted);
          line-height: 1.6;
        }

        .edit-vin-modal-footer {
          padding: 20px 30px 30px;
          display: flex;
          gap: 15px;
          justify-content: flex-end;
        }

        .edit-vin-modal-btn {
          padding: 12px 28px;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .edit-vin-modal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-vin-modal-btn-cancel {
          background: var(--vin-dark-tertiary);
          color: var(--vin-light);
          border: 2px solid var(--vin-dark-tertiary);
        }

        .edit-vin-modal-btn-cancel:hover:not(:disabled) {
          background: var(--vin-dark-primary);
          border-color: var(--vin-golden);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .edit-vin-modal-btn-save {
          background: linear-gradient(135deg, var(--vin-golden), var(--vin-golden-dark));
          color: #000000;
          box-shadow: 0 4px 15px rgba(212, 167, 98, 0.4);
        }

        .edit-vin-modal-btn-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 167, 98, 0.6);
          background: linear-gradient(135deg, var(--vin-golden-light), var(--vin-golden));
        }

        @media (max-width: 640px) {
          .edit-vin-modal-container {
            width: 95%;
          }

          .edit-vin-modal-header {
            padding: 20px 20px;
          }

          .edit-vin-modal-title {
            font-size: 1.3rem;
          }

          .edit-vin-modal-body {
            padding: 25px 20px;
          }

          .edit-vin-modal-input {
            padding: 12px 16px;
            font-size: 1rem;
          }

          .edit-vin-modal-footer {
            padding: 15px 20px 20px;
            flex-direction: column;
          }

          .edit-vin-modal-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

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
              <div className="edit-vin-modal-preview">
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
    </>
  );
};

export default EditVinModal;
