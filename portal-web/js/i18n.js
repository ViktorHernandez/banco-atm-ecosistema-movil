(function () {
  'use strict';

  var CLAVE = 'portal.idioma';

  var IDIOMAS = [
    {
      codigo: 'es',
      nombre: 'Español',
      nombrePropio: 'Español',
      region: 'es-MX',
      moneda: 'MXN',
      bandera: 'ES',
    },
    {
      codigo: 'en',
      nombre: 'Inglés',
      nombrePropio: 'English',
      region: 'en-US',
      moneda: 'MXN',
      bandera: 'EN',
    },
  ];

  var POR_DEFECTO = 'es';

  var PATRONES = [
    [/^Movimientos de (.+)$/, 'Transactions of $1'],
    [/^Cambiar perfil de (.+)$/, 'Change profile of $1'],
    [/^Su tarjeta (.+) fue bloqueada a solicitud suya\.$/, 'Your card $1 was blocked at your request.'],
    [/^Enviamos un código de 6 dígitos a (.+?)\. El código vence en 30 minutos\.$/,
      'We sent a 6-digit code to $1. The code expires in 30 minutes.'],
    [/^(\d+) de (\d+)$/, '$1 of $2'],
    [/^(\d+) sin leer$/, '$1 unread'],
    [/^de (\d+) emitidas$/, 'of $1 issued'],
    [/^Cuenta abierta el (.+)$/, 'Account opened on $1'],
    [/^Abierta el (.+)$/, 'Opened on $1'],
    [/^Consultado el (.+)$/, 'Checked on $1'],
    [/^Analizamos las (\d+) operaciones más recientes del banco\.$/,
      'We analyze the {n} most recent bank operations.'.replace('{n}', '$1')],
    [/^Monto a pagar del préstamo (.+)$/, 'Payment amount for loan $1'],
    [/^Avance del préstamo (.+)$/, 'Progress of loan $1'],
    [/^(\d+) vigentes$/, '$1 active'],
    [/^(\d+) pendientes$/, '$1 pending'],
    [/^(\d+) meses$/, '$1 months'],
    [/^(\d+) %$/, '$1 %'],
    [/^(\d+) % pagado · quedan (\d+) pagos$/, '$1 % paid · $2 payments left'],
    [/^Quedan (\d+) pagos$/, '$1 payments left'],
    [/^Vence el (.+) · quedan (\d+) pagos$/, 'Due on $1 · $2 payments left'],
    [/^Vence el (.+) · quedan (\d+) pagos · liquidar: (.+)$/,
      'Due on $1 · $2 payments left · settle: $3'],
    [/^Mínimo (.+) · Máximo (.+)$/, 'Minimum $1 · Maximum $2'],
    [/^Entre ([^.]+) y ([^.]+)$/, 'Between $1 and $2'],
    [/^Monto entre (.+) y (.+) · referencia de (\d+) caracteres\.$/,
      'Amount between $1 and $2 · reference of $3 characters.'],
    [/^Pago mínimo: (.+)$/, 'Minimum payment: $1'],
    [/^Liquidar: (.+)$/, 'Settle: $1'],
    [/^Crédito · (.+)$/, 'Credit · $1'],
    [/^Depósito de (.+) acreditado\. Saldo disponible: (.+)\.$/,
      'Deposit of $1 credited. Available balance: $2.'],
    [/^Retiro de (.+) realizado en (.+)\. Saldo disponible: (.+)\.$/,
      'Withdrawal of $1 made at $2. Available balance: $3.'],
    [/^Transferencia de (.+) enviada a (.+)\. Saldo disponible: (.+)\.$/,
      'Transfer of $1 sent to $2. Available balance: $3.'],
    [/^Recibió una transferencia de (.+) desde (.+)\.$/,
      'You received a transfer of $1 from $2.'],
    [/^Pago de (.+) a (.+) aplicado\. Saldo disponible: (.+)\.$/,
      'Payment of $1 to $2 applied. Available balance: $3.'],
    [/^Su cuenta (.+) quedó abierta y su tarjeta de débito fue emitida\.$/,
      'Your account $1 was opened and your debit card was issued.'],
    [/^Su préstamo por (.+) a (.+) meses fue aprobado y depositado en su cuenta\. Pago mensual: (.+)\.$/,
      'Your loan of $1 over $2 months was approved and deposited into your account. Monthly payment: $3.'],
    [/^Su solicitud de préstamo por (.+) fue rechazada\. (.*)$/,
      'Your loan request for $1 was declined. $2'],
    [/^Su solicitud de tarjeta de crédito (.+) fue aprobada\. Línea autorizada: (.+)\.$/,
      'Your $1 credit card request was approved. Authorized line: $2.'],
    [/^Su solicitud de tarjeta de crédito (.+) fue rechazada por liquidez insuficiente\. Requiere un saldo mínimo de (.+) y le faltan (.+)\.$/,
      'Your $1 credit card request was declined for insufficient liquidity. It requires a minimum balance of $2 and you are short by $3.'],
    [/^Su tarjeta (.+) fue desbloqueada correctamente\.$/,
      'Your card $1 was unblocked successfully.'],
    [/^El estado de su tarjeta (.+) fue actualizado a (.+) por el banco\.$/,
      'The status of your card $1 was updated to $2 by the bank.'],
    [/^Retiro de (.+) realizado en (.+)\. Saldo disponible: (.+)\.$/,
      'Withdrawal of $1 made at $2. Available balance: $3.'],
    [/^Depósito de (.+) acreditado\. Saldo disponible: (.+)\.$/,
      'Deposit of $1 credited. Available balance: $2.'],
    [/^Transferencia de (.+) enviada a (.+)\. Saldo disponible: (.+)\.$/,
      'Transfer of $1 sent to $2. Available balance: $3.'],
    [/^Recibió una transferencia de (.+) desde (.+)\.$/,
      'You received a transfer of $1 from $2.'],
    [/^Pago de (.+) a (.+) aplicado\. Saldo disponible: (.+)\.$/,
      'Payment of $1 to $2 applied. Available balance: $3.'],
    [/^Su cuenta (.+) quedó abierta y su tarjeta de débito fue emitida\.$/,
      'Your account $1 has been opened and your debit card was issued.'],
    [/^Su préstamo por (.+) a (.+) meses fue aprobado y depositado en su cuenta\. Pago mensual: (.+)\.$/,
      'Your loan of $1 over $2 months was approved and deposited into your account. Monthly payment: $3.'],
    [/^Su solicitud de préstamo por (.+) fue rechazada\. (.+)$/,
      'Your loan application for $1 was declined. $2'],
    [/^Su solicitud de tarjeta de crédito (.+) fue aprobada\. Línea autorizada: (.+)\.$/,
      'Your $1 credit card application was approved. Authorized line: $2.'],
    [/^Su solicitud de tarjeta de crédito (.+) fue rechazada por liquidez insuficiente\. Requiere un saldo mínimo de (.+) y le faltan (.+)\.$/,
      'Your $1 credit card application was declined due to insufficient funds. A minimum balance of $2 is required and you are short by $3.'],
    [/^Su tarjeta (.+) fue desbloqueada correctamente\.$/,
      'Your card $1 was unblocked successfully.'],
    [/^El estado de su tarjeta (.+) fue actualizado a (.+) por el banco\.$/,
      'The status of your card $1 was updated to $2 by the bank.'],
  ];

  var estado = {
    codigo: POR_DEFECTO,
    diccionario: {},
  };

  function definicion(codigo) {
    return (
      IDIOMAS.filter(function (item) {
        return item.codigo === codigo;
      })[0] || IDIOMAS[0]
    );
  }

  function leerGuardado() {
    try {
      return window.localStorage.getItem(CLAVE);
    } catch (error) {
      return null;
    }
  }

  function guardar(codigo) {
    try {
      window.localStorage.setItem(CLAVE, codigo);
    } catch (error) {
      return;
    }
  }

  function detectar() {
    var guardado = leerGuardado();
    if (guardado && definicion(guardado).codigo === guardado) {
      return guardado;
    }

    var candidatos = [];
    if (window.navigator.languages && window.navigator.languages.length) {
      candidatos = Array.prototype.slice.call(window.navigator.languages);
    } else if (window.navigator.language) {
      candidatos = [window.navigator.language];
    }

    for (var i = 0; i < candidatos.length; i += 1) {
      var base = String(candidatos[i]).toLowerCase().split('-')[0];
      var encontrado = IDIOMAS.filter(function (item) {
        return item.codigo === base;
      })[0];
      if (encontrado) {
        return encontrado.codigo;
      }
    }

    return POR_DEFECTO;
  }

  function traducirTexto(texto) {
    if (estado.codigo === POR_DEFECTO) {
      return texto;
    }

    var original = String(texto);
    var limpio = original.trim().replace(/\s+/g, ' ');
    if (!limpio) {
      return texto;
    }

    var prefijo = original.slice(0, original.length - original.replace(/^\s+/, '').length);
    var sufijo = original.slice(original.replace(/\s+$/, '').length);

    var directo = estado.diccionario[limpio];
    if (directo) {
      return prefijo + directo + sufijo;
    }

    for (var i = 0; i < PATRONES.length; i += 1) {
      if (PATRONES[i][0].test(limpio)) {
        return prefijo + limpio.replace(PATRONES[i][0], PATRONES[i][1]) + sufijo;
      }
    }

    return texto;
  }

  var ATRIBUTOS = ['placeholder', 'title', 'aria-label', 'alt', 'value'];

  function traducirElemento(elemento) {
    ATRIBUTOS.forEach(function (atributo) {
      if (!elemento.hasAttribute || !elemento.hasAttribute(atributo)) {
        return;
      }
      if (atributo === 'value') {
        var tipo = (elemento.getAttribute('type') || '').toLowerCase();
        if (tipo !== 'submit' && tipo !== 'button' && tipo !== 'reset') {
          return;
        }
      }
      var original =
        elemento.getAttribute('data-i18n-' + atributo) ||
        elemento.getAttribute(atributo);
      if (!elemento.getAttribute('data-i18n-' + atributo)) {
        elemento.setAttribute('data-i18n-' + atributo, original);
      }
      elemento.setAttribute(atributo, traducirTexto(original));
    });
  }

  function traducirArbol(raiz) {
    var destino = raiz || document.body;
    if (!destino) {
      return;
    }

    if (destino.nodeType === 1) {
      traducirElemento(destino);
      var elementos = destino.querySelectorAll('*');
      for (var i = 0; i < elementos.length; i += 1) {
        traducirElemento(elementos[i]);
      }
    }

    var recorrido = document.createTreeWalker(
      destino,
      window.NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (nodo) {
          var padre = nodo.parentNode;
          if (!padre) {
            return window.NodeFilter.FILTER_REJECT;
          }
          var etiqueta = padre.nodeName;
          if (etiqueta === 'SCRIPT' || etiqueta === 'STYLE') {
            return window.NodeFilter.FILTER_REJECT;
          }
          if (!nodo.nodeValue || !nodo.nodeValue.trim()) {
            return window.NodeFilter.FILTER_REJECT;
          }
          return window.NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    var pendientes = [];
    var actual = recorrido.nextNode();
    while (actual) {
      pendientes.push(actual);
      actual = recorrido.nextNode();
    }

    pendientes.forEach(function (nodo) {
      var padre = nodo.parentNode;
      if (!padre.getAttribute) {
        return;
      }
      var original = padre.getAttribute('data-i18n-original');
      if (original === null && padre.childNodes.length === 1) {
        padre.setAttribute('data-i18n-original', nodo.nodeValue);
        original = nodo.nodeValue;
      }
      var base = original !== null ? original : nodo.nodeValue;
      var traducido = traducirTexto(base);
      if (traducido !== nodo.nodeValue) {
        nodo.nodeValue = traducido;
      }
    });
  }

  function region() {
    return definicion(estado.codigo).region;
  }

  function monedaActual() {
    return definicion(estado.codigo).moneda;
  }

  function formatoMoneda(valor) {
    var numero = Number(valor);
    if (isNaN(numero)) {
      return '—';
    }
    return numero.toLocaleString(region(), {
      style: 'currency',
      currency: monedaActual(),
      minimumFractionDigits: 2,
    });
  }

  function formatoNumero(valor) {
    var numero = Number(valor);
    return isNaN(numero) ? '—' : numero.toLocaleString(region());
  }

  function formatoFecha(valor) {
    if (!valor) {
      return '—';
    }
    var f = new Date(valor);
    if (isNaN(f.getTime())) {
      return String(valor);
    }
    return f.toLocaleDateString(region(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatoFechaHora(valor) {
    if (!valor) {
      return '—';
    }
    var f = new Date(valor);
    if (isNaN(f.getTime())) {
      return String(valor);
    }
    return f.toLocaleString(region(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function aplicar(codigo, opciones) {
    var ajustes = opciones || {};
    var elegido = definicion(codigo).codigo;

    estado.codigo = elegido;
    estado.diccionario =
      elegido === POR_DEFECTO
        ? {}
        : (window.PortalTraducciones && window.PortalTraducciones[elegido]) || {};

    document.documentElement.setAttribute('lang', elegido);
    document.documentElement.setAttribute('data-idioma', elegido);

    if (ajustes.guardar !== false) {
      guardar(elegido);
    }

    traducirArbol(document.body);
    actualizarSelector();

    document.dispatchEvent(
      new CustomEvent('idiomacambiado', { detail: { idioma: elegido } }),
    );
  }

  function cambiar(codigo) {
    aplicar(codigo);
  }

  function actualizarSelector() {
    var botones = document.querySelectorAll('[data-idioma-opcion]');
    for (var i = 0; i < botones.length; i += 1) {
      var boton = botones[i];
      var suyo = boton.getAttribute('data-idioma-opcion');
      var activo = suyo === estado.codigo;
      boton.setAttribute('aria-pressed', activo ? 'true' : 'false');
      boton.classList.toggle('activa', activo);
    }
  }

  function montarSelector(destino) {
    if (!destino || destino.querySelector('[data-selector-idioma]')) {
      return;
    }

    var grupo = document.createElement('div');
    grupo.className = 'selector-idioma';
    grupo.setAttribute('data-selector-idioma', 'true');
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('aria-label', traducirTexto('Cambiar idioma'));

    IDIOMAS.forEach(function (idioma) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'selector-idioma__opcion';
      boton.setAttribute('data-idioma-opcion', idioma.codigo);
      boton.setAttribute('lang', idioma.codigo);
      boton.setAttribute('aria-label', idioma.nombrePropio);
      boton.textContent = idioma.bandera;
      boton.addEventListener('click', function () {
        if (estado.codigo === idioma.codigo) {
          return;
        }
        cambiar(idioma.codigo);
        if (window.PortalUtil && window.PortalUtil.avisar) {
          window.PortalUtil.avisar(
            idioma.codigo === 'es'
              ? 'Idioma cambiado a Español.'
              : 'Language changed to English.',
            'exito',
          );
        }
      });
      grupo.appendChild(boton);
    });

    destino.insertBefore(grupo, destino.firstChild);
    actualizarSelector();
  }

  function observar() {
    if (!window.MutationObserver) {
      return;
    }

    var observador = new window.MutationObserver(function (cambios) {
      if (estado.codigo === POR_DEFECTO) {
        return;
      }
      cambios.forEach(function (cambio) {
        for (var i = 0; i < cambio.addedNodes.length; i += 1) {
          var nodo = cambio.addedNodes[i];
          if (nodo.nodeType === 1) {
            traducirArbol(nodo);
          } else if (nodo.nodeType === 3 && nodo.parentNode) {
            traducirArbol(nodo.parentNode);
          }
        }
      });
    });

    observador.observe(document.body, { childList: true, subtree: true });
  }

  window.PortalI18n = {
    idiomas: IDIOMAS,
    actual: function () {
      return estado.codigo;
    },
    definicionActual: function () {
      return definicion(estado.codigo);
    },
    region: region,
    t: traducirTexto,
    traducirArbol: traducirArbol,
    cambiar: cambiar,
    detectar: detectar,
    montarSelector: montarSelector,
    formatoMoneda: formatoMoneda,
    formatoNumero: formatoNumero,
    formatoFecha: formatoFecha,
    formatoFechaHora: formatoFechaHora,
  };

  aplicar(detectar(), { guardar: false });

  document.addEventListener('DOMContentLoaded', function () {
    aplicar(estado.codigo, { guardar: false });
    montarSelector(
      document.querySelector('.superior__acciones') ||
        document.querySelector('.cabecera__interior'),
    );
    observar();
  });
})();
