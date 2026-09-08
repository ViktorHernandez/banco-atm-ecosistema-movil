const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const puerto = Number(process.env.PORT) || 5501;
const raiz = __dirname;

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

const RUTAS_PUBLICAS = new Set([
  '/',
  '/login',
  '/crearcuenta',
  '/verificar',
  '/contacto',
]);

const RUTAS_APP_MOVIL = new Set(['/app-movil']);

const RUTAS_SEGURIDAD = new Set(['/seguridad']);

const RUTAS_PRIVADAS = new Set([
  '/resumen',
  '/cuentas',
  '/movimientos',
  '/transferencias',
  '/pagos',
  '/tarjetas',
  '/prestamos',
  '/avisos',
  '/perfil',
  '/admin',
  '/admin/usuarios',
  '/admin/tarjetas',
  '/admin/reportes',
  '/admin/auditoria',
]);

function resolverDocumento(ruta) {
  if (RUTAS_PUBLICAS.has(ruta)) {
    return '/index.html';
  }
  if (RUTAS_APP_MOVIL.has(ruta)) {
    return '/app-movil.html';
  }
  if (RUTAS_SEGURIDAD.has(ruta)) {
    return '/seguridad.html';
  }
  if (RUTAS_PRIVADAS.has(ruta)) {
    return '/portal.html';
  }
  return null;
}

const servidor = http.createServer((peticion, respuesta) => {
  const url = new URL(peticion.url, `http://${peticion.headers.host}`);
  let rutaRelativa = decodeURIComponent(url.pathname);

  if (rutaRelativa.length > 1 && rutaRelativa.endsWith('/')) {
    rutaRelativa = rutaRelativa.replace(/\/+$/, '');
  }

  const documento = resolverDocumento(rutaRelativa);
  if (documento) {
    rutaRelativa = documento;
  }

  const rutaAbsoluta = path.join(raiz, rutaRelativa);

  if (!rutaAbsoluta.startsWith(raiz)) {
    respuesta.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    respuesta.end('Acceso no permitido');
    return;
  }

  fs.readFile(rutaAbsoluta, (error, contenido) => {
    if (error) {
      if (!path.extname(rutaAbsoluta)) {
        fs.readFile(path.join(raiz, 'index.html'), (fallo, portada) => {
          if (fallo) {
            respuesta.writeHead(404, {
              'Content-Type': 'text/plain; charset=utf-8',
            });
            respuesta.end('Recurso no encontrado');
            return;
          }
          respuesta.writeHead(200, { 'Content-Type': tipos['.html'] });
          respuesta.end(portada);
        });
        return;
      }

      respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      respuesta.end('Recurso no encontrado');
      return;
    }

    const extension = path.extname(rutaAbsoluta).toLowerCase();
    respuesta.writeHead(200, {
      'Content-Type': tipos[extension] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    respuesta.end(contenido);
  });
});

servidor.listen(puerto, () => {
  console.log(`Portal web disponible en http://localhost:${puerto}`);
});
