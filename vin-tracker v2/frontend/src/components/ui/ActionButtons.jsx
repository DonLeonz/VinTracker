import { memo } from 'react';

const ActionButtons = memo(({ onEdit, onDelete }) => {
  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div className="action-buttons-container">
      <button
        className="action-btn edit"
        onClick={handleEdit}
        title="Editar"
        type="button"
      >
        ✏️
      </button>
      <button
        className="action-btn delete"
        onClick={handleDelete}
        title="Eliminar"
        type="button"
      >
        🗑️
      </button>
    </div>
  );
});

ActionButtons.displayName = 'ActionButtons';

export default ActionButtons;
