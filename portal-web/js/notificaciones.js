(function () {
  'use strict';

  var CLAVE_PERMISO = 'portal.notificaciones.permiso';
  var CLAVE_INVITACION = 'portal.notificaciones.invitacion';

  var estado = {
    fuente: null,
    reconexiones: 0,
    temporizador: null,
    noLeidas: 0,
    conectado: false,
    cerrando: false,
  };

  function util() {
    return window.PortalUtil;
  }

  function traducir(texto) {
    return window.PortalI18n ? window.PortalI18n.t(texto) : texto;
  }

  function leer(clave) {
    try {
      return window.localStorage.getItem(clave);
    } catch (error) {
      return null;
    }
  }

  function escribir(clave, valor) {
    try {
      window.localStorage.setItem(clave, valor);
    } catch (error) {
      return;
    }
  }

  function soportaNotificaciones() {
    return typeof window.Notification !== 'undefined';
  }

  function permisoActual() {
    if (!soportaNotificaciones()) {
      return 'no-soportado';
    }
    return window.Notification.permission;
  }

  function anunciar(mensaje) {
    var region = document.getElementById('anuncioNotificaciones');
    if (region) {
      region.textContent = mensaje;
    }
  }

  function pintarContador() {
    var boton = document.getElementById('botonNotificaciones');
    if (!boton) {
      return;
    }

    var globo = boton.querySelector('.campana__globo');
    var total = estado.noLeidas;

    boton.classList.toggle('campana--con-avisos', total > 0);

    if (total > 0) {
      globo.hidden = false;
      globo.textContent = total > 99 ? '99+' : String(total);
      boton.setAttribute(
        'aria-label',
        traducir('Avisos') + ': ' + total + ' ' + traducir('sin leer'),
      );
    } else {
      globo.hidden = true;
      globo.textContent = '';
      boton.setAttribute('aria-label', traducir('Avisos'));
    }
  }

  function definirNoLeidas(total) {
    var numero = Number(total);
    estado.noLeidas = isNaN(numero) || numero < 0 ? 0 : numero;
    pintarContador();
    document.dispatchEvent(
      new CustomEvent('notificacionesactualizadas', {
        detail: { noLeidas: estado.noLeidas },
      }),
    );
  }

  function mostrarDelNavegador(notificacion) {
    if (permisoActual() !== 'granted') {
      return;
    }

    try {
      var aviso = new window.Notification(traducir('Banco ATM'), {
        body: traducir(notificacion.mensaje),
        tag: 'banco-atm-' + notificacion.id,
        lang: window.PortalI18n ? window.PortalI18n.actual() : 'es',
        silent: document.documentElement.getAttribute('data-movimiento') === 'reducido',
      });

      aviso.onclick = function () {
        window.focus();
        if (window.PortalNavegacion && window.PortalNavegacion.irA) {
          window.PortalNavegacion.irA('/avisos');
        }
        aviso.close();
      };

      window.setTimeout(function () {
        aviso.close();
      }, 12000);
    } catch (error) {
      return;
    }
  }

  function alRecibirNotificacion(datos) {
    definirNoLeidas(datos.noLeidas);

    var mensaje = traducir(datos.mensaje);
    anunciar(mensaje);

    if (util() && util().avisar) {
      util().avisar(mensaje, 'exito');
    }

    mostrarDelNavegador(datos);

    document.dispatchEvent(
      new CustomEvent('notificacionrecibida', { detail: datos }),
    );
  }

  function urlDelCanal() {
    var api = window.PortalApi;
    if (!api || !api.obtenerToken) {
      return null;
    }
    var token = api.obtenerToken();
    if (!token) {
      return null;
    }
    return (
      api.obtenerBaseUrl() +
      '/notifications/stream?token=' +
      encodeURIComponent(token)
    );
  }

  function programarReconexion() {
    if (estado.cerrando || estado.temporizador) {
      return;
    }

    estado.reconexiones += 1;
    var espera = Math.min(1000 * Math.pow(2, estado.reconexiones - 1), 30000);

    estado.temporizador = window.setTimeout(function () {
      estado.temporizador = null;
      conectar();
    }, espera);
  }

  function conectar() {
    if (
      typeof window.EventSource === 'undefined' ||
      !sesionConCuenta()
    ) {
      return;
    }

    desconectar(true);
    estado.cerrando = false;

    var url = urlDelCanal();
    if (!url) {
      return;
    }

    var fuente;
    try {
      fuente = new window.EventSource(url);
    } catch (error) {
      programarReconexion();
      return;
    }

    estado.fuente = fuente;

    fuente.addEventListener('open', function () {
      estado.conectado = true;
      estado.reconexiones = 0;
      document.dispatchEvent(new CustomEvent('canaltiemporealabierto'));
    });

    fuente.addEventListener('notificacion', function (evento) {
      try {
        alRecibirNotificacion(JSON.parse(evento.data));
      } catch (error) {
        return;
      }
    });

    fuente.addEventListener('lectura', function (evento) {
      try {
        definirNoLeidas(JSON.parse(evento.data).noLeidas);
      } catch (error) {
        return;
      }
    });

    fuente.addEventListener('latido', function () {
      estado.conectado = true;
    });

    fuente.addEventListener('error', function () {
      estado.conectado = false;
      if (fuente.readyState === 2) {
        estado.fuente = null;
        programarReconexion();
      }
    });
  }

  function desconectar(silencioso) {
    if (estado.temporizador) {
      window.clearTimeout(estado.temporizador);
      estado.temporizador = null;
    }

    if (estado.fuente) {
      try {
        estado.fuente.close();
      } catch (error) {
        return;
      }
      estado.fuente = null;
    }

    estado.conectado = false;

    if (!silencioso) {
      estado.cerrando = true;
      estado.reconexiones = 0;
      definirNoLeidas(0);
    }
  }

  function sincronizarResumen() {
    var api = window.PortalApi;
    if (!sesionConCuenta() || !api || !api.resumenNotificaciones) {
      return Promise.resolve();
    }
    return api
      .resumenNotificaciones()
      .then(function (resumen) {
        definirNoLeidas(resumen.noLeidas);
      })
      .catch(function () {
        return;
      });
  }

  function solicitarPermiso() {
    if (!soportaNotificaciones()) {
      return Promise.resolve('no-soportado');
    }
    return window.Notification.requestPermission().then(function (resultado) {
      escribir(CLAVE_PERMISO, resultado);
      return resultado;
    });
  }

  function invitar() {
    if (!soportaNotificaciones()) {
      return;
    }
    if (permisoActual() !== 'default') {
      return;
    }
    if (leer(CLAVE_INVITACION) === 'rechazada') {
      return;
    }

    util().abrirModal({
      titulo: traducir('Avisos del navegador'),
      contenido:
        '<p>' +
        traducir(
          'Podemos avisarle en el momento en que reciba una transferencia, se aplique un cargo o se resuelva una solicitud, aunque tenga el portal en otra pestaña.',
        ) +
        '</p><p class="texto-tenue">' +
        traducir(
          'Solo enviamos avisos de su propia cuenta. Puede desactivarlos cuando quiera desde su navegador, y el portal seguirá funcionando igual si prefiere no activarlos.',
        ) +
        '</p>',
      botones: [
        {
          texto: traducir('Ahora no'),
          clase: 'boton--secundario',
          accion: function () {
            escribir(CLAVE_INVITACION, 'rechazada');
          },
        },
        {
          texto: traducir('Activar avisos'),
          clase: 'boton',
          accion: function () {
            escribir(CLAVE_INVITACION, 'aceptada');
            solicitarPermiso().then(function (resultado) {
              if (resultado === 'granted') {
                util().avisar(
                  traducir('Avisos del navegador activados.'),
                  'exito',
                );
              } else if (resultado === 'denied') {
                util().avisar(
                  traducir(
                    'No activó los avisos del navegador. Seguirá viéndolos dentro del portal.',
                  ),
                  'atencion',
                );
              }
            });
          },
        },
      ],
    });
  }

  function montarCampana(destino) {
    if (!destino || destino.querySelector('#botonNotificaciones')) {
      return;
    }

    var boton = document.createElement('button');
    boton.type = 'button';
    boton.id = 'botonNotificaciones';
    boton.className = 'campana';
    boton.setAttribute('aria-label', traducir('Avisos'));
    boton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M12 3a6 6 0 0 0-6 6v3.6L4.5 15h15L18 12.6V9a6 6 0 0 0-6-6z"/>' +
      '<path d="M9.5 18a2.5 2.5 0 0 0 5 0"/></svg>' +
      '<span class="campana__globo" hidden></span>';

    boton.addEventListener('click', function () {
      if (window.PortalNavegacion && window.PortalNavegacion.irA) {
        window.PortalNavegacion.irA('/avisos');
      }
    });

    destino.insertBefore(boton, destino.firstChild);

    if (!document.getElementById('anuncioNotificaciones')) {
      var region = document.createElement('div');
      region.id = 'anuncioNotificaciones';
      region.className = 'solo-lectores';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }

    pintarContador();
  }

  function sesionConCuenta() {
    var api = window.PortalApi;
    if (!api || !api.obtenerSesion) {
      return false;
    }

    var sesion = api.obtenerSesion();
    return Boolean(
      sesion &&
        sesion.cuenta &&
        sesion.cuenta.id,
    );
  }

  function iniciar() {
    var destino = document.querySelector('.superior__acciones');
    if (!destino || !sesionConCuenta()) {
      return;
    }

    montarCampana(destino);
    sincronizarResumen().then(function () {
      conectar();
      window.setTimeout(invitar, 2500);
    });
  }

  document.addEventListener('idiomacambiado', function () {
    pintarContador();
  });

  window.addEventListener('beforeunload', function () {
    desconectar(true);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && !estado.conectado && !estado.cerrando) {
      sincronizarResumen();
      conectar();
    }
  });

  window.PortalNotificaciones = {
    iniciar: iniciar,
    conectar: conectar,
    desconectar: desconectar,
    sincronizarResumen: sincronizarResumen,
    solicitarPermiso: solicitarPermiso,
    permiso: permisoActual,
    soportado: soportaNotificaciones,
    noLeidas: function () {
      return estado.noLeidas;
    },
    definirNoLeidas: definirNoLeidas,
    conectado: function () {
      return estado.conectado;
    },
    invitar: invitar,
  };
})();
