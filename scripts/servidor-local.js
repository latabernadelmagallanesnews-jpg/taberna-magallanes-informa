const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = 'C:/Users/F4NT45M4/Documents/Proyecto predeterminado';
const PUERTO = Number(process.env.PORT || 8099);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  let destino = path.join(RAIZ, url);
  if (url === '/' || url === '') destino = path.join(RAIZ, 'publicar', 'index.html');
  if (!path.resolve(destino).startsWith(path.resolve(RAIZ))) { res.writeHead(403); return res.end('Prohibido'); }
  fs.stat(destino, (err, st) => {
    if (!err && st.isDirectory()) destino = path.join(destino, 'index.html');
    fs.readFile(destino, (e2, data) => {
      if (e2) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado: ' + url); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
}).listen(PUERTO, () => console.log('Servidor local en http://localhost:' + PUERTO + '/'));
