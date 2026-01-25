import { memo } from 'react';

const RestoreIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="1 4 1 10 7 10"/>
    <polyline points="23 20 23 14 17 14"/>
    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
  </svg>
);

const TrashTableRow = memo(({ 
  record, 
  index, 
  type, 
  onRestore 
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <tr>
      <td>{index + 1}</td>
      <td>
        <span className="vin-display">{record.vin}</span>
      </td>
      <td className="uk-text-center">
        <span className={`char-badge ${record.char_count === 17 ? 'valid' : 'invalid'}`}>
          {record.char_count}
        </span>
      </td>
      <td className="uk-text-center">
        <span className={`status-badge ${record.registered ? 'registered' : 'not-registered'}`}>
          {record.registered ? 'Registrado' : 'No Registrado'}
        </span>
      </td>
      <td className="uk-text-center">
        <span className="repeat-badge">
          {record.repeat_count}
        </span>
      </td>
      <td className="deleted-date">
        {formatDate(record.deleted_at)}
      </td>
      <td className="uk-text-center">
        <button
          className="uk-button uk-button-small uk-button-primary restore-btn"
          onClick={() => onRestore(record.id, type, record.vin)}
          title="Restaurar VIN"
        >
          <span className="btn-icon">{RestoreIcon}</span>
          Restaurar
        </button>
      </td>
    </tr>
  );
});

TrashTableRow.displayName = 'TrashTableRow';

export default TrashTableRow;
