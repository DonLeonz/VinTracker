import { useState, useEffect, useCallback, memo } from 'react';

const Filters = ({ filters, onFilterChange, onClearFilters, onExport }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  // Sincronizar con props cuando cambien externamente
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleDateChange = useCallback((e) => {
    const newFilters = { ...localFilters, date: e.target.value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  }, [localFilters, onFilterChange]);

  const handleRegisteredChange = useCallback((e) => {
    const newFilters = { ...localFilters, registered: e.target.value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  }, [localFilters, onFilterChange]);

  const handleClear = useCallback(() => {
    setLocalFilters({ date: '', registered: 'all' });
    onClearFilters();
  }, [onClearFilters]);

  return (
    <div className="uk-card uk-card-default uk-card-body uk-margin-medium fade-in">
      <div className="uk-grid-small uk-flex-between" data-uk-grid>
        {/* Filters */}
        <div className="uk-width-expand@m">
          <div className="uk-grid-small" data-uk-grid>
            <div>
              <label className="uk-form-label">Filtrar por Fecha</label>
              <input
                type="date"
                className="uk-input"
                value={localFilters.date}
                onChange={handleDateChange}
              />
            </div>
            <div>
              <label className="uk-form-label">Filtrar por Estado</label>
              <select
                className="uk-select"
                value={localFilters.registered}
                onChange={handleRegisteredChange}
              >
                <option value="all">Todos</option>
                <option value="not_registered">❌ No Registrados</option>
                <option value="registered">✅ Registrados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="uk-width-auto@m">
          <label className="uk-form-label filters-label-spacer">Actions</label>
          <div className="uk-flex uk-flex-middle" data-uk-margin>
            <button
              className="uk-button uk-button-secondary uk-button-small"
              onClick={handleClear}
            >
              <span data-uk-icon="refresh"></span>
              <span className="uk-margin-small-left">Ver Todos</span>
            </button>
            <button
              className="uk-button uk-button-primary uk-button-small"
              onClick={() => onExport('all')}
            >
              <span data-uk-icon="download"></span>
              <span className="uk-margin-small-left">Exportar Sin Registrar</span>
            </button>
            <button
              className="uk-button uk-button-primary uk-button-small filters-export-delivery"
              onClick={() => onExport('delivery')}
            >
              <span data-uk-icon="download"></span>
              <span className="uk-margin-small-left">Export. Delivery</span>
            </button>
            <button
              className="uk-button uk-button-primary uk-button-small filters-export-service"
              onClick={() => onExport('service')}
            >
              <span data-uk-icon="download"></span>
              <span className="uk-margin-small-left">Export. Service</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(Filters);
