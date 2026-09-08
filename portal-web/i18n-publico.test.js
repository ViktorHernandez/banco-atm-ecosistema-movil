const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = __dirname;
const ORIGEN = 'http://localhost:5599';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGINAS = [
  { archivo: 'index.html', ruta: '/login', nombre: 'Acceso y alta de cuenta' },
  { archivo: 'seguridad.html', ruta: '/seguridad', nombre: 'Consejos de seguridad' },
  { archivo: 'app-movil.html', ruta: '/app-movil', nombre: 'Aplicación móvil' },
];

const GUIONES = {
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

const ACENTOS = /[áéíóúÁÉÍÓÚñÑ¿¡]/;
const PALABRAS_ES = new RegExp(
  '\\b(' +
    [
      'de','del','la','el','los','las','una','para','con','sin','por','que',
      'su','sus','desde','hasta','entre','todos','cada','más','pero','como',
      'este','esta','estos','estas','saldo','cuenta','cuentas','tarjeta',
      'correo','contraseña','seguridad','servicios','canales','ayuda',
      'entrar','crear','enviar','escribir','atención','motivo','consulta',
      'información','cerrar','teléfono','cajero',
    ].join('|') +
    ')\\b',
  'i',
);

const DATOS = [
  'Banco ATM','Rodrigo Alcántara Vega','ATM','WEB','APP','MXN','ES','EN',
  'Español','English','WhatsApp','atencion@bancoatm.test','App Store',
  'Google Play','ATM-001','56 2972 7628',
];

function esDato(texto) {
  let t = texto.trim();
  for (const d of DATOS) t = t.split(d).join(' ');
  t = t.trim();
  if (!t) return true;
  if (/^[\d\s.,:$%*/·—+()-]+$/.test(t)) return true;
  if (/^[\w.+-]+@[\w.-]+$/.test(t)) return true;
  if (/^https?:\/\//.test(t)) return true;
  if (/^[A-Z]{2,}(_[A-Z]+)*$/.test(t)) return true;
  return false;
}

function visibles(documento, ventana) {
  const salida = [];
  const recorrido = documento.createTreeWalker(
    documento.body,
    ventana.NodeFilter.SHOW_TEXT,
  );
  let nodo = recorrido.nextNode();
  while (nodo) {
    const padre = nodo.parentNode;
    const etiqueta = padre ? padre.nodeName : '';
    if (etiqueta !== 'SCRIPT' && etiqueta !== 'STYLE' && nodo.nodeValue.trim()) {
      salida.push({ texto: nodo.nodeValue.trim(), etiqueta });
    }
    nodo = recorrido.nextNode();
  }
  for (const elemento of documento.body.querySelectorAll('*')) {
    for (const atributo of ['placeholder', 'title', 'aria-label', 'alt']) {
      const valor = elemento.getAttribute(atributo);
      if (valor && valor.trim()) {
        salida.push({ texto: valor.trim(), etiqueta: atributo });
      }
    }
  }
  return salida;
}

function residuos(documento, ventana) {
  return visibles(documento, ventana)
    .filter(({ texto }) => !esDato(texto))
    .filter(({ texto }) => ACENTOS.test(texto) || PALABRAS_ES.test(texto))
    .map(({ texto, etiqueta }) => `[${etiqueta}] ${texto.slice(0, 90)}`);
}

async function abrir(pagina, idioma) {
  const html = fs.readFileSync(path.join(RAIZ, pagina.archivo), 'utf8');
  const dom = new JSDOM(html, {
    url: ORIGEN + pagina.ruta,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
    beforeParse(v) {
      v.fetch = () => Promise.reject(new Error('sin red'));
      v.Element.prototype.scrollIntoView = () => {};
      v.open = () => null;
      v.localStorage.setItem('portal.idioma', idioma);
    },
  });

  for (const guion of GUIONES[pagina.archivo]) {
    dom.window.eval(fs.readFileSync(path.join(RAIZ, guion), 'utf8'));
  }
  dom.window.document.dispatchEvent(
    new dom.window.Event('DOMContentLoaded', { bubbles: true }),
  );
  await esperar(40);
  dom.window.PortalI18n.cambiar(idioma);
  await esperar(40);
  return dom;
}

async function principal() {
  console.log('======================================================');
  console.log(' i18n — pantallas públicas del Portal');
  console.log('======================================================\n');

  let fallos = 0;
  let total = 0;

  console.log(' En inglés:');
  for (const pagina of PAGINAS) {
    total += 1;
    const dom = await abrir(pagina, 'en');
    const lista = residuos(dom.window.document, dom.window);
    if (lista.length) {
      fallos += 1;
      console.log(`  FALLA ${pagina.nombre} — ${lista.length} residuos`);
      lista.slice(0, 8).forEach((r) => console.log('         ' + r));
    } else {
      console.log(`  OK    ${pagina.nombre}`);
    }
    dom.window.close();
  }

  console.log('\n Atención a clientes en inglés:');
  total += 1;
  const dom = await abrir(PAGINAS[0], 'en');
  const boton = dom.window.document.getElementById('telefonoCinta');
  if (!boton) {
    fallos += 1;
    console.log('  FALLA no se encontró el acceso de atención a clientes');
  } else {
    boton.click();
    await esperar(60);
    const motivo = dom.window.document.querySelector('[data-motivo]');
    if (motivo) {
      motivo.click();
      await esperar(60);
    }
    const capa =
      dom.window.document.querySelector('[data-modal], .modal__caja, .modal') ||
      dom.window.document.querySelector('#contactoDetalle')?.closest('div');
    if (!capa) {
      fallos += 1;
      console.log('  FALLA el modal de contacto no se abrió');
    } else {
      const lista = residuos(
        { createTreeWalker: dom.window.document.createTreeWalker.bind(dom.window.document), body: capa },
        dom.window,
      );
      const enlaces = capa.querySelectorAll('a[href]');
      const whatsapp = Array.prototype.filter.call(enlaces, (a) =>
        a.getAttribute('href').includes('wa.me'),
      )[0];
      const correo = Array.prototype.filter.call(enlaces, (a) =>
        a.getAttribute('href').startsWith('mailto:'),
      )[0];

      if (lista.length) {
        fallos += 1;
        console.log(`  FALLA quedan ${lista.length} residuos en el modal`);
        lista.slice(0, 8).forEach((r) => console.log('         ' + r));
      } else {
        console.log('  OK    textos del modal traducidos');
      }

      total += 1;
      if (!whatsapp || !/wa\.me\/\d{8,}/.test(whatsapp.getAttribute('href'))) {
        fallos += 1;
        console.log('  FALLA el enlace de WhatsApp perdió el número');
      } else if (!/[?&]text=/.test(whatsapp.getAttribute('href'))) {
        fallos += 1;
        console.log('  FALLA el enlace de WhatsApp perdió el mensaje');
      } else {
        console.log('  OK    enlace de WhatsApp con número y mensaje intactos');
      }

      total += 1;
      if (!correo || !/^mailto:[^@]+@[^@]+/.test(correo.getAttribute('href'))) {
        fallos += 1;
        console.log('  FALLA el enlace mailto quedó mal formado');
      } else {
        console.log('  OK    enlace mailto correcto');
      }
    }
  }
  dom.window.close();

  console.log('\n Recuperación de contraseña en inglés:');
  total += 1;
  const domRec = await abrir(PAGINAS[0], 'en');
  const enlace = domRec.window.document.getElementById('enlaceRecuperar');

  if (!enlace) {
    fallos += 1;
    console.log('  FALLA no aparece el enlace de recuperación');
  } else {
    if (enlace.textContent.trim() !== 'Forgot your password?') {
      fallos += 1;
      console.log(`  FALLA el enlace dice "${enlace.textContent.trim()}"`);
    } else {
      console.log('  OK    enlace traducido');
    }

    total += 1;
    enlace.click();
    await esperar(80);
    domRec.window.PortalI18n.cambiar('en');
    await esperar(40);

    const modalRec = domRec.window.document.querySelector(
      '.modal, [class*="modal"]',
    );
    const textoRec = modalRec ? modalRec.textContent : '';
    const faltan = ['Reset your password', 'Send code'].filter(
      (etiqueta) => !textoRec.includes(etiqueta),
    );
    const residuosRec = modalRec
      ? residuos(
          {
            createTreeWalker: domRec.window.document.createTreeWalker.bind(
              domRec.window.document,
            ),
            body: modalRec,
          },
          domRec.window,
        )
      : [];

    if (!modalRec || faltan.length || residuosRec.length) {
      fallos += 1;
      console.log(
        `  FALLA modal de recuperación: faltan ${faltan.join(', ')} | residuos ${residuosRec.length}`,
      );
      residuosRec.slice(0, 5).forEach((r) => console.log('         ' + r));
    } else {
      console.log('  OK    modal de recuperación en inglés');
    }
  }
  domRec.window.close();

  console.log('\n En español:');
  for (const pagina of PAGINAS) {
    total += 1;
    const ventana = await abrir(pagina, 'es');
    const enIngles = visibles(ventana.window.document, ventana.window)
      .filter(({ texto }) => !esDato(texto))
      .filter(({ texto }) =>
        /\b(the|your|account|balance|sign in|create account|security|help|services|channels|send|write|close)\b/i.test(
          texto,
        ),
      )
      .map(({ texto, etiqueta }) => `[${etiqueta}] ${texto.slice(0, 90)}`);
    if (enIngles.length) {
      fallos += 1;
      console.log(`  FALLA ${pagina.nombre} — ${enIngles.length} textos en inglés`);
      enIngles.slice(0, 8).forEach((r) => console.log('         ' + r));
    } else {
      console.log(`  OK    ${pagina.nombre}`);
    }
    ventana.window.close();
  }

  console.log('\n======================================================');
  if (fallos) {
    console.log(` RESULTADO: ${fallos} de ${total} comprobaciones con residuos`);
    console.log('======================================================');
    process.exitCode = 1;
    return;
  }
  console.log(` RESULTADO: ${total} comprobaciones sin residuos de idioma`);
  console.log('======================================================');
}

principal().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
