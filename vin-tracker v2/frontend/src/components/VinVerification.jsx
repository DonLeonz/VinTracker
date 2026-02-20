import { useState, useEffect, useCallback, memo } from 'react';
import { vinService } from '../services/api';
import { showNotification } from '../utils/helpers';

const VinVerification = memo(() => {
  const [isLoading, setIsLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null);

  const loadVerificationData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await vinService.getVerification();
      if (data.success) {
        setVerificationData(data);
      }
    } catch (error) {
      showNotification('❌ Error al cargar verificación', 'danger');
      console.error('Error loading verification:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerificationData();
  }, [loadVerificationData]);

  if (isLoading) {
    return (
      <div className="uk-text-center uk-padding-large">
        <span data-uk-spinner="ratio: 2"></span>
        <p className="uk-margin-top">Verificando base de datos...</p>
      </div>
    );
  }

  if (!verificationData) {
    return null;
  }

  const {
    totalDelivery,
    totalService,
    duplicatesInDelivery,
    duplicatesInService,
    crossTableDuplicates,
    registeredDelivery,
    notRegisteredDelivery,
    registeredService,
    notRegisteredService
  } = verificationData;

  const hasIssues = duplicatesInDelivery.length > 0 || 
                    duplicatesInService.length > 0 || 
                    crossTableDuplicates.length > 0;

  return (
    <div className="verification-container fade-in">
      {/* Overall Status Card */}
      <div className={`uk-card uk-card-default uk-card-body verification-status-card ${hasIssues ? 'has-issues' : 'no-issues'}`}>
        <div className="verification-status-header">
          <span className="verification-status-icon">
            {hasIssues ? '⚠️' : '✅'}
          </span>
          <div>
            <h2 className="uk-card-title uk-margin-remove">
              {hasIssues ? 'Problemas Detectados' : 'Base de Datos Verificada'}
            </h2>
            <p className="uk-text-meta uk-margin-remove-top">
              {hasIssues 
                ? 'Se encontraron duplicados o inconsistencias'
                : 'No se encontraron problemas en la base de datos'}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="uk-grid-small uk-child-width-1-2@s uk-child-width-1-4@m uk-margin-medium" data-uk-grid>
        <div>
          <div className="verification-stat-card delivery">
            <div className="verification-stat-icon">📦</div>
            <div className="verification-stat-content">
              <div className="verification-stat-label">Total Delivery</div>
              <div className="verification-stat-value">{totalDelivery}</div>
            </div>
          </div>
        </div>
        <div>
          <div className="verification-stat-card service">
            <div className="verification-stat-icon">🔧</div>
            <div className="verification-stat-content">
              <div className="verification-stat-label">Total Service</div>
              <div className="verification-stat-value">{totalService}</div>
            </div>
          </div>
        </div>
        <div>
          <div className="verification-stat-card registered">
            <div className="verification-stat-icon icon-golden">✔</div>
            <div className="verification-stat-content">
              <div className="verification-stat-label">Registrados</div>
              <div className="verification-stat-value">{registeredDelivery + registeredService}</div>
            </div>
          </div>
        </div>
        <div>
          <div className="verification-stat-card not-registered">
            <div className="verification-stat-icon icon-golden">○</div>
            <div className="verification-stat-content">
              <div className="verification-stat-label">No Registrados</div>
              <div className="verification-stat-value">{notRegisteredDelivery + notRegisteredService}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues Section */}
      {hasIssues && (
        <div className="verification-issues-section">
          <ul data-uk-accordion="multiple: true">
            {/* Duplicates in Delivery */}
            {duplicatesInDelivery.length > 0 && (
              <li className="uk-card uk-card-default uk-margin">
                <a className="uk-accordion-title uk-card-header" href="#">
                  <span uk-icon="icon: warning; ratio: 1.2" className="icon-warning-red"></span>
                  <strong>Duplicados en Delivery ({duplicatesInDelivery.length})</strong>
                  <span className="uk-text-meta uk-margin-small-left">- Mismo VIN aparece múltiples veces</span>
                </a>
                <div className="uk-accordion-content uk-card-body">
                  <div className="verification-issues-list">
                    {duplicatesInDelivery.map((item, idx) => (
                      <div key={idx} className="verification-issue-item">
                        <div className="verification-issue-vin">{item.vin}</div>
                        <div className="verification-issue-details">
                          <span className="verification-issue-badge count">
                            Aparece {item.count} {item.count === 1 ? 'vez' : 'veces'}
                          </span>
                          <span className="verification-issue-info">
                            IDs: {item.ids.join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            )}

            {/* Duplicates in Service */}
            {duplicatesInService.length > 0 && (
              <li className="uk-card uk-card-default uk-margin">
                <a className="uk-accordion-title uk-card-header" href="#">
                  <span uk-icon="icon: warning; ratio: 1.2" className="icon-warning-red"></span>
                  <strong>Duplicados en Service ({duplicatesInService.length})</strong>
                  <span className="uk-text-meta uk-margin-small-left">- Mismo VIN aparece múltiples veces</span>
                </a>
                <div className="uk-accordion-content uk-card-body">
                  <div className="verification-issues-list">
                    {duplicatesInService.map((item, idx) => (
                      <div key={idx} className="verification-issue-item">
                        <div className="verification-issue-vin">{item.vin}</div>
                        <div className="verification-issue-details">
                          <span className="verification-issue-badge count">
                            Aparece {item.count} {item.count === 1 ? 'vez' : 'veces'}
                          </span>
                          <span className="verification-issue-info">
                            IDs: {item.ids.join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            )}

            {/* Cross-Table Duplicates */}
            {crossTableDuplicates.length > 0 && (
              <li className="uk-card uk-card-default uk-margin">
                <a className="uk-accordion-title uk-card-header" href="#">
                  <span uk-icon="icon: info; ratio: 1.2" className="icon-warning-orange"></span>
                  <strong>VINs en Ambas Tablas ({crossTableDuplicates.length})</strong>
                  <span className="uk-text-meta uk-margin-small-left">- VINs que existen en Delivery y Service</span>
                </a>
                <div className="uk-accordion-content uk-card-body">
                  <p className="uk-text-meta uk-margin-small-bottom">
                    Estos VINs pueden estar legítimamente en ambas tablas. Revisa las fechas y estados para confirmar.
                  </p>
                  <div className="verification-issues-list">
                    {crossTableDuplicates.map((item, idx) => (
                      <div key={idx} className="verification-issue-item cross-table">
                        <div className="verification-issue-vin">{item.vin}</div>
                        <div className="verification-issue-details">
                          <div className="verification-cross-info">
                            <div className="verification-cross-column">
                              <span className="verification-cross-label">📦 Delivery</span>
                              <span className="verification-issue-info">
                                ID: {item.delivery_id} | Creado: {new Date(item.delivery_created_at).toLocaleDateString()}
                              </span>
                              <span className={`verification-issue-badge ${item.delivery_registered ? 'registered' : 'not-registered'}`}>
                                {item.delivery_registered ? '✔ Registrado' : '○ No Registrado'}
                              </span>
                            </div>
                            <div className="verification-cross-column">
                              <span className="verification-cross-label">🔧 Service</span>
                              <span className="verification-issue-info">
                                ID: {item.service_id} | Creado: {new Date(item.service_created_at).toLocaleDateString()}
                              </span>
                              <span className={`verification-issue-badge ${item.service_registered ? 'registered' : 'not-registered'}`}>
                                {item.service_registered ? '✔ Registrado' : '○ No Registrado'}
                              </span>
                              {item.service_repeat_count > 0 && (
                                <span className="verification-issue-badge repeat">
                                  🔄 Repetido x{item.service_repeat_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Refresh Button */}
      <div className="uk-text-center uk-margin-top">
        <button
          className="uk-button uk-button-primary"
          onClick={loadVerificationData}
          disabled={isLoading}
        >
          <span uk-icon="icon: refresh; ratio: 1"></span>
          <span className="uk-margin-small-left">Verificar Nuevamente</span>
        </button>
      </div>
    </div>
  );
});

VinVerification.displayName = 'VinVerification';

export default VinVerification;
