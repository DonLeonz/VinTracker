import { memo } from 'react';

const VinBadge = ({ vin, type }) => {
  return (
    <span className={`vin-badge ${type}`}>
      {vin}
    </span>
  );
};

export default memo(VinBadge);
