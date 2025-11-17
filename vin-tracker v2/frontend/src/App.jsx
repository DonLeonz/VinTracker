import { useState, useEffect } from 'react';
import VinInput from './components/VinInput';
import VinTable from './components/VinTable';
import Filters from './components/Filters';
import ScrollToTop from './components/ScrollToTop';
import { vinService } from './services/api';
import { showNotification } from './utils/helpers';

function App() {
  const [deliveryRecords, setDeliveryRecords] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [filters, setFilters] = useState({ date: '', registered: 'all' });
  const [isLoading, setIsLoading] = useState(false);

  // Load records
  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const data = await vinService.getRecords(filters);
      if (data.success) {
        setDeliveryRecords(data.delivery);
        setServiceRecords(data.service);
      }
    } catch (error) {
      showNotification('❌ Error al cargar registros', 'danger');
      console.error('Error loading records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load records on mount and filter change
  useEffect(() => {
    loadRecords();
  }, [filters]);

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({ date: '', registered: 'all' });
  };

  // Handle export
  const handleExport = async (type) => {
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
  };

  return (
    <div className="main-container">
      <h1 className="app-title fade-in">
        🚗 VIN Tracker System
      </h1>

      {/* VIN Input */}
      <VinInput onVinAdded={loadRecords} />

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
        isLoading={isLoading}
        onRecordsChange={loadRecords}
      />

      {/* Service Table */}
      <VinTable
        title="🔧 Service"
        type="service"
        records={serviceRecords}
        isLoading={isLoading}
        onRecordsChange={loadRecords}
      />

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}

export default App;
