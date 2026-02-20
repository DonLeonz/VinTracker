import { memo } from 'react';

const CountBadge = ({ count }) => {
  return (
    <span className="count-badge">
      {count}
    </span>
  );
};

export default memo(CountBadge);
