import { useState, useCallback, memo, useRef, useMemo } from 'react';
import { processVin, validateVinLength, showNotification } from '../utils/helpers';
import { vinService } from '../services/api';

// --- Helpers para parsear el formato exportado ---

const DELIVERY_HEADERS = ['deliverys', 'deliveries', 'delivery'];
const SERVICE_HEADERS = ['services', 'service'];

// Extrae solo el VIN de una línea, ignorando " - Último registro: ..."
const extractVinFromLine = (line) => {
  const idx = line.indexOf(' - Último registro:');
  return idx !== -1 ? line.substring(0, idx).trim() : line.trim();
};

// Detecta si el texto tiene encabezados de sección (Deliverys / Services)
const textHasHeaders = (text) =>
  text.split('\n').some(line => {
    const l = line.trim().toLowerCase();
    return DELIVERY_HEADERS.includes(l) || SERVICE_HEADERS.includes(l);
  });

// Separa el texto en { delivery: string[], service: string[] }
const parseSections = (text) => {
  const sections = { delivery: [], service: [] };
  let current = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (DELIVERY_HEADERS.includes(lower)) { current = 'delivery'; continue; }
    if (SERVICE_HEADERS.includes(lower)) { current = 'service'; continue; }
    if (current) sections[current].push(extractVinFromLine(line));
  }
  return sections;
};

// ---

const VinImport = memo(({ onImportCompleted }) => {
  const [inputMode, setInputMode] = useState('file'); // 'file' | 'text'
  const [type, setType] = useState('delivery');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [textInput, setTextInput] = useState('');
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // ¿El texto pegado tiene secciones Deliverys/Services?
  const hasSectionsInText = useMemo(
    () => inputMode === 'text' && textInput.trim() ? textHasHeaders(textInput) : false,
    [inputMode, textInput]
  );

  // Verifica conexión a la BD antes de procesar
  const verifyConnection = useCallback(async () => {
    const status = await vinService.checkConnection();
    if (!status.isConnected) {
      showNotification('❌ No se puede procesar: La base de datos está desconectada', 'danger');
      return false;
    }
    return true;
  }, []);

  // Procesa una lista de strings de VINs contra la BD (solo lectura)
  const processVinList = useCallback(async (rawLines, selectedType) => {
    const results = { toAdd: [], omitted: [], errors: [], duplicatesInFile: [] };
    const seen = new Set();

    for (let i = 0; i < rawLines.length; i++) {
      const raw = rawLines[i];
      if (!raw) continue;
      const vin = processVin(raw);
      const pos = i + 1;

      if (!validateVinLength(raw)) {
        results.errors.push({
          vin: raw,
          processed: vin,
          reason: `Longitud inválida (${vin.length} caracteres, se requieren 17)`,
          line: pos
        });
        continue;
      }

      if (seen.has(vin)) {
        results.duplicatesInFile.push({ vin, reason: 'Duplicado en el texto', line: pos });
        continue;
      }
      seen.add(vin);

      try {
        const check = await vinService.checkVin(vin, selectedType);
        if (!check.exists) {
          results.toAdd.push({ vin, line: pos, isNew: true });
        } else if (check.is_not_registered) {
          results.omitted.push({
            vin,
            reason: 'Ya existe pero no está registrado',
            line: pos,
            existingId: check.existing_id
          });
        } else if (selectedType === 'delivery') {
          results.omitted.push({
            vin,
            reason: 'Ya existe y está registrado (Delivery no se repite)',
            line: pos,
            existingId: check.existing_id,
            repeatCount: check.repeat_count
          });
        } else {
          results.toAdd.push({
            vin,
            line: pos,
            isNew: false,
            isRepeated: true,
            existingId: check.existing_id,
            repeatCount: check.repeat_count
          });
        }
      } catch (err) {
        results.errors.push({ vin, reason: `Error al verificar: ${err.message}`, line: pos });
      }
    }
    return results;
  }, []);

  // MODO ARCHIVO: selección de archivo .txt
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      showNotification('⚠️ Por favor seleccione un archivo .txt', 'warning');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target.result;
      setFileContent(content);
      setIsProcessing(true);
      try {
        if (!await verifyConnection()) return;
        const lines = content.split('\n').map(extractVinFromLine).filter(Boolean);
        const results = await processVinList(lines, type);
        setPreview({ hasSections: false, ...results });
      } catch (err) {
        showNotification('❌ Error al procesar archivo', 'danger');
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsText(file);
  }, [type, processVinList, verifyConnection]);

  // MODO TEXTO: procesar el textarea
  const handleTextProcess = useCallback(async () => {
    if (!textInput.trim()) {
      showNotification('⚠️ El campo de texto está vacío', 'warning');
      return;
    }
    setIsProcessing(true);
    try {
      if (!await verifyConnection()) return;

      if (hasSectionsInText) {
        // Tiene secciones Deliverys/Services: procesa cada una a su tabla
        const { delivery, service } = parseSections(textInput);
        const [dResults, sResults] = await Promise.all([
          processVinList(delivery, 'delivery'),
          processVinList(service, 'service'),
        ]);
        setPreview({ hasSections: true, delivery: dResults, service: sResults });
      } else {
        // Sin secciones: usa el tipo seleccionado
        const lines = textInput.split('\n').map(extractVinFromLine).filter(Boolean);
        const results = await processVinList(lines, type);
        setPreview({ hasSections: false, ...results });
      }
    } catch (err) {
      showNotification('❌ Error al procesar el texto', 'danger');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, type, hasSectionsInText, processVinList, verifyConnection]);

  const handleClear = useCallback(() => {
    setFileContent('');
    setFileName('');
    setTextInput('');
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleTypeChange = useCallback((e) => {
    const newType = e.target.value;
    if (fileContent || textInput) {
      showNotification('⚠️ Tipo cambiado. Por favor, vuelve a procesar.', 'warning');
      handleClear();
    }
    setType(newType);
  }, [fileContent, textInput, handleClear]);

  const handleModeChange = useCallback((mode) => {
    setInputMode(mode);
    handleClear();
  }, [handleClear]);

  // Ejecuta la importación confirmada
  const executeImport = useCallback(async () => {
    if (!preview) return;

    const totalToAdd = preview.hasSections
      ? preview.delivery.toAdd.length + preview.service.toAdd.length
      : preview.toAdd.length;

    if (totalToAdd === 0) {
      showNotification('⚠️ No hay VINs para importar', 'warning');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const items = preview.hasSections
        ? [
            ...preview.delivery.toAdd.map(i => ({ ...i, importType: 'delivery' })),
            ...preview.service.toAdd.map(i => ({ ...i, importType: 'service' })),
          ]
        : preview.toAdd.map(i => ({ ...i, importType: type }));

      for (const item of items) {
        try {
          const result = item.isRepeated
            ? await vinService.addRepeatedVin(item.vin, item.importType)
            : await vinService.addVin(item.vin, item.importType);
          if (result.success) successCount++;
          else errorCount++;
        } catch {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        showNotification(`✅ Importación exitosa: ${successCount} VINs agregados`, 'success');
      } else {
        showNotification(`⚠️ Importación completada: ${successCount} éxitos, ${errorCount} errores`, 'warning');
      }

      handleClear();
      onImportCompleted?.();
    } catch (err) {
      showNotification('❌ Error durante la importación', 'danger');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  }, [preview, type, handleClear, onImportCompleted]);

  // Totales combinados para los stat cards
  const stats = useMemo(() => {
    if (!preview) return null;
    if (preview.hasSections) {
      const d = preview.delivery, s = preview.service;
      return {
        toAdd: d.toAdd.length + s.toAdd.length,
        omitted: d.omitted.length + s.omitted.length,
        errors: d.errors.length + s.errors.length,
        duplicatesInFile: d.duplicatesInFile.length + s.duplicatesInFile.length,
      };
    }
    return {
      toAdd: preview.toAdd.length,
      omitted: preview.omitted.length,
      errors: preview.errors.length,
      duplicatesInFile: preview.duplicatesInFile.length,
    };
  }, [preview]);

  // Renderiza una categoría del preview (para agregar / omitidos / etc.)
  const renderCategory = (items, categoryClass, label) => {
    if (!items || items.length === 0) return null;
    return (
      <div className={`import-category ${categoryClass}`}>
        <h4>{label} ({items.length})</h4>
        <div className="import-list">
          {items.map((item, idx) => (
            <div key={idx} className="import-item">
              <span className="import-item-vin">{item.vin || item.processed}</span>
              <span className="import-item-line">#{item.line}</span>
              {item.isRepeated && (
                <span className="import-item-badge repeated">🔄 Repetido (x{item.repeatCount + 1})</span>
              )}
              {item.isNew && (
                <span className="import-item-badge new">✨ Nuevo</span>
              )}
              {item.reason && (
                <span className={`import-item-reason${categoryClass === 'error' ? ' error' : ''}`}>
                  {item.reason}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderResults = (results) => (
    <>
      {renderCategory(results.toAdd, 'success', '✅ VINs para Agregar')}
      {renderCategory(results.omitted, 'warning', '⚠️ VINs Omitidos')}
      {renderCategory(results.duplicatesInFile, 'info', '🔄 Duplicados en Texto')}
      {renderCategory(results.errors, 'error', '❌ VINs con Errores')}
    </>
  );

  return (
    <>
      <div className="uk-card uk-card-default uk-card-body fade-in import-main-card">
        <h3 className="uk-card-title">
          <span uk-icon="icon: cloud-upload; ratio: 1.3" className="icon-spacing-md"></span>
          Importar VINs
        </h3>

        {/* Tabs: Archivo .txt / Texto directo */}
        <ul className="uk-tab">
          <li className={inputMode === 'file' ? 'uk-active' : ''}>
            <a onClick={() => handleModeChange('file')}>
              <span uk-icon="icon: upload; ratio: 0.85"></span>
              Archivo .txt
            </a>
          </li>
          <li className={inputMode === 'text' ? 'uk-active' : ''}>
            <a onClick={() => handleModeChange('text')}>
              <span uk-icon="icon: pencil; ratio: 0.85"></span>
              Texto directo
            </a>
          </li>
        </ul>

        {/* MODO ARCHIVO */}
        {inputMode === 'file' && (
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
                  <span>{fileName ? 'Cambiar Archivo' : 'Seleccionar Archivo'}</span>
                </button>
                {fileName && (
                  <div className="import-filename">
                    📄 {fileName}
                    <button
                      type="button"
                      className="import-clear-btn"
                      onClick={handleClear}
                      disabled={isProcessing || isImporting}
                    >✕</button>
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
        )}

        {/* MODO TEXTO */}
        {inputMode === 'text' && (
          <div className="uk-margin-medium">
            <label className="uk-form-label">Pegar texto con VINs</label>
            <textarea
              className="uk-textarea"
              rows={8}
              placeholder={
                'Pega aquí los VINs o el contenido exportado...\n\n' +
                'Con secciones (auto-detectado):\nDeliverys\nWBA3A5C54DF000001\nWBA3A5C54DF000002 - Último registro: 25/02/2026 14:30:45\n\nServices\nWBA3A5C54DF000003\n\n' +
                'O solo VINs simples (usa el selector de tipo):\nWBA3A5C54DF000001\nWBA3A5C54DF000002'
              }
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={isProcessing || isImporting}
            />

            <div className="uk-grid-small uk-flex-middle uk-margin-small-top" data-uk-grid>
              <div className="uk-width-expand">
                {hasSectionsInText ? (
                  <div className="repeat-info">
                    🔍 <strong>Auto-detectado:</strong> Delivery + Service — cada sección se importará a su tabla
                  </div>
                ) : (
                  <div className="uk-grid-small uk-flex-middle" data-uk-grid>
                    <div className="uk-width-auto">
                      <label className="uk-form-label uk-margin-remove">Tipo:</label>
                    </div>
                    <div className="uk-width-auto">
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
                )}
              </div>

              <div className="uk-width-auto">
                <button
                  className="uk-button uk-button-secondary"
                  onClick={handleTextProcess}
                  disabled={isProcessing || isImporting || !textInput.trim()}
                >
                  {isProcessing ? (
                    <>
                      <span data-uk-spinner="ratio: 0.6"></span>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <span uk-icon="icon: search; ratio: 0.9"></span>
                      <span>Analizar</span>
                    </>
                  )}
                </button>
                {textInput && (
                  <button
                    className="uk-button uk-button-secondary uk-margin-small-left"
                    onClick={handleClear}
                    disabled={isProcessing || isImporting}
                  >
                    <span uk-icon="icon: close; ratio: 0.9"></span>
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Spinner de procesamiento */}
        {isProcessing && (
          <div className="uk-text-center uk-padding">
            <span data-uk-spinner="ratio: 2"></span>
            <p className="uk-margin-top">Procesando...</p>
          </div>
        )}

        {/* Preview de resultados */}
        {preview && !isProcessing && (
          <div className="import-preview-section">

            {/* Stat cards */}
            <div className="uk-grid-small uk-child-width-1-4@m uk-margin-medium-bottom" data-uk-grid>
              <div>
                <div className="import-stat-card success">
                  <span className="import-stat-icon">✅</span>
                  <div>
                    <div className="import-stat-label">Para Agregar</div>
                    <div className="import-stat-value">{stats.toAdd}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="import-stat-card warning">
                  <span className="import-stat-icon">⚠️</span>
                  <div>
                    <div className="import-stat-label">Omitidos</div>
                    <div className="import-stat-value">{stats.omitted}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="import-stat-card error">
                  <span className="import-stat-icon">❌</span>
                  <div>
                    <div className="import-stat-label">Errores</div>
                    <div className="import-stat-value">{stats.errors}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="import-stat-card info">
                  <span className="import-stat-icon">🔄</span>
                  <div>
                    <div className="import-stat-label">Duplicados</div>
                    <div className="import-stat-value">{stats.duplicatesInFile}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resultados por sección (cuando se auto-detectan Deliverys/Services) */}
            {preview.hasSections && (
              <>
                <h4 className="import-section-label">📦 Delivery</h4>
                {renderResults(preview.delivery)}
                <h4 className="import-section-label uk-margin-medium-top">🔧 Service</h4>
                {renderResults(preview.service)}
              </>
            )}

            {/* Resultados sin secciones */}
            {!preview.hasSections && renderResults(preview)}

            {/* Botones de acción */}
            <div className="uk-margin-top uk-text-center">
              <button
                className="uk-button uk-button-primary uk-margin-small-right"
                onClick={executeImport}
                disabled={isImporting || stats.toAdd === 0}
              >
                {isImporting ? (
                  <>
                    <span data-uk-spinner="ratio: 0.6"></span>
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <span uk-icon="check"></span>
                    <span>Confirmar Importación</span>
                  </>
                )}
              </button>
              <button
                className="uk-button uk-button-secondary"
                onClick={handleClear}
                disabled={isImporting}
              >
                <span uk-icon="close"></span>
                <span>Cancelar</span>
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
