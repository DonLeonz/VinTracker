import { useEffect } from 'react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = '¿Deseas continuar con esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning' // warning, danger, success, info
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIconByType = () => {
    switch (type) {
      case 'danger':
        return 'trash';
      case 'success':
        return 'check';
      case 'info':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getColorByType = () => {
    switch (type) {
      case 'danger':
        return '#DC3545';
      case 'success':
        return '#28A745';
      case 'info':
        return '#007BFF';
      default:
        return '#D4A762';
    }
  };

  return (
    <>
      <style>{`
        .confirm-modal-overlay {
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

        .confirm-modal-container {
          background: var(--vin-dark-secondary);
          border: 2px solid ${getColorByType()};
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          max-width: 500px;
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

        .confirm-modal-header {
          background: linear-gradient(135deg, ${getColorByType()}, ${getColorByType()}dd);
          padding: 25px 30px;
          display: flex;
          align-items: center;
          gap: 15px;
          position: relative;
        }

        .confirm-modal-icon {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 24px;
        }

        .confirm-modal-title {
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          flex: 1;
          letter-spacing: 0.5px;
        }

        .confirm-modal-close-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: #ffffff;
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

        .confirm-modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }

        .confirm-modal-body {
          padding: 35px 30px;
          color: var(--vin-light);
        }

        .confirm-modal-message {
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--vin-light-muted);
          margin: 0;
          white-space: pre-wrap;
        }

        .confirm-modal-footer {
          padding: 20px 30px 30px;
          display: flex;
          gap: 15px;
          justify-content: flex-end;
        }

        .confirm-modal-btn {
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

        .confirm-modal-btn-cancel {
          background: var(--vin-dark-tertiary);
          color: var(--vin-light);
          border: 2px solid var(--vin-dark-tertiary);
        }

        .confirm-modal-btn-cancel:hover {
          background: var(--vin-dark-primary);
          border-color: var(--vin-golden);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .confirm-modal-btn-confirm {
          background: linear-gradient(135deg, ${getColorByType()}, ${getColorByType()}dd);
          color: #ffffff;
          box-shadow: 0 4px 15px ${getColorByType()}44;
        }

        .confirm-modal-btn-confirm:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px ${getColorByType()}66;
        }

        @media (max-width: 640px) {
          .confirm-modal-container {
            width: 95%;
          }

          .confirm-modal-header {
            padding: 20px 20px;
          }

          .confirm-modal-title {
            font-size: 1.3rem;
          }

          .confirm-modal-body {
            padding: 25px 20px;
          }

          .confirm-modal-message {
            font-size: 1rem;
          }

          .confirm-modal-footer {
            padding: 15px 20px 20px;
            flex-direction: column;
          }

          .confirm-modal-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="confirm-modal-overlay" onClick={onClose}>
        <div className="confirm-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-modal-header">
            <div className="confirm-modal-icon">
              <span data-uk-icon={`icon: ${getIconByType()}; ratio: 1.5`}></span>
            </div>
            <h3 className="confirm-modal-title">{title}</h3>
            <button className="confirm-modal-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="confirm-modal-body">
            <p className="confirm-modal-message">{message}</p>
          </div>

          <div className="confirm-modal-footer">
            <button
              className="confirm-modal-btn confirm-modal-btn-cancel"
              onClick={onClose}
            >
              <span data-uk-icon="icon: close; ratio: 0.9"></span>
              {cancelText}
            </button>
            <button
              className="confirm-modal-btn confirm-modal-btn-confirm"
              onClick={handleConfirm}
            >
              <span data-uk-icon="icon: check; ratio: 0.9"></span>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmModal;
