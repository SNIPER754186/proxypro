const https = require("https");
const http = require("http");
const url = require("url");

module.exports = (req, res) => {
  const query = url.parse(req.url, true).query;
  const targetUrl = query.url;

  if (!targetUrl) {
    res.statusCode = 400;
    res.end("Missing 'url' parameter");
    return;
  }

  // ⚠️ CORS para permitir otros dominios
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  // ✅ Si es preflight (OPTIONS), respondé sin continuar
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const parsedUrl = url.parse(targetUrl);
  const client = targetUrl.startsWith("https") ? https : http;

  // Analizar el rango solicitado
  const originalRange = req.headers.range || "bytes=0-";
  const match = /bytes=(\d+)-?(\d+)?/.exec(originalRange);
  let start = 0;
  let end = null;

  if (match) {
    start = parseInt(match[1]);
    end = match[2] ? parseInt(match[2]) : start + 5242879; // Máx 5MB
  }

  const rangeHeader = `bytes=${start}-${end}`;

  const proxyReq = client.request({
    ...parsedUrl,
    method: req.method,
    headers: {
      ...req.headers,
      range: rangeHeader,
      host: parsedUrl.host
    }
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.statusCode = 500;
    res.end("Proxy error: " + err.message);
  });

  req.pipe(proxyReq);
};
