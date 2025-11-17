const StatusBadge = ({ isRegistered, onClick }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('StatusBadge clicked, isRegistered:', isRegistered);
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
};

export default StatusBadge;
