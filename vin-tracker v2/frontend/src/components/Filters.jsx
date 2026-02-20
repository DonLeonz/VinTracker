import { useState, useEffect, useCallback, useRef, memo } from 'react';

const Filters = memo(({ filters, onFilterChange, onClearFilters, onExport, onRefresh, hideExportButtons = false }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchDebounceRef = useRef(null);

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

  const handleSearchChange = useCallback((e) => {
    const newFilters = { ...localFilters, search: e.target.value };
    // Update local state immediately so the input feels responsive
    setLocalFilters(newFilters);
    // Debounce the parent notification to avoid a DB query on every keystroke
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      onFilterChange(newFilters);
    }, 300);
  }, [localFilters, onFilterChange]);

  const handleClearSearch = useCallback(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const newFilters = { ...localFilters, search: '' };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  }, [localFilters, onFilterChange]);

  const handleRepeatedChange = useCallback((e) => {
    const newFilters = { ...localFilters, repeated: e.target.value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  }, [localFilters, onFilterChange]);

  const handleClear = useCallback(() => {
    setLocalFilters({ date: '', registered: 'all', search: '', repeated: 'all' });
    onClearFilters();
  }, [onClearFilters]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [onRefresh]);

  return (
    <div className="uk-card uk-card-default uk-card-body uk-margin-medium fade-in">
      <div className="uk-grid-small uk-flex-middle" data-uk-grid>
        {/* Filters Row 1 */}
        <div className="uk-width-1-4@m uk-width-1-2@s">
          <label className="uk-form-label">Filtrar por Fecha</label>
          <input
            type="date"
            className="uk-input"
            value={localFilters.date}
            onChange={handleDateChange}
          />
        </div>
        
        <div className="uk-width-1-4@m uk-width-1-2@s">
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

        <div className="uk-width-1-4@m uk-width-1-2@s">
          <label className="uk-form-label">Buscar VIN</label>
          <div className="vin-input-wrapper">
            <input
              type="text"
              className="uk-input vin-input-with-clear"
              placeholder="Buscar secuencia..."
              value={localFilters.search || ''}
              onChange={handleSearchChange}
            />
            {localFilters.search && (
              <button
                type="button"
                className="vin-clear-btn"
                onClick={handleClearSearch}
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="uk-width-1-4@m uk-width-1-2@s">
          <label className="uk-form-label">Filtrar Repetidos</label>
          <select
            className="uk-select"
            value={localFilters.repeated || 'all'}
            onChange={handleRepeatedChange}
          >
            <option value="all">Todos</option>
            <option value="repeated">🔄 Solo Repetidos</option>
            <option value="not_repeated">○ Sin Repetir</option>
          </select>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="uk-margin-top uk-text-right">
        <div className="uk-flex uk-flex-middle uk-flex-right uk-flex-wrap" data-uk-margin>
          {onRefresh && (
            <button
              className="uk-button uk-button-secondary uk-button-small"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Actualizar registros"
            >
              <span uk-icon="icon: refresh; ratio: 0.9"></span>
              <span className="uk-margin-small-left">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          )}
          <button
            className="uk-button uk-button-secondary uk-button-small"
            onClick={handleClear}
          >
            <span data-uk-icon="refresh"></span>
            <span className="uk-margin-small-left">Ver Todos</span>
          </button>
          {!hideExportButtons && onExport && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
});

Filters.displayName = 'Filters';

export default Filters;
