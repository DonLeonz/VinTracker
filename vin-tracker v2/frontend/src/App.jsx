import { useState, useEffect, useCallback, lazy, Suspense, useMemo, useTransition } from 'react';
import DatabaseStatus from './components/DatabaseStatus';
import ScrollToTop from './components/ScrollToTop';
import Trash from './components/Trash';
import KeyboardHelp from './components/KeyboardHelp';
import { vinService } from './services/api';
import { showNotification } from './utils/helpers';
import { useRecordsCache } from './hooks/useRecordsCache';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

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
  const [showTrash, setShowTrash] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0);
  const [vinFocusTrigger, setVinFocusTrigger] = useState(0);

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

  // Load records on mount and when loadRecords changes (which happens when filters change)
  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

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
      // Pre-check using the same filters (including date) that the export will use
      const checkFilters = { registered: 'not_registered' };
      if (filters.date) checkFilters.date = filters.date;

      const data = await vinService.getRecords(checkFilters);

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
        const sufijo = filters.date ? ` para la fecha ${filters.date}` : '';
        if (type === 'all') {
          mensaje = `⚠️ No hay VINs sin registrar para exportar${sufijo}`;
        } else if (type === 'delivery') {
          mensaje = `⚠️ No hay VINs de Delivery sin registrar para exportar${sufijo}`;
        } else if (type === 'service') {
          mensaje = `⚠️ No hay VINs de Service sin registrar para exportar${sufijo}`;
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

  // Switch to a tab by index — uses UIkit.tab() to update both indicator and content
  const switchToTab = useCallback((index) => {
    if (showTrash) {
      setShowTrash(false);
      setPendingTab(index);
    } else {
      const tabEl = document.getElementById('app-main-tab');
      if (tabEl && window.UIkit) window.UIkit.tab(tabEl).show(index);
    }
  }, [showTrash]);

  // When returning from trash, apply any pending tab switch
  useEffect(() => {
    if (!showTrash && pendingTab !== null) {
      const timer = setTimeout(() => {
        const tabEl = document.getElementById('app-main-tab');
        if (tabEl && window.UIkit) window.UIkit.tab(tabEl).show(pendingTab);
        setPendingTab(null);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showTrash, pendingTab]);

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    { key: '1', alt: true, action: () => switchToTab(0) },
    { key: '2', alt: true, action: () => switchToTab(1) },
    { key: '3', alt: true, action: () => switchToTab(2) },
    { key: '4', alt: true, action: () => switchToTab(3) },
    { key: '5', alt: true, action: () => switchToTab(4) },
    { key: 't', alt: true, action: () => setShowTrash(prev => !prev) },
    { key: 'v', action: () => { switchToTab(0); setVinFocusTrigger(n => n + 1); } },
    { key: '/', action: () => { switchToTab(2); setSearchFocusTrigger(n => n + 1); } },
    { key: 'k', alt: true, action: () => setShowHelp(prev => !prev) },
  ]);

  // Show trash view
  if (showTrash) {
    return (
      <div className="main-container">
        <DatabaseStatus />
        <Trash onBack={() => setShowTrash(false)} />
        <ScrollToTop />
        {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
      </div>
    );
  }

  return (
    <div className="main-container">
      {/* Database Status Indicator */}
      <DatabaseStatus />

      {/* Título Principal */}
      <h1 className="app-title fade-in">
        🚗 VIN Tracker System
      </h1>

      {/* Botones superiores */}
      <div className="app-top-actions">
        <button
          className="uk-button uk-button-default kbd-trigger-btn"
          onClick={() => setShowHelp(true)}
          title="Atajos de teclado (?)"
        >
          ?
        </button>
        <button
          className="uk-button uk-button-default trash-btn"
          onClick={() => setShowTrash(true)}
          title="Abrir Papelera de Reciclaje"
        >
          <span uk-icon="icon: trash; ratio: 1.2"></span>
          Papelera
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="uk-card uk-card-default uk-card-body card-spacing-bottom">
        <ul id="app-main-tab" className="uk-tab" data-uk-tab="{connect:'#tab-content', animation: 'uk-animation-fade'}">
          <li className="uk-active">
            <a href="#">
              <span uk-icon="icon: plus-circle; ratio: 1.2" className="icon-spacing-sm icon-golden"></span>
              Agregar VINs
            </a>
          </li>
          <li>
            <a href="#">
              <span uk-icon="icon: cloud-upload; ratio: 1.2" className="icon-spacing-sm icon-golden"></span>
              Importar VINs
            </a>
          </li>
          <li>
            <a href="#">
              <span uk-icon="icon: search; ratio: 1.2" className="icon-spacing-sm icon-golden"></span>
              Ver Registros
            </a>
          </li>
          <li>
            <a href="#">
              <span uk-icon="icon: file-text; ratio: 1.2" className="icon-spacing-sm icon-golden"></span>
              Visualización
            </a>
          </li>
          <li>
            <a href="#">
              <span uk-icon="icon: check; ratio: 1.2" className="icon-spacing-sm icon-golden"></span>
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
              <VinInput onVinAdded={handleVinAdded} vinFocusTrigger={vinFocusTrigger} />
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
                onRefresh={handleVinAdded}
                searchFocusTrigger={searchFocusTrigger}
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

      {/* Keyboard help overlay */}
      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}

      {/* Inline styles */}
      <style>{`
        .app-top-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .trash-btn {
          background: var(--vin-dark-secondary) !important;
          color: var(--vin-light) !important;
          border: 2px solid var(--vin-golden) !important;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          padding: 10px 20px !important;
          transition: all 0.3s ease;
        }

        .trash-btn:hover {
          background: var(--vin-golden) !important;
          color: #000 !important;
          transform: translateY(-2px);
        }

        @media (max-width: 640px) {
          .app-top-actions {
            flex-wrap: wrap;
          }

          .trash-btn {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
