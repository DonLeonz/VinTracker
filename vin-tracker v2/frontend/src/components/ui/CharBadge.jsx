import { memo } from 'react';

const CharBadge = ({ count }) => {
  const isValid = count === 17;
  
  return (
    <span className={`char-badge ${isValid ? 'valid' : 'invalid'}`}>
      {count}
    </span>
  );
};

export default memo(CharBadge);
