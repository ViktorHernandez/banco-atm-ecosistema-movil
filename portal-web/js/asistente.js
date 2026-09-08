(function () {
  'use strict';

  var CLAVE_HISTORIAL = 'portal.asistente.historial';
  var CLAVE_IDIOMA = 'portal.asistente.idioma';

  var estado = {
    abierto: false,
    ocupado: false,
    publico: false,
    panel: null,
    lanzador: null,
    historial: [],
    sugerencias: [],
    acciones: [],
  };

  function util() {
    return window.PortalUtil;
  }

  function traducir(texto) {
    return window.PortalI18n ? window.PortalI18n.t(texto) : texto;
  }

  function idiomaActual() {
    return window.PortalI18n ? window.PortalI18n.actual() : 'es';
  }

  function leerHistorial() {
    try {
      var guardado = window.sessionStorage.getItem(CLAVE_IDIOMA);
      if (guardado && guardado !== idiomaActual()) {
        return [];
      }
      var crudo = window.sessionStorage.getItem(CLAVE_HISTORIAL);
      return crudo ? JSON.parse(crudo) : [];
    } catch (error) {
      return [];
    }
  }

  function guardarHistorial() {
    try {
      window.sessionStorage.setItem(
        CLAVE_HISTORIAL,
        JSON.stringify(estado.historial.slice(-40)),
      );
      window.sessionStorage.setItem(CLAVE_IDIOMA, idiomaActual());
    } catch (error) {
      return;
    }
  }

  function anunciar(mensaje) {
    var region = document.getElementById('anuncioAsistente');
    if (region) {
      region.textContent = mensaje;
    }
  }

  function pintarMensajes() {
    var lista = document.getElementById('asistenteMensajes');
    if (!lista) {
      return;
    }

    lista.innerHTML = estado.historial
      .map(function (entrada) {
        var clase =
          entrada.autor === 'usuario'
            ? 'asistente__mensaje asistente__mensaje--usuario'
            : 'asistente__mensaje asistente__mensaje--banco';

        var acciones = '';
        if (entrada.acciones && entrada.acciones.length) {
          acciones =
            '<span class="asistente__acciones">' +
            entrada.acciones
              .map(function (accion) {
                return (
                  '<button type="button" class="asistente__accion" data-ruta="' +
                  util().escapar(accion.ruta) +
                  '">' +
                  util().escapar(accion.etiqueta) +
                  '</button>'
                );
              })
              .join('') +
            '</span>';
        }

        return (
          '<li class="' +
          clase +
          '"><span class="asistente__autor">' +
          util().escapar(
            entrada.autor === 'usuario'
              ? traducir('Usted')
              : traducir('Asistente'),
          ) +
          '</span><span class="asistente__texto">' +
          util().escapar(entrada.texto) +
          '</span>' +
          acciones +
          '</li>'
        );
      })
      .join('');

    if (estado.ocupado) {
      lista.innerHTML +=
        '<li class="asistente__mensaje asistente__mensaje--banco asistente__mensaje--cargando">' +
        '<span class="asistente__autor">' +
        util().escapar(traducir('Asistente')) +
        '</span><span class="asistente__puntos" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="solo-lectores">' +
        util().escapar(traducir('Consultando…')) +
        '</span></li>';
    }

    lista.scrollTop = lista.scrollHeight;

    util()
      .nodos('[data-ruta]', lista)
      .forEach(function (boton) {
        boton.addEventListener('click', function () {
          irARuta(boton.getAttribute('data-ruta'));
        });
      });
  }

  function irARuta(ruta) {
    if (!ruta) {
      return;
    }

    if (estado.publico) {
      if (ruta === '/login') {
        cerrar();
        var acceso = document.getElementById('acceso');
        if (acceso && acceso.scrollIntoView) {
          acceso.scrollIntoView({ behavior: 'smooth' });
        }
        var correo = document.getElementById('correoAcceso');
        if (correo) {
          correo.focus();
        }
        return;
      }
      window.open(ruta, '_blank', 'noopener');
      return;
    }

    if (ruta === '/contacto' || ruta === '/seguridad') {
      window.open(ruta, '_blank', 'noopener');
      return;
    }

    if (window.PortalNavegacion && window.PortalNavegacion.irA) {
      window.PortalNavegacion.irA(ruta);
      cerrar();
    }
  }

  function pintarSugerencias() {
    var caja = document.getElementById('asistenteSugerencias');
    if (!caja) {
      return;
    }

    if (!estado.sugerencias.length || estado.ocupado) {
      caja.hidden = true;
      caja.innerHTML = '';
      return;
    }

    caja.hidden = false;
    caja.innerHTML = estado.sugerencias
      .map(function (sugerencia, indice) {
        return (
          '<button type="button" class="asistente__sugerencia" data-sugerencia="' +
          indice +
          '">' +
          util().escapar(sugerencia) +
          '</button>'
        );
      })
      .join('');

    util()
      .nodos('[data-sugerencia]', caja)
      .forEach(function (boton) {
        boton.addEventListener('click', function () {
          var indice = Number(boton.getAttribute('data-sugerencia'));
          enviar(estado.sugerencias[indice]);
        });
      });
  }

  function agregar(autor, texto, acciones) {
    estado.historial.push({
      autor: autor,
      texto: texto,
      acciones: acciones || [],
    });
    guardarHistorial();
    pintarMensajes();
  }

  function consultar(texto) {
    var idioma = idiomaActual();
    if (estado.publico) {
      return window.PortalApi.consultarAsistentePublico(texto, idioma);
    }
    return window.PortalApi.consultarAsistente(texto, idioma);
  }

  function bienvenida() {
    var idioma = idiomaActual();
    if (estado.publico) {
      return window.PortalApi.bienvenidaAsistentePublico(idioma);
    }
    return window.PortalApi.bienvenidaAsistente(idioma);
  }

  function enviar(mensaje) {
    var texto = String(mensaje || '').trim();
    if (!texto || estado.ocupado) {
      return;
    }

    var campo = document.getElementById('asistenteEntrada');
    if (campo) {
      campo.value = '';
    }

    agregar('usuario', texto);
    estado.ocupado = true;
    estado.sugerencias = [];
    pintarSugerencias();
    pintarMensajes();
    anunciar(traducir('Consultando…'));

    consultar(texto)
      .then(function (respuesta) {
        estado.ocupado = false;
        estado.sugerencias = respuesta.sugerencias || [];
        agregar('banco', respuesta.respuesta, respuesta.acciones);
        pintarSugerencias();
        anunciar(respuesta.respuesta);
      })
      .catch(function (error) {
        estado.ocupado = false;
        var aviso =
          error && error.codigo === 401
            ? traducir(
                'Su sesión venció. Entre de nuevo para seguir usando el asistente.',
              )
            : traducir(
                'No pude procesar su consulta en este momento. Inténtelo de nuevo en unos segundos.',
              );
        agregar('banco', aviso);
        pintarSugerencias();
        anunciar(aviso);
      });
  }

  function enfocables() {
    return util()
      .nodos(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        estado.panel,
      )
      .filter(function (elemento) {
        return elemento.offsetParent !== null;
      });
  }

  function alPresionar(evento) {
    if (!estado.abierto) {
      return;
    }

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
    }
  }

  function abrir() {
    if (estado.abierto) {
      return;
    }

    estado.abierto = true;
    estado.panel.hidden = false;
    estado.lanzador.setAttribute('aria-expanded', 'true');

    if (!estado.historial.length) {
      cargarBienvenida();
    } else {
      pintarMensajes();
      pintarSugerencias();
    }

    var campo = document.getElementById('asistenteEntrada');
    if (campo) {
      campo.focus();
    }

    document.addEventListener('keydown', alPresionar);
  }

  function cerrar() {
    if (!estado.abierto) {
      return;
    }

    estado.abierto = false;
    estado.panel.hidden = true;
    estado.lanzador.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', alPresionar);

    estado.lanzador.focus();
  }

  function alternar() {
    if (estado.abierto) {
      cerrar();
    } else {
      abrir();
    }
  }

  function cargarBienvenida() {
    estado.ocupado = true;
    pintarMensajes();

    bienvenida()
      .then(function (respuesta) {
        estado.ocupado = false;
        estado.sugerencias = respuesta.sugerencias || [];
        agregar('banco', respuesta.respuesta, respuesta.acciones);
        pintarSugerencias();
      })
      .catch(function () {
        estado.ocupado = false;
        agregar(
          'banco',
          traducir(
            'No pude iniciar la conversación. Compruebe su conexión e inténtelo de nuevo.',
          ),
        );
        pintarMensajes();
      });
  }

  function limpiar() {
    estado.historial = [];
    estado.sugerencias = [];
    guardarHistorial();
    cargarBienvenida();
  }

  function etiquetasChrome() {
    var titulo = document.getElementById('asistenteTitulo');
    if (titulo) {
      titulo.textContent = traducir('Asistente del banco');
    }

    var limpiarBoton = document.getElementById('asistenteLimpiar');
    if (limpiarBoton) {
      limpiarBoton.setAttribute(
        'aria-label',
        traducir('Reiniciar conversación'),
      );
    }

    var cerrarBoton = document.getElementById('asistenteCerrar');
    if (cerrarBoton) {
      cerrarBoton.setAttribute('aria-label', traducir('Cerrar asistente'));
    }

    var etiquetaEntrada = document.getElementById('asistenteEtiqueta');
    if (etiquetaEntrada) {
      etiquetaEntrada.textContent = traducir('Escriba su consulta');
    }

    var entrada = document.getElementById('asistenteEntrada');
    if (entrada) {
      entrada.setAttribute('placeholder', traducir('Escriba su consulta'));
    }

    var enviarBoton = document.getElementById('asistenteEnviar');
    if (enviarBoton) {
      enviarBoton.textContent = traducir('Enviar');
    }

    var nota = document.getElementById('asistenteNota');
    if (nota) {
      nota.textContent = traducir(
        estado.publico
          ? 'El asistente responde dudas generales del banco. Para consultar su cuenta debe iniciar sesión.'
          : 'El asistente consulta solo su propia cuenta y no realiza operaciones.',
      );
    }

    if (estado.lanzador) {
      estado.lanzador.setAttribute(
        'aria-label',
        traducir('Asistente del banco'),
      );
    }
  }

  function construir() {
    var lanzador = document.createElement('button');
    lanzador.type = 'button';
    lanzador.id = 'asistenteLanzador';
    lanzador.className = 'asistente-lanzador';
    lanzador.setAttribute('aria-expanded', 'false');
    lanzador.setAttribute('aria-controls', 'asistentePanel');
    lanzador.setAttribute('aria-label', traducir('Asistente del banco'));
    lanzador.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M21 12a8 8 0 1 1-3.2-6.4"/>' +
      '<path d="M4 20l1.6-3.2"/><circle cx="9" cy="12" r="1"/>' +
      '<circle cx="13" cy="12" r="1"/><circle cx="17" cy="12" r="1"/></svg>';
    lanzador.addEventListener('click', alternar);

    var panel = document.createElement('section');
    panel.id = 'asistentePanel';
    panel.className = 'asistente';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'asistenteTitulo');
    panel.innerHTML =
      '<header class="asistente__cabecera">' +
      '<h2 class="asistente__titulo" id="asistenteTitulo"></h2>' +
      '<span class="asistente__acciones-cabecera">' +
      '<button type="button" class="asistente__icono" id="asistenteLimpiar">↺</button>' +
      '<button type="button" class="asistente__icono" id="asistenteCerrar">✕</button>' +
      '</span></header>' +
      '<ul class="asistente__mensajes" id="asistenteMensajes" role="log" ' +
      'aria-live="polite" aria-relevant="additions"></ul>' +
      '<div class="asistente__sugerencias" id="asistenteSugerencias" hidden></div>' +
      '<form class="asistente__envio" id="asistenteFormulario">' +
      '<label class="solo-lectores" id="asistenteEtiqueta" for="asistenteEntrada"></label>' +
      '<input type="text" id="asistenteEntrada" class="campo__control" ' +
      'autocomplete="off" maxlength="400" />' +
      '<button type="submit" class="boton" id="asistenteEnviar"></button></form>' +
      '<p class="asistente__nota" id="asistenteNota"></p>';

    document.body.appendChild(lanzador);
    document.body.appendChild(panel);

    if (!document.getElementById('anuncioAsistente')) {
      var region = document.createElement('div');
      region.id = 'anuncioAsistente';
      region.className = 'solo-lectores';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }

    estado.lanzador = lanzador;
    estado.panel = panel;

    etiquetasChrome();

    document
      .getElementById('asistenteCerrar')
      .addEventListener('click', cerrar);
    document
      .getElementById('asistenteLimpiar')
      .addEventListener('click', limpiar);
    document
      .getElementById('asistenteFormulario')
      .addEventListener('submit', function (evento) {
        evento.preventDefault();
        enviar(document.getElementById('asistenteEntrada').value);
      });
  }

  function iniciar(opciones) {
    var ajustes = opciones || {};
    estado.publico = Boolean(ajustes.publico);

    if (document.getElementById('asistenteLanzador')) {
      etiquetasChrome();
      return;
    }

    construir();
    estado.historial = leerHistorial();
    if (estado.historial.length) {
      pintarMensajes();
    }
  }

  document.addEventListener('idiomacambiado', function () {
    if (!estado.panel) {
      return;
    }

    etiquetasChrome();

    estado.historial = [];
    estado.sugerencias = [];
    guardarHistorial();

    if (estado.abierto) {
      cargarBienvenida();
    } else {
      pintarMensajes();
      pintarSugerencias();
    }
  });

  window.PortalAsistente = {
    iniciar: iniciar,
    abrir: abrir,
    cerrar: cerrar,
    alternar: alternar,
    enviar: enviar,
    limpiar: limpiar,
    esPublico: function () {
      return estado.publico;
    },
    historial: function () {
      return estado.historial.slice();
    },
    abierto: function () {
      return estado.abierto;
    },
  };
})();
