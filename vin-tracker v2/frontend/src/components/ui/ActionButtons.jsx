const ActionButtons = ({ onEdit, onDelete }) => {
  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Edit button clicked');
    if (onEdit) {
      onEdit();
    }
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Delete button clicked');
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
};

export default ActionButtons;
