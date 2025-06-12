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

  const options = url.parse(targetUrl);
  options.method = req.method;

  // Reenviar headers importantes (especialmente Range para adelantar)
  options.headers = {
    "User-Agent": req.headers["user-agent"] || "",
    "Referer": req.headers["referer"] || "",
    "Range": req.headers["range"] || "",
    "Accept": req.headers["accept"] || "*/*",
    "Origin": req.headers["origin"] || ""
  };

  const client = targetUrl.startsWith("https") ? https : http;

  const proxyReq = client.request(options, (proxyRes) => {
    // Reenviar todos los headers
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.statusCode = 500;
    res.end("Proxy error: " + err.message);
  });

  req.pipe(proxyReq); // Reenviar el body si lo hay
};
