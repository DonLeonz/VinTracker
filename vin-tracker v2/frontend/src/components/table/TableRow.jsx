import { memo } from 'react';
import { formatDate } from '../../utils/helpers';
import CharBadge from '../ui/CharBadge';
import VinBadge from '../ui/VinBadge';
import RepeatInfo from '../ui/RepeatInfo';
import StatusBadge from '../ui/StatusBadge';
import ActionButtons from '../ui/ActionButtons';

const TableRow = memo(({ 
  record, 
  type, 
  onToggleRegistered, 
  onEdit, 
  onDelete 
}) => {
  const handleToggleClick = () => {
    console.log('Toggle clicked:', record.id, record.registered);
    onToggleRegistered(record.id, record.registered);
  };

  const handleEditClick = () => {
    console.log('Edit clicked:', record.id, record.vin);
    onEdit(record.id, record.vin);
  };

  const handleDeleteClick = () => {
    console.log('Delete clicked:', record.id, record.vin);
    onDelete(record.id, record.vin);
  };

  return (
    <tr>
      <td className="text-gold table-counter">
        {record.counter}
      </td>
      <td>{record.id}</td>
      <td>
        <CharBadge count={record.char_count} />
      </td>
      <td>
        <VinBadge vin={record.vin} type={type} />
        <RepeatInfo
          repeatCount={record.repeat_count}
          lastRegisteredAt={record.last_registered_at}
          createdAt={record.created_at}
        />
      </td>
      <td className="table-date">{formatDate(record.created_at)}</td>
      <td className="uk-text-center">
        <StatusBadge
          isRegistered={record.registered}
          onClick={handleToggleClick}
        />
      </td>
      <td className="uk-text-center">
        <ActionButtons
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
        />
      </td>
    </tr>
  );
});

TableRow.displayName = 'TableRow';

export default TableRow;
