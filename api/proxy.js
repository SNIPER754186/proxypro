const https = require("https");
const http = require("http");
const url = require("url");

module.exports = (req, res) => {
  const query = url.parse(req.url, true).query;
  const targetUrl = query.url;

  if (!targetUrl) {
    res.statusCode = 400;
    res.end("URL is required");
    return;
  }

  const client = targetUrl.startsWith("https") ? https : http;

  client.get(targetUrl, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  }).on("error", (err) => {
    res.statusCode = 500;
    res.end("Error: " + err.message);
  });
};