import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { vinService } from '../services/api';
import { showNotification } from '../utils/helpers';

const VinPreview = memo(({ filters, refreshTrigger }) => {
  const [previewContent, setPreviewContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ delivery: 0, service: 0, total: 0 });
  const loadTimeoutRef = useRef(null);

  // Load preview content with debouncing
  const loadPreviewContent = useCallback(async () => {
    // Clear previous timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }

    // Debounce: wait 300ms before loading
    loadTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await vinService.getRecords({ ...filters, registered: 'not_registered' });
      
        if (data.success) {
          let content = '';
          let deliveryCount = 0;
          let serviceCount = 0;

          // Format delivery records
          if (data.delivery && data.delivery.length > 0) {
            content += 'Deliverys\n';
            data.delivery.forEach(record => {
              let line = record.vin;
              if (record.repeat_count > 0) {
                const dateToShow = record.last_registered_at || record.created_at;
                const formattedDate = new Date(dateToShow).toLocaleString('es-ES');
                line += ` - Último registro: ${formattedDate}`;
              }
              content += line + '\n';
            });
            content += '\n';
            deliveryCount = data.delivery.length;
          }

          // Format service records
          if (data.service && data.service.length > 0) {
            content += 'Services\n';
            data.service.forEach(record => {
              let line = record.vin;
              if (record.repeat_count > 0) {
                const dateToShow = record.last_registered_at || record.created_at;
                const formattedDate = new Date(dateToShow).toLocaleString('es-ES');
                line += ` - Último registro: ${formattedDate}`;
              }
              content += line + '\n';
            });
            serviceCount = data.service.length;
          }

          if (content === '') {
            content = 'No hay VINs sin registrar para mostrar.';
          }

          setPreviewContent(content);
          setStats({
            delivery: deliveryCount,
            service: serviceCount,
            total: deliveryCount + serviceCount
          });
        }
      } catch (error) {
        showNotification('❌ Error al cargar vista previa', 'danger');
        console.error('Error loading preview:', error);
        setPreviewContent('Error al cargar los datos.');
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce delay
  }, [filters]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Load on mount, filter change, and when refreshTrigger changes
  useEffect(() => {
    loadPreviewContent();
  }, [loadPreviewContent, refreshTrigger]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!previewContent || previewContent === 'No hay VINs sin registrar para mostrar.') {
      showNotification('⚠️ No hay contenido para copiar', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(previewContent);
      showNotification('✅ Contenido copiado al portapapeles', 'success');
    } catch (error) {
      showNotification('❌ Error al copiar al portapapeles', 'danger');
      console.error('Error copying:', error);
    }
  }, [previewContent]);

  return (
    <div className="uk-card uk-card-default uk-card-body fade-in preview-main-card">
      <div className="uk-flex uk-flex-between uk-flex-middle uk-margin-medium-bottom">
        <h3 className="uk-card-title uk-margin-remove">
          <span uk-icon="icon: file-text; ratio: 1.3" className="icon-spacing-md"></span>
          Vista Previa - VINs No Registrados
        </h3>
        <button
          className="uk-button uk-button-primary uk-button-small"
          onClick={handleCopy}
          disabled={isLoading || !previewContent || previewContent === 'No hay VINs sin registrar para mostrar.'}
        >
          <span uk-icon="icon: copy; ratio: 0.9"></span>
          <span className="uk-margin-small-left">Copiar</span>
        </button>
      </div>

      {/* Stats */}
      <div className="uk-grid-small uk-child-width-1-3@s uk-margin-medium-bottom" data-uk-grid>
        <div>
          <div className="preview-stat-card">
            <span className="preview-stat-icon">📦</span>
            <div>
              <div className="preview-stat-label">Delivery</div>
              <div className="preview-stat-value">{stats.delivery}</div>
            </div>
          </div>
        </div>
        <div>
          <div className="preview-stat-card">
            <span className="preview-stat-icon">🔧</span>
            <div>
              <div className="preview-stat-label">Service</div>
              <div className="preview-stat-value">{stats.service}</div>
            </div>
          </div>
        </div>
        <div>
          <div className="preview-stat-card">
            <span className="preview-stat-icon">📊</span>
            <div>
              <div className="preview-stat-label">Total</div>
              <div className="preview-stat-value">{stats.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="preview-container">
        {isLoading ? (
          <div className="uk-text-center uk-padding-large">
            <span data-uk-spinner="ratio: 2"></span>
            <p className="uk-margin-top">Cargando vista previa...</p>
          </div>
        ) : (
          <pre className="preview-content">{previewContent}</pre>
        )}
      </div>

      {/* Reload button */}
      <div className="uk-margin-top uk-text-center">
        <button
          className="uk-button uk-button-secondary uk-button-small"
          onClick={loadPreviewContent}
          disabled={isLoading}
        >
          <span uk-icon="icon: refresh; ratio: 0.9"></span>
          <span className="uk-margin-small-left">Actualizar</span>
        </button>
      </div>
    </div>
  );
});

VinPreview.displayName = 'VinPreview';

export default VinPreview;
