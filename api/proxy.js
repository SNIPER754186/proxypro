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

  const parsedUrl = url.parse(targetUrl);
  const client = targetUrl.startsWith("https") ? https : http;

  const proxyReq = client.request({
    ...parsedUrl,
    method: req.method,
    headers: {
      ...req.headers, // reenviamos todo
      host: parsedUrl.host // importante para evitar conflictos
    }
  }, (proxyRes) => {
    // Si el servidor de origen responde con 206 y hay Range, pasarlo tal cual
    if (req.headers.range && proxyRes.statusCode === 200 && proxyRes.headers["content-range"]) {
      res.writeHead(206, proxyRes.headers); // Forzar 206 si hay rango
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
