const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = __dirname;
const ORIGEN = 'http://localhost:5599';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const GUIONES_BASE = [
  'config.js',
  'js/traducciones.js',
  'js/i18n.js',
  'js/util.js',
  'js/accesibilidad.js',
  'js/api.js',
];

const GUIONES_VISTAS = [
  'js/vistas-cliente.js',
  'js/vistas-admin.js',
  'js/notificaciones.js',
  'js/asistente.js',
];

const ACENTOS = /[áéíóúÁÉÍÓÚñÑ¿¡]/;
const PALABRAS_ES = new RegExp(
  '\\b(' +
    [
      'de','del','la','el','los','las','una','unos','unas','para','con','sin',
      'por','que','su','sus','desde','hasta','entre','todos','todas','cada',
      'más','pero','como','cuando','donde','este','esta','estos','estas',
      'saldo','cuenta','cuentas','tarjeta','tarjetas','préstamo','préstamos',
      'movimientos','transferencia','transferencias','pago','pagos','aviso',
      'avisos','usuario','usuarios','banco','fecha','monto','estado','correo',
      'contraseña','solicitud','operación','operaciones','consultando',
      'seleccione','escriba','vigente','aprobado','rechazado','exitosa',
      'fallida','pendiente','buscar','eliminar','cerrar','salir','resumen',
      'perfil','reportes','auditoría','canal','origen','destino','titular',
    ].join('|') +
    ')\\b',
  'i',
);

const DATOS_PERMITIDOS = [
  'Banco ATM','Rodrigo Alcántara Vega','Ana Martínez Solís','María','José',
  'CFE','Telmex','Izzi','Totalplay','Clásica','Oro','Platino','Infinite',
  'ATM','WEB','APP','MXN','ES','EN','Español','English',
  'Pago de renta',
];

function esDatoReal(texto) {
  let t = texto.trim();
  for (const dato of DATOS_PERMITIDOS) {
    t = t.split(dato).join(' ');
  }
  t = t.trim();
  if (!t) return true;
  if (DATOS_PERMITIDOS.some((d) => t === d)) return true;
  if (/^[\d\s.,:$%*/·—+-]+$/.test(t)) return true;
  if (/^[\w.+-]+@[\w.-]+$/.test(t)) return true;
  if (/^https?:\/\//.test(t)) return true;
  if (/^\*{2,}/.test(t)) return true;
  if (/^[·\s]*(Mar|Jan|Feb|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(t)) return true;
  if (/^[A-Z]{2,}(_[A-Z]+)*$/.test(t)) return true;
  return false;
}

const FIXTURES = {
  miPerfil: {
    id: 'u1', nombreCompleto: 'Rodrigo Alcántara Vega',
    correo: 'rodrigo@example.com', telefono: '5512345678',
    rol: 'CLIENTE', correoVerificado: true, creadoEn: '2026-01-10T10:00:00.000Z',
  },
  cuenta: {
    id: 'c1', numeroCuenta: '1000000001', saldo: 15250.75,
    tipo: 'AHORRO', creadoEn: '2026-01-10T10:00:00.000Z', activa: true,
  },
  movimiento: {
    id: 'm1', folio: 'OP-2026-0001', fecha: '2026-03-15T12:00:00.000Z',
    tipo: 'PAGO_PRESTAMO', canal: 'WEB', estado: 'EXITOSA', monto: 500,
    saldoResultante: 15250.75, descripcion: 'Pago de renta',
    cuentaOrigen: '1000000001', cuentaDestino: '1000000002',
  },
  tarjeta: {
    id: 't1', numeroTarjeta: '**** **** **** 1234', tipo: 'CREDITO',
    estado: 'ACTIVA', motivoBloqueo: null, nombreNivel: 'Clásica',
    nivel: 'CLASICA', limiteCredito: 15000, creditoDisponible: 12000,
    intentosFallidos: 0, expiraEn: '2030-01-01',
  },
  prestamo: {
    id: 'p1', folio: 'PRE-2026-0007', monto: 10000, totalAPagar: 11200,
    plazoMeses: 12, tasaAnual: 12, pagoMensual: 933.33, pagoMinimo: 933.33,
    montoLiquidacion: 8500, pagosRealizados: 3, pagosRestantes: 9,
    estado: 'APROBADO', proximoPagoEn: '2026-09-01T00:00:00.000Z',
    creadoEn: '2026-02-01T00:00:00.000Z', motivo: null,
  },
  notificacion: {
    id: 'n1', titulo: 'Transferencia enviada',
    mensaje: 'Transferencia de $500.00 enviada a **** 0002. Saldo disponible: $15,250.75.',
    categoria: 'TRANSACCION', leida: false, creadoEn: '2026-03-15T12:00:00.000Z',
  },
};

function construirApi(ventana) {
  const ok = (v) => Promise.resolve(v);
  return {
    haySesion: () => true,
    obtenerBaseUrl: () => 'http://localhost:3000',
    obtenerSesion: () => ({
      usuarioId: 'u1', nombreCompleto: 'Rodrigo Alcántara Vega',
      correo: 'rodrigo@example.com', rol: 'CLIENTE', cuentaId: 'c1',
    }),
    definirManejadorSesionInvalida: () => {},
    cerrarSesion: () => ok({}),
    estadoServicio: () => ok({ status: 'ok', database: 'connected' }),
    miPerfil: () => ok(FIXTURES.miPerfil),
    estadoTotp: () =>
      ok({
        activo: false,
        configuracionPendiente: false,
        activadoEn: null,
        codigosDisponibles: 0,
      }),
    iniciarTotp: () =>
      ok({
        secreto: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        uri: 'otpauth://totp/Banco%20ATM:c%40example.test?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',
        qr: 'data:image/png;base64,iVBORw0KGgo=',
      }),
    confirmarTotp: () =>
      ok({ activo: true, codigosRecuperacion: ['A1B2C-D3E4F'] }),
    desactivarTotp: () => ok({ activo: false }),
    listarCuentas: () => ok([FIXTURES.cuenta]),
    consultarSaldo: () => ok({ numeroCuenta: '1000000001', saldo: 15250.75 }),
    resumenCuenta: () =>
      ok({
        cuenta: FIXTURES.cuenta,
        saldo: 15250.75,
        movimientos: [FIXTURES.movimiento],
        consultadoEn: '2026-03-16T12:00:00.000Z',
      }),
    consultarMovimientos: () => ok([FIXTURES.movimiento]),
    movimientosPorCuenta: () => ok([FIXTURES.movimiento]),
    consultarLimites: () =>
      ok({
        transferencia: { minimo: 1, maximo: 50000 },
        retiro: { minimo: 100, maximo: 9000, denominacion: 100 },
        deposito: { minimo: 100, maximo: 50000 },
      }),
    catalogoServicios: () =>
      ok([
        {
          id: 's1', codigo: 'CFE',
          nombre: 'Comision Federal de Electricidad', categoria: 'Energia',
          montoMinimo: 50, montoMaximo: 15000, longitudReferencia: 12,
        },
        {
          id: 's2', codigo: 'AGUA-MUN',
          nombre: 'Servicio Municipal de Agua', categoria: 'Agua',
          montoMinimo: 50, montoMaximo: 8000, longitudReferencia: 10,
        },
        {
          id: 's3', codigo: 'TELCOM',
          nombre: 'Telefonia e Internet Telcom',
          categoria: 'Telecomunicaciones',
          montoMinimo: 100, montoMaximo: 10000, longitudReferencia: 10,
        },
        {
          id: 's4', codigo: 'GAS-NAT',
          nombre: 'Gas Natural Regional', categoria: 'Gas',
          montoMinimo: 50, montoMaximo: 10000, longitudReferencia: 8,
        },
        {
          id: 's5', codigo: 'TV-CABLE',
          nombre: 'Television por Cable Vision', categoria: 'Entretenimiento',
          montoMinimo: 100, montoMaximo: 5000, longitudReferencia: 9,
        },
      ]),
    listarTarjetas: () => ok([FIXTURES.tarjeta]),
    detalleTarjeta: () =>
      ok({
        ...FIXTURES.tarjeta,
        numeroCompleto: '4000000000001234',
        cvv: '123',
        expiraEn: '2030-01-31',
        numeroCuenta: '1000000001',
        titular: 'Rodrigo Alcántara Vega',
      }),
    consultarTarjeta: () => ok(FIXTURES.tarjeta),
    catalogoCredito: () =>
      ok({
        saldoActual: 15250.75,
        nivelRecomendado: 'ORO',
        niveles: [
          {
            nivel: 'CLASICA', nombre: 'Clásica', saldoMinimo: 3000,
            lineaEstimada: 15000, tasaAnual: 40, anualidad: 0,
            recomendada: false, yaEmitida: true, color: 'acero',
            alcanzaRequisito: true, faltante: 0,
            beneficios: [
              'Sin anualidad el primer año',
              'Hasta 45 días sin intereses',
              'Seguro de protección de compras',
              'Consulta de movimientos en los tres canales',
            ],
          },
          {
            nivel: 'ORO', nombre: 'Oro', saldoMinimo: 15000,
            lineaEstimada: 30000, tasaAnual: 32, anualidad: 900,
            recomendada: true, yaEmitida: false, color: 'oro',
            alcanzaRequisito: true, faltante: 0,
            beneficios: [
              'Todo lo de la Clásica',
              '2 % de bonificación en supermercado y gasolina',
              'Seguro de viaje para el titular',
              'Meses sin intereses en comercios participantes',
            ],
          },
          {
            nivel: 'PLATINO', nombre: 'Platino', saldoMinimo: 50000,
            lineaEstimada: 125000, tasaAnual: 26, anualidad: 2400,
            recomendada: false, yaEmitida: false, color: 'platino',
            alcanzaRequisito: false, faltante: 34749.25,
            beneficios: [
              'Todo lo de la Oro',
              'Acceso a salas VIP de aeropuerto (4 visitas al año)',
              'Seguro de auto de renta y de equipaje',
              'Atención telefónica prioritaria las 24 horas',
            ],
          },
          {
            nivel: 'INFINITE', nombre: 'Infinite', saldoMinimo: 150000,
            lineaEstimada: 450000, tasaAnual: 20, anualidad: 6500,
            recomendada: false, yaEmitida: false, color: 'obsidiana',
            alcanzaRequisito: false, faltante: 134749.25,
            beneficios: [
              'Todo lo de la Platino',
              'Salas VIP ilimitadas para el titular y un acompañante',
              'Concierge personal y asistencia en viajes',
              'Programa de puntos con acumulación acelerada',
              'Seguro médico internacional',
            ],
          },
        ],
      }),
    condicionesPrestamo: () =>
      ok({
        elegible: true, motivos: [], montoMinimo: 1000, montoMaximo: 45000,
        tasaAnual: 12, saldoDisponible: 15250.75, nombrePerfil: 'Oro',
        tieneTarjetaCredito: true, color: 'oro',
        plazosDisponibles: [6, 12, 24],
        montosSugeridos: [5000, 10000, 20000, 45000],
      }),
    listarPrestamos: () => ok([FIXTURES.prestamo]),
    prestamosPendientes: () => ok([FIXTURES.prestamo]),
    consultarNotificaciones: () => ok([FIXTURES.notificacion]),
    resumenNotificaciones: () => ok({ total: 1, noLeidas: 1 }),
    marcarNotificacion: () => ok({}),
    adminUsuarios: () =>
      ok([
        {
          id: 'u1', nombreCompleto: 'Rodrigo Alcántara Vega',
          correo: 'rodrigo@example.com', rol: 'CLIENTE',
          correoVerificado: true, creadoEn: '2026-01-10T10:00:00.000Z',
          puedeEliminarse: true, cuenta: FIXTURES.cuenta,
        },
      ]),
    adminTarjetas: () =>
      ok([
        {
          ...FIXTURES.tarjeta,
          titular: 'Rodrigo Alcántara Vega',
          numeroCuenta: '1000000001',
        },
      ]),
    adminReporte: () =>
      ok({
        generadoEn: '2026-03-16T12:00:00.000Z',
        totales: {
          usuarios: 6, cuentas: 5, transaccionesAnalizadas: 14,
          exitosas: 12, fallidas: 2, montoOperado: 48500,
          tarjetasBloqueadas: 1, tarjetasEmitidas: 6,
        },
        porTipo: [{ tipo: 'TRANSFERENCIA', cantidad: 8, monto: 20000 }],
        porCanal: [{ canal: 'WEB', cantidad: 9 }],
        ultimasOperaciones: [FIXTURES.movimiento],
      }),
    adminAuditoria: () =>
      ok([
        {
          id: 'a1', accion: 'LOGIN', canal: 'WEB',
          usuario: 'rodrigo@example.com', descripcion: 'Inicio de sesión',
          creadoEn: '2026-03-16T12:00:00.000Z',
        },
      ]),
  };
}

async function abrir(idioma) {
  const html = fs.readFileSync(path.join(RAIZ, 'portal.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: ORIGEN + '/resumen',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: new VirtualConsole(),
    beforeParse(v) {
      v.fetch = () => Promise.reject(new Error('sin red'));
      v.Element.prototype.scrollIntoView = () => {};
      v.EventSource = function () {
        this.close = () => {};
      };
      v.localStorage.setItem('portal.idioma', idioma);
      v.localStorage.setItem('portal.token', 'token-de-prueba');
    },
  });

  for (const guion of GUIONES_BASE) {
    dom.window.eval(fs.readFileSync(path.join(RAIZ, guion), 'utf8'));
  }

  dom.window.PortalApi = construirApi(dom.window);

  for (const guion of GUIONES_VISTAS) {
    dom.window.eval(fs.readFileSync(path.join(RAIZ, guion), 'utf8'));
  }

  dom.window.PortalI18n.cambiar(idioma);
  await esperar(30);
  return dom;
}

function textosVisibles(documento) {
  const salida = [];
  const recorrido = documento.createTreeWalker(
    documento.body,
    documento.defaultView.NodeFilter.SHOW_TEXT,
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

  const atributos = ['placeholder', 'title', 'aria-label', 'alt'];
  const elementos = documento.body.querySelectorAll('*');
  for (const elemento of elementos) {
    for (const atributo of atributos) {
      const valor = elemento.getAttribute(atributo);
      if (valor && valor.trim()) {
        salida.push({ texto: valor.trim(), etiqueta: atributo });
      }
    }
  }
  return salida;
}

function residuosEspanoles(documento) {
  return textosVisibles(documento)
    .filter(({ texto }) => !esDatoReal(texto))
    .filter(({ texto }) => ACENTOS.test(texto) || PALABRAS_ES.test(texto))
    .map(({ texto, etiqueta }) => `[${etiqueta}] ${texto.slice(0, 90)}`);
}

async function renderizarVista(dom, clave) {
  const vista = dom.window.PortalVistas[clave];
  if (!vista) {
    throw new Error('vista inexistente: ' + clave);
  }
  const contenedor = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(contenedor);

  const contexto = {
    mostrarCarga: () => {},
    recargar: () => {},
    irA: () => {},
    sesion: dom.window.PortalApi.obtenerSesion(),
  };

  let fallo = null;
  await Promise.resolve(vista.render(contenedor, contexto)).catch((error) => {
    fallo = error;
  });
  await esperar(20);
  if (fallo) {
    throw new Error('render falló: ' + fallo.message);
  }
  if (contenedor.querySelector('.vacio[data-i18n-original^="Consultando"]')) {
    throw new Error('la vista quedó en estado de carga');
  }
  dom.window.PortalI18n.traducirArbol(contenedor);
  await esperar(10);
  return contenedor;
}

const VISTAS = [
  'resumen', 'cuentas', 'movimientos', 'transferencias', 'pagos',
  'tarjetas', 'prestamos', 'avisos', 'perfil',
  'admin', 'admin/usuarios', 'admin/tarjetas', 'admin/reportes',
  'admin/auditoria',
];

async function principal() {
  console.log('======================================================');
  console.log(' i18n — Portal web (español / inglés)');
  console.log('======================================================\n');

  let fallos = 0;
  let comprobaciones = 0;

  const dom = await abrir('en');

  console.log(' Vistas renderizadas en inglés:');
  for (const clave of VISTAS) {
    comprobaciones += 1;
    let contenedor;
    try {
      contenedor = await renderizarVista(dom, clave);
    } catch (error) {
      fallos += 1;
      console.log(`  FALLA ${clave} — ${error.message}`);
      continue;
    }

    const documento = dom.window.document;
    const previos = documento.body.innerHTML;
    const residuos = textosVisibles({
      createTreeWalker: documento.createTreeWalker.bind(documento),
      body: contenedor,
      defaultView: dom.window,
    })
      .filter(({ texto }) => !esDatoReal(texto))
      .filter(({ texto }) => ACENTOS.test(texto) || PALABRAS_ES.test(texto))
      .map(({ texto, etiqueta }) => `[${etiqueta}] ${texto.slice(0, 90)}`);

    if (residuos.length) {
      fallos += 1;
      console.log(`  FALLA ${clave} — ${residuos.length} residuos en español`);
      residuos.slice(0, 6).forEach((r) => console.log('         ' + r));
    } else {
      console.log(`  OK    ${clave}`);
    }
    void previos;
    contenedor.remove();
  }

  console.log('\n Interfaz global en inglés:');
  comprobaciones += 1;
  const globales = residuosEspanoles(dom.window.document);
  if (globales.length) {
    fallos += 1;
    console.log(`  FALLA navegación y cabecera — ${globales.length} residuos`);
    globales.slice(0, 10).forEach((r) => console.log('         ' + r));
  } else {
    console.log('  OK    navegación, cabecera y pie');
  }

  console.log('\n Formatos por locale:');
  comprobaciones += 1;
  const monedaEn = dom.window.PortalI18n.formatoMoneda(1234.5);
  dom.window.PortalI18n.cambiar('es');
  await esperar(20);
  const monedaEs = dom.window.PortalI18n.formatoMoneda(1234.5);
  if (monedaEn === monedaEs) {
    fallos += 1;
    console.log(`  FALLA la moneda no cambia con el locale (${monedaEn})`);
  } else {
    console.log(`  OK    moneda en=${monedaEn} · es=${monedaEs}`);
  }

  console.log('\n Regreso a español sin residuos en inglés:');
  comprobaciones += 1;
  const enIngles = textosVisibles(dom.window.document)
    .filter(({ texto }) => !esDatoReal(texto))
    .filter(({ texto }) =>
      /\b(the|your|account|balance|transfer|sign out|dashboard|settings|search|delete|summary|loans|cards|payments|users|reports)\b/i.test(
        texto,
      ),
    )
    .map(({ texto, etiqueta }) => `[${etiqueta}] ${texto.slice(0, 90)}`);
  if (enIngles.length) {
    fallos += 1;
    console.log(`  FALLA quedan ${enIngles.length} textos en inglés`);
    enIngles.slice(0, 10).forEach((r) => console.log('         ' + r));
  } else {
    console.log('  OK    la interfaz vuelve completamente al español');
  }

  console.log('\n Valores del backend traducidos:');
  comprobaciones += 1;
  dom.window.PortalI18n.cambiar('en');
  await esperar(20);
  const VALORES_BACKEND = [
    'EXITOSA', 'FALLIDA', 'PENDIENTE', 'APROBADO', 'RECHAZADO', 'LIQUIDADO',
    'ACTIVA', 'BLOQUEADA', 'INACTIVA', 'CLIENTE', 'ADMINISTRADOR',
    'DEBITO', 'CREDITO', 'RETIRO', 'DEPOSITO', 'TRANSFERENCIA',
    'PAGO_SERVICIO', 'PRESTAMO', 'PAGO_PRESTAMO', 'INTENTOS_FALLIDOS',
    'Clásica', 'Oro', 'Platino',
    'Comision Federal de Electricidad', 'Servicio Municipal de Agua',
    'Telefonia e Internet Telcom', 'Gas Natural Regional',
    'Television por Cable Vision',
    'Energia', 'Agua', 'Telecomunicaciones', 'Entretenimiento',
    'Sin anualidad el primer año', 'Hasta 45 días sin intereses',
    'Seguro de protección de compras',
    'Consulta de movimientos en los tres canales',
    'Todo lo de la Clásica', 'Todo lo de la Oro', 'Todo lo de la Platino',
    'Seguro de viaje para el titular', 'Seguro médico internacional',
    'Concierge personal y asistencia en viajes',
    'Descargar CSV', 'Consultar', 'Quitar filtros', 'Comprobante',
    'LOGIN_EXITOSO', 'LOGIN_FALLIDO', 'CIERRE_SESION', 'RETIRO_EXITOSO',
    'DEPOSITO_EXITOSO', 'TRANSFERENCIA_EXITOSA', 'PAGO_SERVICIO_EXITOSO',
    'PRESTAMO_APROBADO', 'PRESTAMO_RECHAZADO', 'CAMBIO_PIN_EXITOSO',
    'CORREO_VERIFICADO', 'REGISTRO_SOLICITADO', 'VERIFICACION_FALLIDA',
    'TARJETA_BLOQUEADA_POR_CLIENTE', 'TARJETA_CREDITO_APROBADA',
    'ESTADO_TARJETA_ACTUALIZADO_POR_ADMIN', 'CLIENTE_CREADO_POR_ADMIN',
    'USUARIO_ELIMINADO', 'ROL_USUARIO_MODIFICADO', 'LOGIN_ATM_EXITOSO',
    'CUENTA_ABIERTA_AUTOMATICAMENTE',
  ];
  const sinTraducir = VALORES_BACKEND.filter(
    (valor) => dom.window.PortalI18n.t(valor) === valor,
  );
  if (sinTraducir.length) {
    fallos += 1;
    console.log(`  FALLA ${sinTraducir.length} valores del backend sin traducir`);
    sinTraducir.slice(0, 12).forEach((v) => console.log('         ' + v));
  } else {
    console.log(`  OK    ${VALORES_BACKEND.length} enums, catálogos y beneficios traducidos`);
  }

  console.log('\n Modal de detalle de tarjeta en inglés:');
  comprobaciones += 1;
  dom.window.PortalI18n.cambiar('en');
  await esperar(20);
  const contenedorTarjetas = await renderizarVista(dom, 'tarjetas');
  const plastico = contenedorTarjetas.querySelector('[data-detalle-tarjeta]');

  if (!plastico) {
    fallos += 1;
    console.log('  FALLA la tarjeta no es seleccionable');
  } else {
    plastico.click();
    await esperar(80);
    dom.window.PortalI18n.traducirArbol(dom.window.document);
    await esperar(20);

    const modal = dom.window.document.querySelector('.modal, [class*="modal"]');
    if (!modal) {
      fallos += 1;
      console.log('  FALLA el modal de detalle no se abrió');
    } else {
      const residuos = textosVisibles({
        createTreeWalker: dom.window.document.createTreeWalker.bind(
          dom.window.document,
        ),
        body: modal,
        defaultView: dom.window,
      })
        .filter(({ texto }) => !esDatoReal(texto))
        .filter(({ texto }) => ACENTOS.test(texto) || PALABRAS_ES.test(texto))
        .map(({ texto, etiqueta }) => `[${etiqueta}] ${texto.slice(0, 90)}`);

      const html = modal.textContent;
      const faltantes = [
        'Full number',
        'CVV',
        'Expiry date',
        'Issue date',
      ].filter((etiqueta) => !html.includes(etiqueta));

      if (residuos.length || faltantes.length) {
        fallos += 1;
        console.log(
          `  FALLA ${residuos.length} residuos, ${faltantes.length} etiquetas sin traducir`,
        );
        residuos.slice(0, 6).forEach((r) => console.log('         ' + r));
        faltantes.forEach((f) => console.log('         falta: ' + f));
      } else {
        console.log('  OK    número, CVV, expiración y emisión en inglés');
      }

      comprobaciones += 1;
      if (modal.textContent.includes('4000000000001234')) {
        fallos += 1;
        console.log('  FALLA el número completo se muestra sin ocultar');
      } else {
        console.log('  OK    los datos sensibles llegan ocultos por defecto');
      }
    }
  }
  contenedorTarjetas.remove();

  console.log('\n Verificación en dos pasos en inglés:');
  comprobaciones += 1;
  dom.window.PortalI18n.cambiar('en');
  await esperar(20);
  const contenedorPerfil2 = await renderizarVista(dom, 'perfil');
  await esperar(60);
  dom.window.PortalI18n.traducirArbol(contenedorPerfil2);

  const zonaTotp = contenedorPerfil2.querySelector('#zonaSegundoFactor');
  if (!zonaTotp || !zonaTotp.textContent.trim()) {
    fallos += 1;
    console.log('  FALLA no se pintó la sección de segundo factor');
  } else {
    const residuosTotp = textosVisibles({
      createTreeWalker: dom.window.document.createTreeWalker.bind(
        dom.window.document,
      ),
      body: zonaTotp,
      defaultView: dom.window,
    })
      .filter(({ texto }) => !esDatoReal(texto))
      .filter(({ texto }) => ACENTOS.test(texto) || PALABRAS_ES.test(texto))
      .map(({ texto, etiqueta }) => `[${etiqueta}] ${texto.slice(0, 90)}`);

    const esperados = ['Two-step verification', 'Enable two-step verification'];
    const faltantes = esperados.filter(
      (etiqueta) => !zonaTotp.textContent.includes(etiqueta),
    );

    if (residuosTotp.length || faltantes.length) {
      fallos += 1;
      console.log(
        `  FALLA ${residuosTotp.length} residuos, ${faltantes.length} etiquetas sin traducir`,
      );
      residuosTotp.slice(0, 6).forEach((r) => console.log('         ' + r));
      faltantes.forEach((f) => console.log('         falta: ' + f));
    } else {
      console.log('  OK    sección de segundo factor en inglés');
    }

    comprobaciones += 1;
    const boton = zonaTotp.querySelector('#botonActivarTotp');
    if (!boton) {
      fallos += 1;
      console.log('  FALLA no aparece el botón de activación');
    } else {
      boton.click();
      await esperar(80);
      dom.window.PortalI18n.traducirArbol(dom.window.document);
      await esperar(20);

      const modalTotp = dom.window.document.querySelector('.modal, [class*="modal"]');
      const textoModal = modalTotp ? modalTotp.textContent : '';
      const faltanModal = [
        'Set up the authenticator app',
        'Secret',
        'Verification code',
        'Confirm and enable',
      ].filter((etiqueta) => !textoModal.includes(etiqueta));

      if (!modalTotp || faltanModal.length) {
        fallos += 1;
        console.log(`  FALLA el modal de configuración: ${faltanModal.join(', ')}`);
      } else {
        console.log('  OK    modal de configuración TOTP en inglés');
      }
    }
  }
  contenedorPerfil2.remove();

  console.log('\n Datos reales conservados:');
  comprobaciones += 1;
  dom.window.PortalI18n.cambiar('en');
  const contenedorPerfil = await renderizarVista(dom, 'perfil');
  const html = contenedorPerfil.innerHTML;
  const conservados = ['Rodrigo Alcántara Vega', 'rodrigo@example.com'].filter(
    (d) => html.includes(d),
  );
  if (conservados.length !== 2) {
    fallos += 1;
    console.log('  FALLA se tradujeron datos reales del usuario');
  } else {
    console.log('  OK    nombre y correo del titular intactos');
  }
  contenedorPerfil.remove();

  console.log('\n======================================================');
  if (fallos) {
    console.log(` RESULTADO: ${fallos} de ${comprobaciones} comprobaciones con residuos`);
    console.log('======================================================');
    process.exitCode = 1;
    return;
  }
  console.log(` RESULTADO: ${comprobaciones} comprobaciones sin residuos de idioma`);
  console.log('======================================================');
}

principal().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
