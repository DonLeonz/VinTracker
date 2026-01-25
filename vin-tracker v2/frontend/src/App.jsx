import { useState, useEffect, useCallback, lazy, Suspense, useMemo, useTransition } from 'react';
import DatabaseStatus from './components/DatabaseStatus';
import ScrollToTop from './components/ScrollToTop';
import { vinService } from './services/api';
import { showNotification } from './utils/helpers';
import { useRecordsCache } from './hooks/useRecordsCache';

// Lazy load components for better initial load performance
const VinInput = lazy(() => import('./components/VinInput'));
const VinImport = lazy(() => import('./components/VinImport'));
const Filters = lazy(() => import('./components/Filters'));
const VinTable = lazy(() => import('./components/VinTable'));
const VinPreview = lazy(() => import('./components/VinPreview'));
const VinVerification = lazy(() => import('./components/VinVerification'));

function App() {
  const [deliveryRecords, setDeliveryRecords] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [filters, setFilters] = useState({ date: '', registered: 'all', search: '', repeated: 'all' });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isPending, startTransition] = useTransition();
  
  // Use cache hook
  const { getCached, setCache, clearCache, generateKey } = useRecordsCache();

  // Memoize records counts for better performance
  const recordsStats = useMemo(() => ({
    deliveryCount: deliveryRecords.length,
    serviceCount: serviceRecords.length,
    totalCount: deliveryRecords.length + serviceRecords.length
  }), [deliveryRecords.length, serviceRecords.length]);

  // Load records with caching
  const loadRecords = useCallback(async (bypassCache = false) => {
    const cacheKey = generateKey(filters);
    
    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cachedData = getCached(cacheKey);
      if (cachedData) {
        startTransition(() => {
          setDeliveryRecords(cachedData.delivery);
          setServiceRecords(cachedData.service);
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      const data = await vinService.getRecords(filters);
      if (data.success) {
        // Cache the result
        setCache(cacheKey, data);
        
        // Use transition for non-urgent state updates
        startTransition(() => {
          setDeliveryRecords(data.delivery);
          setServiceRecords(data.service);
          setRefreshTrigger(prev => prev + 1);
        });
      }
    } catch (error) {
      showNotification('❌ Error al cargar registros', 'danger');
      console.error('Error loading records:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, startTransition, getCached, setCache, generateKey]);

  // Load records on mount and filter change
  useEffect(() => {
    loadRecords();
  }, [filters]);

  // Handle VIN added - clear cache and reload
  const handleVinAdded = useCallback(() => {
    clearCache(); // Clear cache when new VIN is added
    loadRecords(true); // Bypass cache
  }, [clearCache, loadRecords]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Clear filters and cache
  const handleClearFilters = useCallback(() => {
    setFilters({ date: '', registered: 'all', search: '', repeated: 'all' });
    clearCache(); // Clear cache when filters are cleared
  }, [clearCache]);

  // Handle export
  const handleExport = useCallback(async (type) => {
    try {
      // Check if there are records to export
      const data = await vinService.getRecords({ registered: 'not_registered' });

      let count = 0;
      if (type === 'all') {
        count = data.delivery.length + data.service.length;
      } else if (type === 'delivery') {
        count = data.delivery.length;
      } else if (type === 'service') {
        count = data.service.length;
      }

      if (count === 0) {
        let mensaje = '';
        if (type === 'all') {
          mensaje = '⚠️ No hay VINs sin registrar para exportar';
        } else if (type === 'delivery') {
          mensaje = '⚠️ No hay VINs de Delivery sin registrar para exportar';
        } else if (type === 'service') {
          mensaje = '⚠️ No hay VINs de Service sin registrar para exportar';
        }
        showNotification(mensaje, 'warning');
        return;
      }

      // Export
      const result = await vinService.exportData(type, filters.date);
      if (result.success) {
        showNotification('✅ ' + result.message, 'success');
      }
    } catch (error) {
      showNotification('❌ Error al exportar datos', 'danger');
      console.error('Error exporting:', error);
    }
  }, [filters.date]);

  return (
    <div className="main-container">
      {/* Database Status Indicator */}
      <DatabaseStatus />

      <h1 className="app-title fade-in">
        🚗 VIN Tracker System
      </h1>

      {/* Tabs Navigation */}
      <div className="uk-card uk-card-default uk-card-body" style={{ marginBottom: '30px' }}>
        <ul className="uk-tab" data-uk-tab="{connect:'#tab-content', animation: 'uk-animation-fade'}">
          <li className="uk-active">
            <a href="#">
              <span uk-icon="icon: plus-circle; ratio: 1.2" style={{ marginRight: '8px' }}></span>
              Agregar VINs
            </a>
          </li>
          <li>
            <a href="#">
              <span uk-icon="icon: cloud-upload; ratio: 1.2" style={{ marginRight: '8px' }}></span>
              Importar VINs
            </a>
          </li>
          <li>
            <a href="#">
              <span uk-icon="icon: search; ratio: 1.2" style={{ marginRight: '8px' }}></span>
              Ver Registros
            </a>
          </li>
          <li>
            <a href="#">
              <span uk-icon="icon: file-text; ratio: 1.2" style={{ marginRight: '8px' }}></span>
              Visualización
            </a>
          </li>
          <li>
            <a href="#">
              <span uk-icon="icon: check; ratio: 1.2" style={{ marginRight: '8px' }}></span>
              Verificación
            </a>
          </li>
        </ul>

        <Suspense fallback={
          <div className="uk-text-center uk-padding-large">
            <span data-uk-spinner="ratio: 2"></span>
            <p className="uk-margin-top">Cargando componente...</p>
          </div>
        }>
          <ul id="tab-content" className="uk-switcher">
            {/* Tab 1: Agregar VINs */}
            <li>
              <VinInput onVinAdded={handleVinAdded} />
            </li>

            {/* Tab 2: Importar VINs */}
            <li>
              <VinImport onImportCompleted={handleVinAdded} />
            </li>

            {/* Tab 3: Ver Registros */}
            <li>
              {/* Filters and Export */}
              <Filters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                onExport={handleExport}
              />

              {/* Delivery Table */}
              <VinTable
                title="📦 Delivery"
                type="delivery"
                records={deliveryRecords}
                isLoading={isLoading || isPending}
                onRecordsChange={handleVinAdded}
                filters={filters}
              />

              {/* Se4vice Table */}
              <VinTable
                title="🔧 Service"
                type="service"
                records={serviceRecords}
                isLoading={isLoading || isPending}
                onRecordsChange={handleVinAdded}
                filters={filters}
              />
            </li>

            {/* Tab 4: Visualización */}
            <li>
              <VinPreview filters={filters} refreshTrigger={refreshTrigger} />
            </li>

            {/* Tab 5: Verificación */}
            <li>
              <VinVerification />
            </li>
          </ul>
        </Suspense>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}

export default App;
