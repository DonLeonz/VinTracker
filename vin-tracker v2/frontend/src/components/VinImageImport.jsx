import { useState, useCallback, useRef, useMemo, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { processVin, validateVinLength, showNotification } from '../utils/helpers';
import { vinService } from '../services/api';

// Redimensiona imagen a máx 1600px para reducir payload sin perder legibilidad del VIN
const resizeImage = (file) =>
  new Promise((resolve, reject) => {
    const MAX = 1600;
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen no válida o corrupta'));
      img.onload = () => {
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

let cardIdCounter = 0;
const nextId = () => `img-${++cardIdCounter}`;

const RATE_LIMIT_DELAY = 20000;
const MAX_RATE_RETRIES = 15;

const VinImageImport = memo(({ onImportCompleted }) => {
  const [cards, setCards] = useState([]);
  const [type, setType] = useState('delivery');
  const [isImporting, setIsImporting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [preview, setPreview] = useState(null);

  const [viewerCardId, setViewerCardId] = useState(null);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const queueRef = useRef([]);
  const workerActiveRef = useRef(false);
  const cardsRef = useRef([]);

  const viewerCard = useMemo(
    () => cards.find(c => c.id === viewerCardId) || null,
    [cards, viewerCardId]
  );

  const viewerIndex = useMemo(
    () => cards.findIndex(c => c.id === viewerCardId),
    [cards, viewerCardId]
  );

  const readyVins = useMemo(
    () => cards.filter(c => c.vin && validateVinLength(c.vin)),
    [cards]
  );

  const isAnyAnalyzing = useMemo(
    () => cards.some(c => c.status === 'analyzing' || c.status === 'retrying'),
    [cards]
  );

  const analyzingCount = useMemo(
    () => cards.filter(c => ['pending', 'analyzing', 'retrying'].includes(c.status)).length,
    [cards]
  );
  const errCardCount = useMemo(
    () => cards.filter(c => c.status === 'error').length,
    [cards]
  );
  const manualCount = useMemo(
    () => cards.filter(c => c.status === 'manual_required' && !validateVinLength(c.vin)).length,
    [cards]
  );
  const processedCount = useMemo(
    () => cards.filter(c => !['pending', 'analyzing', 'retrying'].includes(c.status)).length,
    [cards]
  );

  // Analiza UNA imagen con OCR; reintenta si hay rate limit (hasta MAX_RATE_RETRIES)
  const analyzeCard = useCallback(async (id, file, retryCount = 0) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, status: 'analyzing' } : c));
    try {
      const { base64, mimeType } = await resizeImage(file);
      const result = await vinService.extractVinsFromImage(base64, mimeType);

      if (result.success && result.vin) {
        setCards(prev => prev.map(c =>
          c.id === id
            ? { ...c, status: 'detected', vin: result.vin, detectedType: result.detectedType }
            : c
        ));
      } else {
        setCards(prev => prev.map(c =>
          c.id === id ? { ...c, status: 'manual_required', vin: '' } : c
        ));
      }
    } catch (err) {
      const msg = err?.message || '';
      const detail = err?.detail || '';
      const displayError = detail ? `${msg}: ${detail}` : msg;

      if (msg.includes('Límite') && retryCount < MAX_RATE_RETRIES) {
        setCards(prev => prev.map(c =>
          c.id === id ? { ...c, status: 'retrying', retryAttempt: retryCount + 1 } : c
        ));
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
        return analyzeCard(id, file, retryCount + 1);
      }
      setCards(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'error', error: displayError || 'Error al analizar' } : c
      ));
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (workerActiveRef.current) return;
    workerActiveRef.current = true;
    while (queueRef.current.length > 0) {
      const { id, file } = queueRef.current.shift();
      await analyzeCard(id, file);
    }
    workerActiveRef.current = false;
  }, [analyzeCard]);

  const addFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showNotification('⚠️ Solo se aceptan imágenes (jpg, png, webp)', 'warning');
      return;
    }

    const newCards = imageFiles.map(file => ({
      id: nextId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      vin: '',
      detectedType: 'unknown',
      error: null
    }));

    setCards(prev => [...prev, ...newCards]);
    setPreview(null);
    newCards.forEach(card => queueRef.current.push({ id: card.id, file: card.file }));
    processQueue();
  }, [processQueue]);

  const handleFileInput = useCallback((e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('drag-over');
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback(() => {
    dropZoneRef.current?.classList.remove('drag-over');
  }, []);

  const updateVin = useCallback((id, value) => {
    setPreview(null);
    const cleaned = value.toUpperCase().replace(/O/g, '0');
    setCards(prev => prev.map(c =>
      c.id === id
        ? { ...c, vin: cleaned, status: validateVinLength(cleaned) ? 'detected' : 'manual_required' }
        : c
    ));
  }, []);

  const removeCard = useCallback((id) => {
    queueRef.current = queueRef.current.filter(item => item.id !== id);
    setPreview(null);
    setCards(prev => {
      const card = prev.find(c => c.id === id);
      if (card?.previewUrl) URL.revokeObjectURL(card.previewUrl);
      return prev.filter(c => c.id !== id);
    });
    setViewerCardId(prev => prev === id ? null : prev);
  }, []);

  const handleClear = useCallback(() => {
    queueRef.current = [];
    setCards(prev => {
      prev.forEach(c => { if (c.previewUrl) URL.revokeObjectURL(c.previewUrl); });
      return [];
    });
    setPreview(null);
    setViewerCardId(null);
  }, []);

  const checkForImport = useCallback(async () => {
    if (readyVins.length === 0) return;

    const status = await vinService.checkConnection();
    if (!status.isConnected) {
      showNotification('❌ No se puede importar: La base de datos está desconectada', 'danger');
      return;
    }

    setIsChecking(true);
    const results = { toAdd: [], omitted: [], errors: [], duplicatesInFile: [] };
    const seen = new Set();

    for (const card of readyVins) {
      const vin = processVin(card.vin);
      if (seen.has(vin)) {
        results.duplicatesInFile.push({ vin, reason: 'Duplicado entre las imágenes' });
        continue;
      }
      seen.add(vin);

      try {
        const check = await vinService.checkVin(vin, type);
        if (!check.exists) {
          results.toAdd.push({ vin, isNew: true });
        } else if (check.is_not_registered) {
          results.omitted.push({ vin, reason: 'Ya existe pero no está registrado' });
        } else if (type === 'delivery') {
          results.omitted.push({ vin, reason: 'Ya existe y está registrado (Delivery no se repite)' });
        } else {
          results.toAdd.push({ vin, isNew: false, isRepeated: true, existingId: check.existing_id, repeatCount: check.repeat_count });
        }
      } catch (err) {
        results.errors.push({ vin, reason: `Error al verificar: ${err?.message || 'Error desconocido'}` });
      }
    }

    setPreview(results);
    setIsChecking(false);
  }, [readyVins, type]);

  const executeImport = useCallback(async () => {
    if (!preview || preview.toAdd.length === 0) return;
    setIsImporting(true);
    let successCount = 0;
    let importErrCount = 0;

    for (const item of preview.toAdd) {
      try {
        const result = item.isRepeated
          ? await vinService.addRepeatedVin(item.vin, type)
          : await vinService.addVin(item.vin, type);
        if (result.success) successCount++;
        else importErrCount++;
      } catch {
        importErrCount++;
      }
    }

    if (importErrCount === 0) {
      showNotification(`✅ Importación exitosa: ${successCount} VINs agregados`, 'success');
    } else {
      showNotification(`⚠️ Importación completada: ${successCount} éxitos, ${importErrCount} errores`, 'warning');
    }

    handleClear();
    setIsImporting(false);
    onImportCompleted?.();
  }, [preview, type, handleClear, onImportCompleted]);

  const openViewer = useCallback((id) => { setViewerCardId(id); setRotation(0); }, []);
  const closeViewer = useCallback(() => setViewerCardId(null), []);
  const rotateLeft = useCallback(() => setRotation(r => (r - 90 + 360) % 360), []);
  const rotateRight = useCallback(() => setRotation(r => (r + 90) % 360), []);

  const navPrev = useCallback(() => {
    const idx = cards.findIndex(c => c.id === viewerCardId);
    if (idx > 0) { setViewerCardId(cards[idx - 1].id); setRotation(0); }
  }, [cards, viewerCardId]);

  const navNext = useCallback(() => {
    const idx = cards.findIndex(c => c.id === viewerCardId);
    if (idx < cards.length - 1) { setViewerCardId(cards[idx + 1].id); setRotation(0); }
  }, [cards, viewerCardId]);

  // Navegación con teclado en el visor
  useEffect(() => {
    if (!viewerCard) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  navPrev();
      if (e.key === 'ArrowRight') navNext();
      if (e.key === 'Escape')     closeViewer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerCard, navPrev, navNext, closeViewer]);

  // Sincroniza ref con el estado de cards para poder acceder al valor actual en el cleanup
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  // Revoca todas las Object URLs al desmontar el componente (evita memory leaks)
  useEffect(() => () => {
    cardsRef.current.forEach(c => { if (c.previewUrl) URL.revokeObjectURL(c.previewUrl); });
  }, []);

  const getCardStatusIcon = (card) => {
    switch (card.status) {
      case 'analyzing':       return <span data-uk-spinner="ratio: 0.7"></span>;
      case 'retrying':        return '⏳';
      case 'detected':        return validateVinLength(card.vin) ? '✅' : '⚠️';
      case 'manual_required': return '📝';
      case 'error':           return '❌';
      default:                return '⌛';
    }
  };

  const getCardStatusClass = (card) => {
    if (card.status === 'detected' && validateVinLength(card.vin)) return 'detected';
    if (card.status === 'manual_required') return 'manual-required';
    if (card.status === 'error') return 'error';
    return '';
  };

  const getCardStatusText = (card) => {
    switch (card.status) {
      case 'analyzing':       return 'Analizando...';
      case 'retrying':        return `Reintento ${card.retryAttempt}/${MAX_RATE_RETRIES}`;
      case 'detected':        return validateVinLength(card.vin) ? 'VIN detectado' : 'Revisar VIN';
      case 'manual_required': return 'Ingresar manual';
      case 'error':           return 'Error de OCR';
      default:                return 'En cola';
    }
  };

  const renderCategory = (items, categoryClass, label) => {
    if (!items?.length) return null;
    return (
      <div className={`import-category ${categoryClass}`}>
        <h4>{label} ({items.length})</h4>
        <div className="import-list">
          {items.map((item, idx) => (
            <div key={idx} className="import-item">
              <span className="import-item-vin">{item.vin}</span>
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

  return (
    <div>
      {/* Zona de drop (solo cuando no hay cards) */}
      {cards.length === 0 && (
        <div
          ref={dropZoneRef}
          className="import-image-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <span uk-icon="icon: image; ratio: 3" className="icon-golden"></span>
          <p className="uk-margin-small-top uk-text-bold">Arrastra las imágenes aquí</p>
          <p className="uk-text-muted uk-margin-small-top">o haz clic para seleccionar — JPG, PNG, WEBP</p>
          <button type="button" className="uk-button uk-button-secondary uk-margin-top">
            <span uk-icon="icon: upload; ratio: 0.9"></span>
            <span>Seleccionar imágenes</span>
          </button>
        </div>
      )}

      {/* Toolbar con stats + controles */}
      {cards.length > 0 && (
        <div className="import-image-toolbar">
          <div className="import-image-toolbar-stats">
            <span className="import-image-stat-pill">
              <span uk-icon="icon: image; ratio: 0.75"></span>
              {cards.length} imagen{cards.length !== 1 ? 'es' : ''}
            </span>
            {readyVins.length > 0 && (
              <span className="import-image-stat-pill success">✅ {readyVins.length} listas</span>
            )}
            {analyzingCount > 0 && (
              <span className="import-image-stat-pill pending">
                <span data-uk-spinner="ratio: 0.5"></span>
                {analyzingCount} en cola
              </span>
            )}
            {manualCount > 0 && (
              <span className="import-image-stat-pill manual">📝 {manualCount} manuales</span>
            )}
            {errCardCount > 0 && (
              <span className="import-image-stat-pill error">❌ {errCardCount}</span>
            )}
          </div>

          <div className="import-image-toolbar-actions">
            <div className="import-image-type-select">
              <label className="uk-form-label uk-margin-remove">Tipo:</label>
              <select
                className="uk-select"
                value={type}
                onChange={(e) => { setType(e.target.value); setPreview(null); }}
                disabled={isImporting || isChecking}
              >
                <option value="delivery">📦 Delivery</option>
                <option value="service">🔧 Service</option>
              </select>
            </div>
            <div className="import-toolbar-sep" />
            <button
              className="uk-button uk-button-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || isChecking}
              title="Agregar más imágenes"
            >
              <span uk-icon="icon: plus; ratio: 0.9"></span>
              <span className="import-image-btn-label"> Agregar más</span>
            </button>
            <div className="import-toolbar-sep" />
            <button
              className="uk-button uk-button-secondary"
              onClick={handleClear}
              disabled={isImporting || isChecking}
              title="Limpiar todo"
            >
              <span uk-icon="icon: trash; ratio: 0.9"></span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de progreso de análisis */}
      {cards.length > 0 && analyzingCount > 0 && (
        <div className="import-image-progress">
          <div className="import-image-progress-track">
            <div
              className="import-image-progress-fill"
              style={{ width: `${(processedCount / cards.length) * 100}%` }}
            />
          </div>
          <p className="uk-text-small uk-text-muted uk-margin-remove">
            Analizando con OCR — {processedCount} de {cards.length} procesadas
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="import-file-input-hidden"
      />

      {/* Grid de cards */}
      {cards.length > 0 && (
        <div className="import-image-grid">
          {cards.map(card => (
            <div key={card.id} className={`import-image-card ${getCardStatusClass(card)}`}>

              {/* X — usa el mismo estilo que en el input de agregar VINs */}
              <button
                className="vin-clear-btn import-image-card-remove"
                onClick={() => removeCard(card.id)}
                disabled={isImporting || isChecking}
                title="Quitar imagen"
              >✕</button>

              {/* Thumbnail clickable */}
              <div
                className="import-image-thumb import-image-thumb-clickable"
                onClick={() => openViewer(card.id)}
                title="Clic para ampliar"
              >
                <img src={card.previewUrl} alt="VIN" />

                {card.status === 'pending' && (
                  <div className="import-image-overlay import-image-overlay-pending" />
                )}
                {card.status === 'analyzing' && (
                  <div className="import-image-overlay">
                    <span data-uk-spinner="ratio: 1.5"></span>
                  </div>
                )}
                {card.status === 'retrying' && (
                  <div className="import-image-overlay">
                    <div className="import-image-overlay-inner">
                      <span className="import-image-retry-icon">⏳</span>
                      <p className="uk-text-small uk-text-center uk-margin-remove">
                        Reintentando<br />{card.retryAttempt}/{MAX_RATE_RETRIES}
                      </p>
                    </div>
                  </div>
                )}

                {['detected', 'manual_required', 'error'].includes(card.status) && (
                  <div className={`import-image-status-badge ${getCardStatusClass(card)}`}>
                    <span>{getCardStatusText(card)}</span>
                  </div>
                )}

                <div className="import-image-zoom-hint">
                  <span uk-icon="icon: search; ratio: 0.75"></span>
                </div>
              </div>

              {/* Cuerpo de la card */}
              <div className="import-image-body">
                <p className="import-image-filename" title={card.file.name}>{card.file.name}</p>

                {card.status === 'error' && (
                  <p className="uk-text-danger uk-text-small uk-margin-remove">{card.error}</p>
                )}

                {card.status === 'manual_required' && !card.vin && (
                  <p className="import-image-manual-badge">📝 Ingreso manual requerido</p>
                )}

                {(card.status === 'detected' || card.status === 'manual_required') && (
                  <div className="import-image-vin-wrap">
                    <input
                      type="text"
                      className="uk-input"
                      maxLength={17}
                      placeholder="VIN (17 caracteres)"
                      value={card.vin}
                      onChange={(e) => updateVin(card.id, e.target.value)}
                      disabled={isImporting || isChecking}
                    />
                    <div className="import-image-vin-meta">
                      <span className="uk-text-muted uk-text-small">
                        {card.detectedType !== 'unknown'
                          ? (card.detectedType === 'delivery' ? '📦 Delivery' : '🔧 Service')
                          : ''}
                      </span>
                      <span className={`import-image-vin-count ${card.vin.length === 17 ? 'valid' : card.vin.length > 0 ? 'partial' : ''}`}>
                        {card.vin.length}/17
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón: Revisar VINs */}
      {readyVins.length > 0 && !preview && (
        <div className="uk-margin-top uk-text-center">
          <button
            className="uk-button uk-button-secondary"
            onClick={checkForImport}
            disabled={isChecking || isAnyAnalyzing || isImporting}
          >
            {isChecking ? (
              <>
                <span data-uk-spinner="ratio: 0.6"></span>
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span uk-icon="icon: search; ratio: 0.9"></span>
                <span>Revisar {readyVins.length} VIN{readyVins.length !== 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Preview de resultados */}
      {preview && (
        <div className="import-preview-section">
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
                  <div className="import-stat-label">Duplicados</div>
                  <div className="import-stat-value">{preview.duplicatesInFile.length}</div>
                </div>
              </div>
            </div>
          </div>

          {renderCategory(preview.toAdd, 'success', '✅ VINs para Agregar')}
          {renderCategory(preview.omitted, 'warning', '⚠️ VINs Omitidos')}
          {renderCategory(preview.duplicatesInFile, 'info', '🔄 Duplicados')}
          {renderCategory(preview.errors, 'error', '❌ VINs con Errores')}

          <div className="uk-margin-top uk-text-center">
            <button
              className="uk-button uk-button-primary uk-margin-small-right"
              onClick={executeImport}
              disabled={isImporting || preview.toAdd.length === 0}
            >
              {isImporting ? (
                <>
                  <span data-uk-spinner="ratio: 0.6"></span>
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <span uk-icon="check"></span>
                  <span>Confirmar Importación ({preview.toAdd.length})</span>
                </>
              )}
            </button>
            <button
              className="uk-button uk-button-secondary"
              onClick={() => setPreview(null)}
              disabled={isImporting}
            >
              <span uk-icon="close"></span>
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {/* Visor renderizado fuera del árbol DOM via portal — evita que position:fixed quede
          anclado a un ancestro con transform (ej: fade-in del card padre) */}
      {viewerCard && createPortal(
        <div className="import-image-viewer-overlay" onClick={closeViewer}>
          <div className="import-image-viewer-content" onClick={e => e.stopPropagation()}>

            {/* Barra superior: nav + rotar + nombre + cerrar */}
            <div className="import-image-viewer-controls">
              {/* Navegación prev/next */}
              <button
                className="uk-button uk-button-secondary uk-button-small import-viewer-nav-btn"
                onClick={navPrev}
                disabled={viewerIndex === 0}
                title="Imagen anterior (←)"
              >‹</button>
              <span className="import-image-viewer-index">
                {viewerIndex + 1} / {cards.length}
              </span>
              <button
                className="uk-button uk-button-secondary uk-button-small import-viewer-nav-btn"
                onClick={navNext}
                disabled={viewerIndex >= cards.length - 1}
                title="Imagen siguiente (→)"
              >›</button>

              <div className="import-image-viewer-sep" />

              {/* Rotar */}
              <button
                className="uk-button uk-button-secondary uk-button-small"
                onClick={rotateLeft}
                title="Rotar 90° izquierda"
              >↺</button>
              <button
                className="uk-button uk-button-secondary uk-button-small"
                onClick={rotateRight}
                title="Rotar 90° derecha"
              >↻</button>
              {rotation !== 0 && (
                <span className="uk-text-muted uk-text-small">{rotation}°</span>
              )}

              <div className="import-image-viewer-sep" />

              {/* Nombre del archivo */}
              <span className="import-image-viewer-filename">{viewerCard.file.name}</span>

              {/* Cerrar — mismo X que en el input de VINs */}
              <button
                className="vin-clear-btn import-image-viewer-close"
                onClick={closeViewer}
                title="Cerrar visor (Esc)"
              >✕</button>
            </div>

            {/* Imagen + panel VIN */}
            <div className="import-image-viewer-body">
              <div className="import-image-viewer-img-wrap">
                <img
                  src={viewerCard.previewUrl}
                  alt="VIN"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>

              <div className="import-image-viewer-panel">
                <div className="import-viewer-status-row">
                  <span className="import-viewer-status-icon">{getCardStatusIcon(viewerCard)}</span>
                  <span className={`import-viewer-status-label ${getCardStatusClass(viewerCard)}`}>
                    {getCardStatusText(viewerCard)}
                  </span>
                </div>

                {viewerCard.status === 'manual_required' && (
                  <p className="import-image-manual-badge uk-text-center">📝 Ingreso manual requerido</p>
                )}

                <label className="uk-form-label">VIN</label>
                <div className="import-image-viewer-vin-wrap">
                  <input
                    type="text"
                    className="uk-input"
                    maxLength={17}
                    placeholder="Escribe el VIN aquí"
                    value={viewerCard.vin}
                    onChange={(e) => updateVin(viewerCard.id, e.target.value)}
                    disabled={isImporting || isChecking}
                  />
                  <div className="import-image-vin-meta">
                    <span className={`import-image-vin-count ${viewerCard.vin.length === 17 ? 'valid' : viewerCard.vin.length > 0 ? 'partial' : ''}`}>
                      {viewerCard.vin.length}/17
                    </span>
                    {viewerCard.vin && validateVinLength(viewerCard.vin) && (
                      <span className="import-image-vin-valid">✅ VIN válido</span>
                    )}
                  </div>
                </div>

                {viewerCard.detectedType !== 'unknown' && (
                  <p className="uk-text-muted uk-text-small uk-margin-small-top uk-margin-remove-bottom">
                    Tipo sugerido: {viewerCard.detectedType === 'delivery' ? '📦 Delivery' : '🔧 Service'}
                  </p>
                )}

                <p className="import-viewer-auto-save">
                  El cambio se guarda automáticamente
                </p>

                {/* Navegación prev/next también en el panel */}
                <div className="import-viewer-panel-nav">
                  <button
                    className="uk-button uk-button-secondary uk-button-small"
                    onClick={navPrev}
                    disabled={viewerIndex === 0}
                  >‹ Anterior</button>
                  <button
                    className="uk-button uk-button-secondary uk-button-small"
                    onClick={navNext}
                    disabled={viewerIndex >= cards.length - 1}
                  >Siguiente ›</button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});

VinImageImport.displayName = 'VinImageImport';
export default VinImageImport;
