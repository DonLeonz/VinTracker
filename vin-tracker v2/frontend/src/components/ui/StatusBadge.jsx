import { memo } from 'react';

const StatusBadge = memo(({ isRegistered, onClick }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  return (
    <span
      className={`status-badge ${isRegistered ? 'registered' : 'not-registered'}`}
      onClick={handleClick}
    >
      {isRegistered ? '✅ Registrado' : '❌ No Registrado'}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

export default StatusBadge;
