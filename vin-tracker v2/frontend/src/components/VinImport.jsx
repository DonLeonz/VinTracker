import { useState, useCallback, memo, useRef } from 'react';
import { processVin, validateVinLength, showNotification } from '../utils/helpers';
import { vinService } from '../services/api';

const VinImport = memo(({ onImportCompleted }) => {
  const [type, setType] = useState('delivery');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Process file content and categorize VINs
  const processFileContent = useCallback(async (content, selectedType) => {
    setIsProcessing(true);
    
    try {
      // Split by lines and clean
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const results = {
        toAdd: [],
        omitted: [],
        errors: [],
        duplicatesInFile: []
      };

      const seenInFile = new Set();

      // Check database connection
      const connectionStatus = await vinService.checkConnection();
      if (!connectionStatus.isConnected) {
        showNotification('❌ No se puede procesar: La base de datos está desconectada', 'danger');
        setIsProcessing(false);
        return null;
      }

      // Process each VIN
      for (let i = 0; i < lines.length; i++) {
        const rawVin = lines[i];
        const processedVin = processVin(rawVin);
        const lineNumber = i + 1;

        // Validate length
        if (!validateVinLength(rawVin)) {
          results.errors.push({
            vin: rawVin,
            processed: processedVin,
            reason: `Longitud inválida (${processedVin.length} caracteres, se requieren 17)`,
            line: lineNumber
          });
          continue;
        }

        // Check for duplicates in file
        if (seenInFile.has(processedVin)) {
          results.duplicatesInFile.push({
            vin: processedVin,
            reason: 'Duplicado en el archivo',
            line: lineNumber
          });
          continue;
        }
        seenInFile.add(processedVin);

        // Check if exists in database (read-only, does NOT insert)
        try {
          const checkResult = await vinService.checkVin(processedVin, selectedType);

          if (!checkResult.exists) {
            // VIN doesn't exist, can be added on confirm
            results.toAdd.push({
              vin: processedVin,
              line: lineNumber,
              isNew: true
            });
          } else if (checkResult.is_not_registered) {
            // Exists but not registered - OMIT
            results.omitted.push({
              vin: processedVin,
              reason: 'Ya existe en BD pero no está registrado',
              line: lineNumber,
              existingId: checkResult.existing_id
            });
          } else {
            // Exists and is registered
            if (selectedType === 'delivery') {
              // DELIVERY: never repeat - OMIT
              results.omitted.push({
                vin: processedVin,
                reason: 'Ya existe y está registrado (Delivery no se repite)',
                line: lineNumber,
                existingId: checkResult.existing_id,
                repeatCount: checkResult.repeat_count
              });
            } else {
              // SERVICE: can be added as repeated on confirm
              results.toAdd.push({
                vin: processedVin,
                line: lineNumber,
                isNew: false,
                isRepeated: true,
                existingId: checkResult.existing_id,
                repeatCount: checkResult.repeat_count
              });
            }
          }
        } catch (error) {
          results.errors.push({
            vin: processedVin,
            reason: `Error al verificar: ${error.message}`,
            line: lineNumber
          });
        }
      }

      setIsProcessing(false);
      return results;
    } catch (error) {
      console.error('Error processing file:', error);
      showNotification('❌ Error al procesar archivo', 'danger');
      setIsProcessing(false);
      return null;
    }
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.txt')) {
      showNotification('⚠️ Por favor seleccione un archivo .txt', 'warning');
      return;
    }

    setFileName(file.name);

    // Read file content
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      setFileContent(content);

      // Process and generate preview
      const results = await processFileContent(content, type);
      if (results) {
        setPreview(results);
      }
    };
    reader.readAsText(file);
  }, [type, processFileContent]);

  // Clear file
  const handleClearFile = useCallback(() => {
    setFileContent('');
    setFileName('');
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle type change - clear file to avoid importing to wrong table
  const handleTypeChange = useCallback((e) => {
    const newType = e.target.value;
    
    // If file is loaded, warn user and clear it
    if (fileContent) {
      showNotification('⚠️ Tipo cambiado. Por favor, vuelve a cargar el archivo.', 'warning');
      handleClearFile();
    }
    
    setType(newType);
  }, [fileContent, handleClearFile]);

  // Execute import
  const executeImport = useCallback(async () => {
    if (!preview || preview.toAdd.length === 0) {
      showNotification('⚠️ No hay VINs para importar', 'warning');
      return;
    }

    setIsImporting(true);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      for (const item of preview.toAdd) {
        try {
          if (item.isRepeated) {
            // Exists and registered in Service: increment repeat counter
            const result = await vinService.addRepeatedVin(item.vin, type);
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              errors.push({ vin: item.vin, error: result.message });
            }
          } else {
            // New VIN: insert now (first time writing to DB)
            const result = await vinService.addVin(item.vin, type);
            if (result.success) {
              successCount++;
            } else {
              errorCount++;
              errors.push({ vin: item.vin, error: result.message });
            }
          }
        } catch (error) {
          errorCount++;
          errors.push({ vin: item.vin, error: error.message });
        }
      }

      // Show results
      if (errorCount === 0) {
        showNotification(`✅ Importación exitosa: ${successCount} VINs agregados`, 'success');
      } else {
        showNotification(`⚠️ Importación completada con errores: ${successCount} éxitos, ${errorCount} errores`, 'warning');
        console.error('Import errors:', errors);
      }

      // Clear and notify parent
      handleClearFile();
      onImportCompleted && onImportCompleted();
    } catch (error) {
      showNotification('❌ Error durante la importación', 'danger');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  }, [preview, type, handleClearFile, onImportCompleted]);

  return (
    <>
      <div className="uk-card uk-card-default uk-card-body fade-in import-main-card">
        <h3 className="uk-card-title">
          <span uk-icon="icon: cloud-upload; ratio: 1.3" className="icon-spacing-md"></span>
          Importar VINs desde Archivo
        </h3>

        {/* File Input and Type Selection */}
        <div className="uk-grid-small uk-margin-medium" data-uk-grid>
          <div className="uk-width-1-2@m">
            <label className="uk-form-label">Seleccionar Archivo .txt</label>
            <div className="uk-form-controls">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="import-file-input-hidden"
                disabled={isProcessing || isImporting}
              />
              <button
                type="button"
                className="uk-button uk-button-secondary import-file-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing || isImporting}
              >
                <span uk-icon="icon: upload; ratio: 1"></span>
                <span className="uk-margin-small-left">
                  {fileName ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                </span>
              </button>
              {fileName && (
                <div className="import-filename">
                  📄 {fileName}
                  <button
                    type="button"
                    className="import-clear-btn"
                    onClick={handleClearFile}
                    disabled={isProcessing || isImporting}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="uk-width-1-2@m">
            <label className="uk-form-label">Tipo de Importación</label>
            <select
              className="uk-select"
              value={type}
              onChange={handleTypeChange}
              disabled={isProcessing || isImporting}
            >
              <option value="delivery">📦 Delivery</option>
              <option value="service">🔧 Service</option>
            </select>
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="uk-text-center uk-padding">
            <span data-uk-spinner="ratio: 2"></span>
            <p className="uk-margin-top">Procesando archivo...</p>
          </div>
        )}

        {/* Preview Results */}
        {preview && !isProcessing && (
          <div className="import-preview-section">
            {/* Stats */}
            <div className="uk-grid-small uk-child-width-1-4@m uk-margin-medium-bottom" data-uk-grid>
              <div>
                <div className="import-stat-card success">
                  <span className="import-stat-icon">✅</span>
                  <div>
                    <div className="import-stat-label">Para Agregar</div>
                    <div className="import-stat-value">{preview.toAdd.length}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="import-stat-card warning">
                  <span className="import-stat-icon">⚠️</span>
                  <div>
                    <div className="import-stat-label">Omitidos</div>
                    <div className="import-stat-value">{preview.omitted.length}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="import-stat-card error">
                  <span className="import-stat-icon">❌</span>
                  <div>
                    <div className="import-stat-label">Errores</div>
                    <div className="import-stat-value">{preview.errors.length}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="import-stat-card info">
                  <span className="import-stat-icon">🔄</span>
                  <div>
                    <div className="import-stat-label">Duplicados Archivo</div>
                    <div className="import-stat-value">{preview.duplicatesInFile.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* VINs to Add */}
            {preview.toAdd.length > 0 && (
              <div className="import-category success">
                <h4>✅ VINs para Agregar ({preview.toAdd.length})</h4>
                <div className="import-list">
                  {preview.toAdd.map((item, idx) => (
                    <div key={idx} className="import-item">
                      <span className="import-item-vin">{item.vin}</span>
                      <span className="import-item-line">Línea {item.line}</span>
                      {item.isRepeated && (
                        <span className="import-item-badge repeated">
                          🔄 Repetido (x{item.repeatCount + 1})
                        </span>
                      )}
                      {item.isNew && (
                        <span className="import-item-badge new">✨ Nuevo</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Omitted VINs */}
            {preview.omitted.length > 0 && (
              <div className="import-category warning">
                <h4>⚠️ VINs Omitidos ({preview.omitted.length})</h4>
                <div className="import-list">
                  {preview.omitted.map((item, idx) => (
                    <div key={idx} className="import-item">
                      <span className="import-item-vin">{item.vin}</span>
                      <span className="import-item-line">Línea {item.line}</span>
                      <span className="import-item-reason">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate VINs in File */}
            {preview.duplicatesInFile.length > 0 && (
              <div className="import-category info">
                <h4>🔄 VINs Duplicados en Archivo ({preview.duplicatesInFile.length})</h4>
                <div className="import-list">
                  {preview.duplicatesInFile.map((item, idx) => (
                    <div key={idx} className="import-item">
                      <span className="import-item-vin">{item.vin}</span>
                      <span className="import-item-line">Línea {item.line}</span>
                      <span className="import-item-reason">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error VINs */}
            {preview.errors.length > 0 && (
              <div className="import-category error">
                <h4>❌ VINs con Errores ({preview.errors.length})</h4>
                <div className="import-list">
                  {preview.errors.map((item, idx) => (
                    <div key={idx} className="import-item">
                      <span className="import-item-vin">{item.vin || item.processed}</span>
                      <span className="import-item-line">Línea {item.line}</span>
                      <span className="import-item-reason error">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="uk-margin-top uk-text-center">
              <button
                className="uk-button uk-button-primary uk-margin-small-right"
                onClick={executeImport}
                disabled={isImporting || preview.toAdd.length === 0}
              >
                {isImporting ? (
                  <>
                    <span data-uk-spinner="ratio: 0.6"></span>
                    <span className="uk-margin-small-left">Importando...</span>
                  </>
                ) : (
                  <>
                    <span uk-icon="check"></span>
                    <span className="uk-margin-small-left">Confirmar Importación</span>
                  </>
                )}
              </button>
              <button
                className="uk-button uk-button-secondary"
                onClick={handleClearFile}
                disabled={isImporting}
              >
                <span uk-icon="close"></span>
                <span className="uk-margin-small-left">Cancelar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

VinImport.displayName = 'VinImport';

export default VinImport;