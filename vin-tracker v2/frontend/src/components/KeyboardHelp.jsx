import { useEffect } from 'react';

const SHORTCUTS = [
  { section: 'Navegación' },
  { keys: ['Alt', '1–5'], desc: 'Cambiar entre tabs principales' },
  { keys: ['Alt', 'T'], desc: 'Abrir / Cerrar Papelera' },
  { section: 'Inputs rápidos' },
  { keys: ['V'], desc: 'Ir a Agregar VINs + enfocar campo' },
  { keys: ['/'], desc: 'Ir a Ver Registros + enfocar búsqueda' },
  { section: 'Importar VINs' },
  { keys: ['Alt', '←'], desc: 'Modo anterior (Imagen ← Texto ← Archivo)' },
  { keys: ['Alt', '→'], desc: 'Modo siguiente (Archivo → Texto → Imagen)' },
  { keys: ['Alt', 'H'], desc: 'Analizar texto (modo Texto directo)' },
  { keys: ['Alt', 'X'], desc: 'Limpiar texto (modo Texto directo)' },
  { section: 'General' },
  { keys: ['Enter', '↵'], desc: 'Confirmar en modales' },
  { keys: ['Esc'], desc: 'Cancelar / Cerrar modal o ayuda' },
  { keys: ['Alt', 'K'], desc: 'Mostrar / Ocultar esta ayuda' },
];

function KeyboardHelp({ onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="kbd-help-overlay" onClick={onClose}>
      <div className="kbd-help-panel" onClick={(e) => e.stopPropagation()}>
        <div className="kbd-help-header">
          <h3 className="kbd-help-title">⌨️ Atajos de Teclado</h3>
          <button className="vin-clear-btn kbd-help-close" onClick={onClose} title="Cerrar (Esc)">✕</button>
        </div>
        <div className="kbd-help-body">
          <table className="kbd-help-table">
            <tbody>
              {SHORTCUTS.map((item, i) =>
                item.section ? (
                  <tr key={`s-${i}`} className="kbd-help-section-row">
                    <td colSpan={2} className="kbd-help-section">{item.section}</td>
                  </tr>
                ) : (
                  <tr key={item.desc}>
                    <td className="kbd-help-keys">
                      {item.keys.map((k, j) => (
                        <span key={j}>
                          <kbd className="kbd-key">{k}</kbd>
                          {j < item.keys.length - 1 && <span className="kbd-plus">+</span>}
                        </span>
                      ))}
                    </td>
                    <td className="kbd-help-desc">{item.desc}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
        <div className="kbd-help-footer">
          <span className="kbd-help-hint">
            Presiona <kbd className="kbd-key">Alt</kbd><span className="kbd-plus">+</span><kbd className="kbd-key">K</kbd> o <kbd className="kbd-key">Esc</kbd> para cerrar
          </span>
        </div>
      </div>
    </div>
  );
}

export default KeyboardHelp;
