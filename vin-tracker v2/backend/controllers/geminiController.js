// OCR.space API — OCR para extracción de VINs
// Límites gratis: 25.000 requests/mes, sin billing ni tarjeta requeridos
// OCREngine 2 está optimizado para texto denso (etiquetas de vehículos)

const OCR_URL = 'https://api.ocr.space/parse/image';

// VIN válido: exactamente 17 chars, A-H J-N P-Z 0-9 (sin I, O ni Q por especificación)
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

function isValidVin(str) {
  return str?.length === 17 && VIN_RE.test(str);
}

// Corrige errores comunes de OCR en el contexto de un VIN
function cleanOcr(raw) {
  return raw
    .toUpperCase()
    .replace(/I/g, '1')   // 'I' → '1' (error OCR muy frecuente)
    .replace(/O/g, '0')   // 'O' → '0'
    .replace(/Q/g, '0')   // 'Q' similar al 0
    .replace(/\s/g, '');  // espacios que el OCR pueda insertar en el medio
}

// Extrae el VIN del texto crudo devuelto por OCR.space
// Estrategia 1: busca la etiqueta "VIN" / "V.I.N" / "V I N" → tipo delivery
// Estrategia 2: busca cualquier secuencia de 17 chars alfanuméricos
function extractVinFromText(fullText) {
  if (!fullText) return { vin: null, detectedType: 'unknown' };

  const text = fullText.toUpperCase();

  // Estrategia 1: etiqueta explícita de VIN (etiquetas de delivery)
  const labelMatch = text.match(/V[\s.]?I[\s.]?N[\s.]?\s*[:\-#]?\s*/);
  if (labelMatch) {
    const afterLabel = text.substring(
      labelMatch.index + labelMatch[0].length,
      labelMatch.index + labelMatch[0].length + 40
    );
    const seq = afterLabel.match(/[A-Z0-9]{17}/);
    if (seq) {
      const cleaned = cleanOcr(seq[0]);
      if (isValidVin(cleaned)) return { vin: cleaned, detectedType: 'delivery' };
    }
  }

  // Estrategia 2: cualquier secuencia de 17 alfanuméricos (stickers de service u otros)
  const allSeqs = text.match(/[A-Z0-9]{17}/g) || [];
  for (const raw of allSeqs) {
    const cleaned = cleanOcr(raw);
    if (isValidVin(cleaned)) return { vin: cleaned, detectedType: 'unknown' };
  }

  return { vin: null, detectedType: 'unknown' };
}

export const extractVinsFromImage = async (req, res) => {
  const { imageBase64, mimeType } = req.body;

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ success: false, message: 'Se requiere imageBase64 y mimeType' });
  }

  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ success: false, message: 'OCR_SPACE_API_KEY no configurada en el servidor' });
  }

  try {
    // OCR.space espera la imagen con prefijo data URI
    const base64Image = `data:${mimeType};base64,${imageBase64}`;

    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('base64Image', base64Image);
    formData.append('language', 'eng');
    formData.append('OCREngine', '2');           // Más preciso para texto denso
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');            // Ayuda con texto pequeño
    formData.append('isOverlayRequired', 'false');

    const response = await fetch(OCR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OCR.space HTTP error:', response.status, data);
      return res.status(500).json({
        success: false,
        message: `Error de OCR.space (${response.status})`,
        detail: data?.ErrorMessage || `HTTP ${response.status}`
      });
    }

    if (data.IsErroredOnProcessing) {
      const errMsg = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage.join(', ')
        : data.ErrorMessage;

      console.error('OCR.space processing error:', errMsg);

      // Rate limit / cuota agotada (OCRExitCode 6 = límite de plan)
      if (data.OCRExitCode === 6 || errMsg?.toLowerCase().includes('limit')) {
        return res.status(429).json({
          success: false,
          message: 'Límite de OCR.space alcanzado',
          detail: errMsg
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Error al procesar imagen con OCR.space',
        detail: errMsg
      });
    }

    const fullText = data.ParsedResults?.[0]?.ParsedText || '';

    if (!fullText) {
      return res.json({ success: true, vin: null, detectedType: 'unknown' });
    }

    const { vin, detectedType } = extractVinFromText(fullText);
    return res.json({ success: true, vin, detectedType });

  } catch (error) {
    console.error('OCR.space error:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Error al conectar con OCR.space',
      detail: error?.message
    });
  }
};
