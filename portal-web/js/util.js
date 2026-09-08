(function () {
  'use strict';

  var iconos = {
    resumen:
      '<path d="M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    cuentas:
      '<path d="M3 6h18v4H3zM3 12h18v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM7 15h4"/>',
    movimientos:
      '<path d="M4 6h16M4 12h10M4 18h13M17 9l3 3-3 3"/>',
    transferencias:
      '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    pagos:
      '<path d="M4 5h16v14H4zM4 10h16M8 15h4"/>',
    tarjeta:
      '<path d="M3 6h18v12H3zM3 10h18M7 15h4"/>',
    notificaciones:
      '<path d="M12 3a5 5 0 0 0-5 5v4l-2 3h14l-2-3V8a5 5 0 0 0-5-5zM10 18a2 2 0 0 0 4 0"/>',
    perfil:
      '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0"/>',
    panel:
      '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z"/>',
    usuarios:
      '<path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 20a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M18 20h4a5 5 0 0 0-4-4.9"/>',
    reportes:
      '<path d="M5 20V10M12 20V4M19 20v-7M3 20h18"/>',
    auditoria:
      '<path d="M6 3h9l5 5v13H6zM14 3v5h5M9 13h7M9 17h5"/>',
    salir: '<path d="M15 5V3H4v18h11v-2M18 12H9M15 9l3 3-3 3"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  };

  function icono(nombre) {
    var trazo = iconos[nombre] || iconos.resumen;
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      trazo +
      '</svg>'
    );
  }

  function nodo(selector, raiz) {
    return (raiz || document).querySelector(selector);
  }

  function nodos(selector, raiz) {
    return Array.prototype.slice.call(
      (raiz || document).querySelectorAll(selector),
    );
  }

  function escapar(valor) {
    if (valor === null || valor === undefined) {
      return '';
    }
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function i18n() {
    return window.PortalI18n || null;
  }

  function region() {
    var motor = i18n();
    return motor ? motor.region() : 'es-MX';
  }

  function traducir(texto) {
    var motor = i18n();
    return motor ? motor.t(texto) : texto;
  }

  function frase(plantilla, parametros) {
    var valores = parametros || {};
    var base = traducir(plantilla);
    return Object.keys(valores).reduce(function (acumulado, nombre) {
      return acumulado.split('{' + nombre + '}').join(String(valores[nombre]));
    }, base);
  }

  function moneda(valor) {
    var motor = i18n();
    if (motor) {
      return motor.formatoMoneda(valor);
    }
    var numeroValor = Number(valor);
    if (isNaN(numeroValor)) {
      return '—';
    }
    return numeroValor.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  }

  function numero(valor) {
    var motor = i18n();
    if (motor) {
      return motor.formatoNumero(valor);
    }
    var n = Number(valor);
    return isNaN(n) ? '—' : n.toLocaleString('es-MX');
  }

  function fecha(valor) {
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

  function fechaCorta(valor) {
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

  function iniciales(nombre) {
    if (!nombre) {
      return 'BA';
    }
    var partes = String(nombre).trim().split(/\s+/);
    var primera = partes[0] ? partes[0].charAt(0) : '';
    var segunda = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (primera + segunda).toUpperCase();
  }

  function etiquetaTipo(tipo) {
    var mapa = {
      RETIRO: 'Retiro de efectivo',
      DEPOSITO: 'Depósito',
      TRANSFERENCIA: 'Transferencia',
      PAGO_SERVICIO: 'Pago de servicio',
      PRESTAMO: 'Préstamo',
      PAGO_PRESTAMO: 'Pago de préstamo',
    };
    return traducir(mapa[tipo] || tipo);
  }

  function etiquetaCanal(canal) {
    var mapa = {
      ATM: 'Cajero automático',
      WEB: 'Portal web',
      APP: 'App móvil',
    };
    return traducir(mapa[canal] || canal);
  }

  function claseEstadoTarjeta(estado) {
    if (estado === 'ACTIVA') {
      return 'insignia insignia--activa';
    }
    if (estado === 'BLOQUEADA') {
      return 'insignia insignia--bloqueada';
    }
    return 'insignia insignia--inactiva';
  }

  function motivoLegible(motivo) {
    var mapa = {
      CLIENTE: 'Bloqueada por usted',
      INTENTOS_FALLIDOS: 'Bloqueada por intentos incorrectos de PIN',
      ADMINISTRADOR: 'Bloqueada por el banco',
    };
    return mapa[motivo] ? traducir(mapa[motivo]) : null;
  }

  function agruparNumero(valor) {
    if (!valor) {
      return '—';
    }
    return String(valor).replace(/(.{4})/g, '$1 ').trim();
  }

  var contenedorAvisos = null;

  function avisar(mensaje, tipo) {
    if (!contenedorAvisos) {
      contenedorAvisos = document.createElement('div');
      contenedorAvisos.className = 'avisos-flotantes';
      contenedorAvisos.setAttribute('aria-live', 'polite');
      document.body.appendChild(contenedorAvisos);
    }
    var aviso = document.createElement('div');
    aviso.className =
      'aviso-flotante' + (tipo ? ' aviso-flotante--' + tipo : '');
    aviso.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    aviso.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
    aviso.textContent = mensaje;
    contenedorAvisos.appendChild(aviso);
    window.setTimeout(function () {
      if (aviso.parentNode) {
        aviso.parentNode.removeChild(aviso);
      }
    }, 4200);
  }

  var contadorModal = 0;

  function abrirModal(opciones) {
    contadorModal += 1;
    var idTitulo = 'modal-titulo-' + contadorModal;
    var origen = document.activeElement;

    var capa = document.createElement('div');
    capa.className = 'modal';
    capa.innerHTML =
      '<div class="modal__caja" role="dialog" aria-modal="true" aria-labelledby="' +
      idTitulo +
      '">' +
      '<h2 class="modal__titulo" id="' + idTitulo + '" tabindex="-1">' +
      escapar(opciones.titulo) +
      '</h2>' +
      '<div class="modal__cuerpo"></div>' +
      '<div class="modal__acciones"></div>' +
      '</div>';

    var cuerpo = nodo('.modal__cuerpo', capa);
    if (typeof opciones.contenido === 'string') {
      cuerpo.innerHTML = opciones.contenido;
    } else if (opciones.contenido) {
      cuerpo.appendChild(opciones.contenido);
    }

    var acciones = nodo('.modal__acciones', capa);

    function cerrar() {
      if (capa.parentNode) {
        capa.parentNode.removeChild(capa);
      }
      document.removeEventListener('keydown', alPresionar);
      document.body.classList.remove('modal-abierto');
      if (origen && typeof origen.focus === 'function') {
        origen.focus();
      }
    }

    function enfocables() {
      return nodos(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        capa,
      ).filter(function (elemento) {
        return elemento.offsetParent !== null || elemento === document.activeElement;
      });
    }

    function alPresionar(evento) {
      if (evento.key === 'Escape') {
        cerrar();
        return;
      }

      if (evento.key !== 'Tab') {
        return;
      }

      var lista = enfocables();
      if (!lista.length) {
        return;
      }

      var primero = lista[0];
      var ultimo = lista[lista.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      } else if (!capa.contains(document.activeElement)) {
        evento.preventDefault();
        primero.focus();
      }
    }

    (opciones.botones || []).forEach(function (definicion) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'boton ' + (definicion.clase || 'boton--secundario');
      boton.textContent = definicion.texto;
      boton.addEventListener('click', function () {
        if (definicion.cerrar !== false) {
          cerrar();
        }
        if (typeof definicion.accion === 'function') {
          definicion.accion(capa, boton);
        }
      });
      acciones.appendChild(boton);
    });

    capa.addEventListener('click', function (evento) {
      if (evento.target === capa) {
        cerrar();
      }
    });

    document.addEventListener('keydown', alPresionar);
    document.body.appendChild(capa);
    document.body.classList.add('modal-abierto');

    var enfocable = nodo('input, select, textarea, button', capa);
    if (enfocable) {
      enfocable.focus();
    } else {
      nodo('.modal__titulo', capa).focus();
    }

    return { capa: capa, cerrar: cerrar };
  }

  function confirmar(titulo, texto, textoBoton, clase) {
    return new Promise(function (resolver) {
      abrirModal({
        titulo: titulo,
        contenido: '<p class="texto-tenue">' + escapar(texto) + '</p>',
        botones: [
          {
            texto: 'Cancelar',
            clase: 'boton--secundario',
            accion: function () {
              resolver(false);
            },
          },
          {
            texto: textoBoton || 'Confirmar',
            clase: clase || 'boton',
            accion: function () {
              resolver(true);
            },
          },
        ],
      });
    });
  }

  function etiquetaEstadoTransaccion(estado) {
    var mapa = {
      EXITOSA: 'Exitosa',
      FALLIDA: 'Fallida',
      PENDIENTE: 'Pendiente',
      REVERTIDA: 'Revertida',
    };
    return traducir(mapa[estado] || estado);
  }

  function bloqueComprobante(titulo, filas) {
    var etiquetas = filas.map(function (fila) {
      return traducir(fila[0]);
    });

    var ancho = etiquetas.reduce(function (mayor, etiqueta) {
      return Math.max(mayor, etiqueta.length);
    }, 0);

    var lineas = filas.map(function (fila, indice) {
      var etiqueta = etiquetas[indice];
      var relleno = new Array(ancho - etiqueta.length + 1).join(' ');
      var valor = fila[1] === null || fila[1] === undefined ? '—' : fila[1];
      return etiqueta + relleno + ' : ' + valor;
    });

    var separador = new Array(Math.max(ancho + 24, titulo.length + 4)).join('-');

    return { titulo: titulo, lineas: lineas, separador: separador };
  }

  function centrar(texto, ancho) {
    if (texto.length >= ancho) {
      return texto;
    }
    var espacios = Math.floor((ancho - texto.length) / 2);
    return new Array(espacios + 1).join(' ') + texto;
  }

  function textoComprobante(comprobante, banco) {
    var filas = [
      ['Folio', comprobante.folio],
      ['Fecha', fecha(comprobante.fecha)],
      ['Operación', etiquetaTipo(comprobante.tipo)],
      ['Canal', etiquetaCanal(comprobante.canal)],
      ['Estado', etiquetaEstadoTransaccion(comprobante.estado)],
      ['Monto', moneda(comprobante.monto)],
    ];

    if (comprobante.cuentaOrigen) {
      filas.push(['Cuenta origen', comprobante.cuentaOrigen]);
    }
    if (comprobante.cuentaDestino) {
      filas.push(['Cuenta destino', comprobante.cuentaDestino]);
    }
    if (
      comprobante.saldoResultante !== null &&
      comprobante.saldoResultante !== undefined
    ) {
      filas.push(['Saldo', moneda(comprobante.saldoResultante)]);
    }
    if (comprobante.descripcion) {
      filas.push(['Concepto', comprobante.descripcion]);
    }

    var bloque = bloqueComprobante(
      traducir('COMPROBANTE DE OPERACIÓN'),
      filas,
    );
    var ancho = bloque.separador.length;

    return []
      .concat(
        centrar(banco || 'Banco ATM', ancho),
        centrar(bloque.titulo, ancho),
        bloque.separador,
        bloque.lineas,
        bloque.separador,
        traducir('Conserve este comprobante.'),
      )
      .join('\n');
  }

  function descargarCsv(nombreArchivo, encabezados, filas) {
    var titulos = encabezados.map(function (encabezado) {
      return traducir(encabezado);
    });

    var contenido = [titulos]
      .concat(filas)
      .map(function (fila) {
        return fila
          .map(function (celda) {
            var valor = celda === null || celda === undefined ? '' : String(celda);
            return '"' + valor.replace(/"/g, '""') + '"';
          })
          .join(',');
      })
      .join('\r\n');

    var blob = new Blob(['\ufeff' + contenido], {
      type: 'text/csv;charset=utf-8;',
    });
    var url = URL.createObjectURL(blob);
    var enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  }

  function hoyIso(diasAtras) {
    var f = new Date();
    if (diasAtras) {
      f.setDate(f.getDate() - diasAtras);
    }
    var mes = String(f.getMonth() + 1).padStart(2, '0');
    var dia = String(f.getDate()).padStart(2, '0');
    return f.getFullYear() + '-' + mes + '-' + dia;
  }

  function vacio(titulo, texto) {
    return (
      '<div class="vacio"><span class="vacio__titulo">' +
      escapar(titulo) +
      '</span>' +
      escapar(texto || '') +
      '</div>'
    );
  }

  window.PortalUtil = {
    t: traducir,
    frase: frase,
    icono: icono,
    nodo: nodo,
    nodos: nodos,
    escapar: escapar,
    moneda: moneda,
    numero: numero,
    fecha: fecha,
    fechaCorta: fechaCorta,
    iniciales: iniciales,
    etiquetaTipo: etiquetaTipo,
    etiquetaCanal: etiquetaCanal,
    claseEstadoTarjeta: claseEstadoTarjeta,
    motivoLegible: motivoLegible,
    agruparNumero: agruparNumero,
    avisar: avisar,
    abrirModal: abrirModal,
    confirmar: confirmar,
    textoComprobante: textoComprobante,
    bloqueComprobante: bloqueComprobante,
    etiquetaEstadoTransaccion: etiquetaEstadoTransaccion,
    descargarCsv: descargarCsv,
    hoyIso: hoyIso,
    vacio: vacio,
  };
})();
