import { memo } from 'react';
import { formatDate } from '../../utils/helpers';

const RepeatInfo = ({ repeatCount, lastRepeatedAt, createdAt }) => {
  if (!repeatCount || repeatCount === 0) return null;

  return (
    <div className="repeat-info">
      🔄 Repetido {repeatCount} {repeatCount === 1 ? 'vez' : 'veces'}
      <br />
      Última: {formatDate(lastRepeatedAt || createdAt)}
    </div>
  );
};

export default memo(RepeatInfo);
