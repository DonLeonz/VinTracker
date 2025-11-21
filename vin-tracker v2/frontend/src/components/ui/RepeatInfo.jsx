import { memo } from 'react';
import { formatDate } from '../../utils/helpers';

const RepeatInfo = ({ repeatCount, lastRegisteredAt, createdAt }) => {
  if (!repeatCount || repeatCount === 0) return null;

  return (
    <div className="repeat-info">
      🔄 Repetido {repeatCount} {repeatCount === 1 ? 'vez' : 'veces'}
      <br />
      Último registro: {formatDate(lastRegisteredAt || createdAt)}
    </div>
  );
};

export default memo(RepeatInfo);
