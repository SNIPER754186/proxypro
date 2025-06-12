const https = require("https");
const http = require("http");
const url = require("url");

const MAX_RANGE_SIZE = 5 * 1024 * 1024; // 5 MB en bytes

module.exports = (req, res) => {
  const query = url.parse(req.url, true).query;
  const targetUrl = query.url;

  if (!targetUrl) {
    res.statusCode = 400;
    res.end("Missing 'url' parameter");
    return;
  }

  const parsedUrl = url.parse(targetUrl);
  const client = targetUrl.startsWith("https") ? https : http;

  // Asegurar que el encabezado Range no exceda 5MB
  let headers = { ...req.headers };
  const rangeHeader = headers["range"];

  if (rangeHeader && /^bytes=\d+-\d*$/.test(rangeHeader)) {
    const match = rangeHeader.match(/^bytes=(\d+)-(\d+)?$/);
    const start = parseInt(match[1]);
    let end = match[2] ? parseInt(match[2]) : start + MAX_RANGE_SIZE - 1;

    // Limitar el tamaño del rango
    if (end - start > MAX_RANGE_SIZE) {
      end = start + MAX_RANGE_SIZE - 1;
    }

    headers["range"] = `bytes=${start}-${end}`;
  }

  // Preparar la solicitud al servidor original
  const proxyReq = client.request({
    ...parsedUrl,
    method: req.method,
    headers: {
      ...headers,
      host: parsedUrl.host
    }
  }, (proxyRes) => {
    // Reescribir a 206 si el origen envió 200 con Content-Range (algunos servidores lo hacen mal)
    if (req.headers.range && proxyRes.statusCode === 200 && proxyRes.headers["content-range"]) {
      res.writeHead(206, proxyRes.headers);
    } else {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
    }

    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.statusCode = 500;
    res.end("Proxy error: " + err.message);
  });

  req.pipe(proxyReq);
};
