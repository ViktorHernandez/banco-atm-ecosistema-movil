const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..', 'atm-client');
const ORIGEN = process.env.ATM_URL || 'http://localhost:5599';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const ACENTOS = /[áéíóúñ¿¡]/i;

const GUIONES = ['config.js', 'js/i18n.js', 'js/api.js', 'js/app.js'];

async function abrir(idioma) {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: ORIGEN + '/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
    beforeParse(v) {
      v.fetch = () => Promise.reject(new Error('sin red'));
      v.Element.prototype.scrollIntoView = () => {};
      if (idioma) {
        v.localStorage.setItem('atm.idioma', idioma);
      }
    },
  });

  for (const guion of GUIONES) {
    dom.window.eval(fs.readFileSync(path.join(RAIZ, guion), 'utf8'));
  }

  await esperar(300);
  return dom;
}

function textoDe(documento, selector) {
  const nodo = documento.querySelector(selector);
  return nodo ? nodo.textContent.trim() : null;
}

const comprobaciones = [];

function comprobar(nombre, condicion, detalle) {
  comprobaciones.push({ nombre, ok: Boolean(condicion), detalle });
}

(async () => {
  console.log('======================================================');
  console.log(' INTERNACIONALIZACIÓN DEL CAJERO — ES / EN');
  console.log('======================================================');

  const domEs = await abrir('es');
  const docEs = domEs.window.document;

  comprobar(
    'El módulo i18n se carga',
    typeof domEs.window.AtmI18n === 'object' && domEs.window.AtmI18n !== null,
  );
  comprobar('lang del documento es "es"', docEs.documentElement.lang === 'es');
  comprobar(
    'Título de bienvenida en español',
    textoDe(docEs, '[data-pantalla="inicio"] .pantalla__titulo') === 'Bienvenido',
  );
  comprobar(
    'Selector de idioma montado',
    docEs.querySelectorAll('[data-idioma-opcion]').length === 2,
  );
  comprobar(
    'Enlace de salto presente',
    docEs.querySelector('.salto-contenido') !== null,
  );
  comprobar(
    'Región de anuncios presente',
    docEs.querySelector('#anuncioCajero[aria-live]') !== null,
  );
  comprobar(
    'Sin role="application" en el contenedor',
    docEs.querySelector('.cajero[role="application"]') === null,
  );
  comprobar(
    'Cada pantalla es una región',
    docEs.querySelectorAll('.pantalla[role="region"]').length >= 10,
  );
  comprobar(
    'Moneda con formato es-MX',
    domEs.window.AtmI18n.moneda(1234.5).includes('1,234.50'),
  );

  domEs.window.close();

  const domEn = await abrir('en');
  const docEn = domEn.window.document;

  comprobar('lang del documento es "en"', docEn.documentElement.lang === 'en');
  comprobar(
    'Título de bienvenida traducido',
    textoDe(docEn, '[data-pantalla="inicio"] .pantalla__titulo') === 'Welcome',
  );
  comprobar(
    'Botón de tarjeta traducido',
    textoDe(docEn, '[data-accion="insertar-tarjeta"]') === 'Insert card',
  );
  comprobar(
    'Menú principal traducido',
    textoDe(docEn, '[data-pantalla="menu"] .pantalla__titulo') === 'Main menu',
  );
  comprobar(
    'Opción de menú traducida',
    textoDe(docEn, '[data-ir="saldo"]') === 'Check balance',
  );
  comprobar(
    'Texto de carga traducido',
    textoDe(docEn, '#textoCarga') === 'Processing operation...',
  );
  comprobar(
    'Teclas de acción traducidas',
    Array.prototype.slice
      .call(docEn.querySelectorAll('[data-teclado="pin"] .tecla'))
      .some((tecla) => tecla.textContent.trim() === 'Delete'),
  );
  comprobar(
    'Moneda con formato en-US',
    domEn.window.AtmI18n.moneda(1234.5).includes('1,234.50'),
  );
  comprobar(
    'Plantilla con interpolación traducida',
    domEn.window.AtmI18n.frase('Sesión de {titular} · Cuenta {cuenta}', {
      titular: 'Ana Ruiz',
      cuenta: '1000000001',
    }) === 'Session of Ana Ruiz · Account 1000000001',
  );

  const cuerpoEn = docEn.body.textContent
    .replace(/Banco ATM/g, ' ')
    .replace(/ATM-001/g, ' ');
  const lineasEspanolas = cuerpoEn
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 3 && ACENTOS.test(linea));

  comprobar(
    'Sin texto en español al cambiar a inglés',
    lineasEspanolas.length === 0,
    lineasEspanolas.slice(0, 5).join(' | '),
  );

  const selectorEn = docEn.querySelector('[data-idioma-opcion="es"]');
  selectorEn.dispatchEvent(new domEn.window.Event('click', { bubbles: true }));
  await esperar(300);

  comprobar(
    'Cambio de idioma en caliente vuelve a español',
    textoDe(docEn, '[data-pantalla="inicio"] .pantalla__titulo') === 'Bienvenido',
  );
  comprobar(
    'lang se actualiza al cambiar en caliente',
    docEn.documentElement.lang === 'es',
  );

  domEn.window.close();

  let fallos = 0;
  for (const c of comprobaciones) {
    if (c.ok) {
      console.log(`  OK    ${c.nombre}`);
    } else {
      fallos += 1;
      console.log(`  FALLA ${c.nombre}${c.detalle ? ' · ' + c.detalle : ''}`);
    }
  }

  console.log('');
  console.log('======================================================');
  console.log(
    ` RESULTADO: ${comprobaciones.length - fallos}/${comprobaciones.length} comprobaciones correctas`,
  );
  console.log('======================================================');
  process.exit(fallos === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
