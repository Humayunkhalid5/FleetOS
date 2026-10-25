const zlib = require('zlib');

// Compress JSON API responses (Brotli or gzip, whichever the client accepts).
// Company listings and dashboards shrink 5–10×, which matters most on mobile.
const MIN_BYTES = 1024;

function compressJson(req, res, next) {
  const accepts = String(req.headers['accept-encoding'] || '');
  const encoding = /\bbr\b/.test(accepts) ? 'br' : /\bgzip\b/.test(accepts) ? 'gzip' : null;
  if (!encoding) return next();
  const sendJson = res.json.bind(res);
  res.json = (body) => {
    const text = JSON.stringify(body);
    if (res.headersSent || text === undefined || Buffer.byteLength(text) < MIN_BYTES) return sendJson(body);
    const finish = (error, buffer) => {
      if (res.headersSent) return;
      if (error) { sendJson(body); return; }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', encoding);
      res.setHeader('Content-Length', buffer.length);
      res.append('Vary', 'Accept-Encoding');
      res.end(buffer);
    };
    if (encoding === 'br') zlib.brotliCompress(text, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: text.length } }, finish);
    else zlib.gzip(text, { level: 6 }, finish);
    return res;
  };
  return next();
}

module.exports = { compressJson };
