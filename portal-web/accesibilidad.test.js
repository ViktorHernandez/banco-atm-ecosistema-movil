const { JSDOM, VirtualConsole } = require('jsdom');
const axe = require('axe-core');
const fs = require('node:fs');
const path = require('node:path');

const PAGINAS = [
  { archivo: 'index.html', ruta: '/login', nombre: 'Acceso y alta de cuenta' },
  { archivo: 'seguridad.html', ruta: '/seguridad', nombre: 'Consejos de seguridad' },
  { archivo: 'app-movil.html', ruta: '/app-movil', nombre: 'Aplicación móvil' },
  { archivo: 'portal.html', ruta: '/resumen', nombre: 'Portal privado' },
];

const PAGINAS_ATM = [
  {
    archivo: 'index.html',
    base: path.join(__dirname, '..', 'atm-client'),
    ruta: '/',
    nombre: 'Cajero automático',
  },
];

const REGLAS = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const GUIONES_PORTAL = {
  'index.html': [
    'config.js',
    'js/traducciones.js',
    'js/i18n.js',
    'js/util.js',
    'js/accesibilidad.js',
    'js/api.js',
    'js/asistente.js',
    'js/publico.js',
  ],
  'portal.html': [
    'config.js',
    'js/traducciones.js',
    'js/i18n.js',
    'js/util.js',
    'js/accesibilidad.js',
    'js/api.js',
    'js/vistas-cliente.js',
    'js/vistas-admin.js',
    'js/notificaciones.js',
    'js/asistente.js',
    'js/portal.js',
  ],
  'seguridad.html': [
    'config.js',
    'js/traducciones.js',
    'js/i18n.js',
    'js/util.js',
    'js/accesibilidad.js',
  ],
  'app-movil.html': [
    'config.js',
    'js/traducciones.js',
    'js/i18n.js',
    'js/util.js',
    'js/accesibilidad.js',
  ],
};

const GUIONES_ATM = ['config.js', 'js/i18n.js', 'js/api.js', 'js/app.js'];

function inyectar(dom, raiz, guiones) {
  for (const guion of guiones) {
    const ruta = path.join(raiz, guion);
    if (!fs.existsSync(ruta)) {
      continue;
    }
    try {
      dom.window.eval(fs.readFileSync(ruta, 'utf8'));
    } catch (error) {
      console.log(`         (no se pudo evaluar ${guion}: ${error.message})`);
    }
  }
}

async function analizar(pagina, preferencias, opciones) {
  const ajustes = opciones || {};
  const consola = new VirtualConsole();
  const raiz = pagina.base || __dirname;
  const html = fs.readFileSync(path.join(raiz, pagina.archivo), 'utf8');

  const dom = new JSDOM(html, {
    url: (ajustes.origen || 'http://localhost:5501') + pagina.ruta,
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: consola,
    beforeParse(v) {
      v.fetch = () => Promise.reject(new Error('sin red'));
      v.Element.prototype.scrollIntoView = () => {};
      v.scrollTo = () => {};
      if (preferencias) {
        v.localStorage.setItem('portal.accesibilidad', JSON.stringify(preferencias));
      }
      if (ajustes.idioma) {
        v.localStorage.setItem(ajustes.claveIdioma || 'portal.idioma', ajustes.idioma);
      }
    },
  });

  const guiones = ajustes.guiones || GUIONES_PORTAL[pagina.archivo] || [];
  inyectar(dom, raiz, guiones);

  await esperar(900);

  const { window } = dom;

  if (typeof ajustes.preparar === 'function') {
    await ajustes.preparar(window);
    await esperar(300);
  }
  window.eval(axe.source);
  const resultado = await window.axe.run(window.document, REGLAS);
  const infracciones = resultado.violations.filter((v) => v.impact !== 'minor');

  dom.window.close();
  return infracciones;
}

(async () => {
  console.log('======================================================');
  console.log(' ACCESIBILIDAD — axe-core (WCAG 2.0/2.1/2.2 nivel AA)');
  console.log('======================================================');

  let total = 0;

  for (const pagina of PAGINAS) {
    const infracciones = await analizar(pagina, null);
    total += infracciones.length;

    if (infracciones.length === 0) {
      console.log(`  OK    ${pagina.nombre}`);
    } else {
      console.log(`  FALLA ${pagina.nombre}`);
      for (const v of infracciones) {
        console.log(`         [${v.impact}] ${v.id}: ${v.help}`);
        console.log(`         nodos: ${v.nodes.length} · ${v.nodes[0].html.slice(0, 110)}`);
      }
    }
  }

  console.log('');
  console.log(' Con ajustes de accesibilidad activados:');
  const conAjustes = {
    contraste: true,
    texto: 'maximo',
    movimiento: true,
    lectura: true,
    foco: true,
    enfasis: true,
  };
  for (const pagina of PAGINAS) {
    const infracciones = await analizar(pagina, conAjustes);
    total += infracciones.length;
    if (infracciones.length === 0) {
      console.log(`  OK    ${pagina.nombre}`);
    } else {
      console.log(`  FALLA ${pagina.nombre}`);
      for (const v of infracciones) {
        console.log(`         [${v.impact}] ${v.id}: ${v.help}`);
      }
    }
  }

  console.log('');
  console.log(' Portal en inglés:');
  for (const pagina of PAGINAS) {
    const infracciones = await analizar(pagina, null, { idioma: 'en' });
    total += infracciones.length;
    if (infracciones.length === 0) {
      console.log(`  OK    ${pagina.nombre}`);
    } else {
      console.log(`  FALLA ${pagina.nombre}`);
      for (const v of infracciones) {
        console.log(`         [${v.impact}] ${v.id}: ${v.help}`);
      }
    }
  }

  console.log('');
  console.log(' Cajero automático:');
  for (const idioma of ['es', 'en']) {
    for (const pagina of PAGINAS_ATM) {
      const infracciones = await analizar(pagina, null, {
        origen: 'http://localhost:5500',
        idioma,
        claveIdioma: 'atm.idioma',
        guiones: GUIONES_ATM,
      });
      total += infracciones.length;
      const nombre = `${pagina.nombre} (${idioma})`;
      if (infracciones.length === 0) {
        console.log(`  OK    ${nombre}`);
      } else {
        console.log(`  FALLA ${nombre}`);
        for (const v of infracciones) {
          console.log(`         [${v.impact}] ${v.id}: ${v.help}`);
          console.log(`         nodos: ${v.nodes.length} · ${v.nodes[0].html.slice(0, 110)}`);
        }
      }
    }
  }

  console.log('');
  console.log('======================================================');
  console.log(` RESULTADO: ${total} infracciones serias o críticas`);
  console.log('======================================================');
  process.exit(total === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
