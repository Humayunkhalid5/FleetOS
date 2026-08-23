const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const LICENSE_TYPES = new Set(['application/pdf', ...IMAGE_TYPES]);

function parseDataUrl(value, { label, allowedTypes, maxBytes }) {
  const input = String(value || '');
  const match = input.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match || !allowedTypes.has(match[1])) {
    const error = new Error(`${label} must be an approved file type`);
    error.status = 400;
    throw error;
  }
  const bytes = Buffer.from(match[2], 'base64').length;
  if (!bytes || bytes > maxBytes) {
    const error = new Error(`${label} exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit`);
    error.status = 413;
    throw error;
  }
  return { data: input, mimeType: match[1], size: bytes };
}

function validateLogo(value) {
  return parseDataUrl(value, { label: 'Company logo', allowedTypes: IMAGE_TYPES, maxBytes: 1.5 * 1024 * 1024 });
}

function validateBusinessLicense(value) {
  return parseDataUrl(value, { label: 'Business license', allowedTypes: LICENSE_TYPES, maxBytes: 5 * 1024 * 1024 });
}

module.exports = { validateLogo, validateBusinessLicense };
