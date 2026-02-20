import { memo } from 'react';
import CountBadge from '../ui/CountBadge';

const TableHeader = ({ 
  title, 
  count, 
  isCollapsed, 
  onToggle, 
  onRegisterAll, 
  onUnregisterAll,
  onDeleteAll 
}) => {
  return (
    <div className="table-header-wrapper">
      <div className="table-header-top">
        <div className="table-header-left">
          <div className="dropdown-header" onClick={onToggle}>
            <span className={`dropdown-icon ${isCollapsed ? 'collapsed' : ''}`}>
              {isCollapsed ? '▶' : '▼'}
            </span>
            <h2 className="uk-card-title uk-margin-remove">
              {title} <CountBadge count={count} />
            </h2>
          </div>
        </div>

        <div className="table-header-actions">
          <button
            className="uk-button uk-button-secondary uk-button-small"
            onClick={onRegisterAll}
          >
            <span data-uk-icon="check"></span>
            <span className="uk-margin-small-left">Registrar Todos</span>
          </button>
          <button
            className="uk-button uk-button-danger uk-button-small"
            onClick={onUnregisterAll}
          >
            <span data-uk-icon="close"></span>
            <span className="uk-margin-small-left">Desregistrar Todos</span>
          </button>
          <button
            className="uk-button uk-button-danger uk-button-small"
            onClick={onDeleteAll}
          >
            <span data-uk-icon="trash"></span>
            <span className="uk-margin-small-left">Eliminar Todos</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(TableHeader);
