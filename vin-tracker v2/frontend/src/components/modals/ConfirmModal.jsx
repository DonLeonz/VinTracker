import { useEffect } from 'react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = '¿Deseas continuar con esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning'
}) => {
  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIcon = () => {
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

  return (
    <div className="confirm-modal-overlay" onClick={onClose}>
      <div className={`confirm-modal-container type-${type}`} onClick={(e) => e.stopPropagation()}>
        <div className={`confirm-modal-header type-${type}`}>
          <div className="confirm-modal-icon">
            <span data-uk-icon={`icon: ${getIcon()}; ratio: 1.5`}></span>
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
            className={`confirm-modal-btn confirm-modal-btn-confirm type-${type}`}
            onClick={handleConfirm}
          >
            <span data-uk-icon="icon: check; ratio: 0.9"></span>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
