(function () {
  'use strict';

  var CLAVE_API = 'atm.apiBaseUrl';

  function leerParametroUrl(nombre) {
    try {
      return new URLSearchParams(window.location.search).get(nombre);
    } catch (error) {
      return null;
    }
  }

  function leerAlmacen(clave) {
    try {
      return window.sessionStorage.getItem(clave);
    } catch (error) {
      return null;
    }
  }

  function escribirAlmacen(clave, valor) {
    try {
      window.sessionStorage.setItem(clave, valor);
    } catch (error) {
      return;
    }
  }

  function normalizarBase(url) {
    if (!url) {
      return '';
    }
    return url.replace(/\/+$/, '');
  }

  function esAnfitrionLocal(valor) {
    return /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(String(valor || ''));
  }

  function ejecutandoEnLocal() {
    return esAnfitrionLocal(window.location.hostname);
  }

  function apuntaALocal(url) {
    if (!url) {
      return false;
    }
    try {
      return esAnfitrionLocal(new URL(url).hostname);
    } catch (error) {
      return false;
    }
  }

  var baseConfigurada = normalizarBase(
    window.ATM_CONFIG && window.ATM_CONFIG.apiBaseUrl,
  );
  var baseParametro = normalizarBase(leerParametroUrl('api'));
  var baseGuardada = normalizarBase(leerAlmacen(CLAVE_API));

  if (
    baseGuardada &&
    ejecutandoEnLocal() &&
    !apuntaALocal(baseGuardada) &&
    apuntaALocal(baseConfigurada)
  ) {
    baseGuardada = '';
  }

  var baseInicial = baseParametro || baseGuardada || baseConfigurada;

  var estado = {
    baseUrl: baseInicial,
    token: null,
    sesion: null,
  };

  if (baseInicial) {
    escribirAlmacen(CLAVE_API, baseInicial);
  }

  function ErrorApi(mensaje, codigo, cuerpo) {
    this.name = 'ErrorApi';
    this.message = mensaje;
    this.codigo = codigo || 0;
    this.cuerpo = cuerpo || null;
  }
  ErrorApi.prototype = Object.create(Error.prototype);

  function extraerMensaje(cuerpo, respuesta) {
    if (cuerpo && cuerpo.mensaje) {
      if (Array.isArray(cuerpo.mensaje)) {
        return cuerpo.mensaje.join('. ');
      }
      return String(cuerpo.mensaje);
    }
    if (cuerpo && cuerpo.message) {
      if (Array.isArray(cuerpo.message)) {
        return cuerpo.message.join('. ');
      }
      return String(cuerpo.message);
    }
    return 'Error ' + respuesta.status;
  }

  function solicitar(metodo, ruta, cuerpoEnvio, requiereToken) {
    var opciones = {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
    };

    if (requiereToken !== false && estado.token) {
      opciones.headers.Authorization = 'Bearer ' + estado.token;
    }

    if (cuerpoEnvio !== undefined && cuerpoEnvio !== null) {
      opciones.body = JSON.stringify(cuerpoEnvio);
    }

    return fetch(estado.baseUrl + ruta, opciones).then(
      function (respuesta) {
        return respuesta
          .json()
          .catch(function () {
            return null;
          })
          .then(function (cuerpo) {
            if (!respuesta.ok) {
              throw new ErrorApi(
                extraerMensaje(cuerpo, respuesta),
                respuesta.status,
                cuerpo,
              );
            }
            return cuerpo;
          });
      },
      function () {
        throw new ErrorApi(
          'No fue posible contactar al servidor bancario. Verifique la URL de la API y que el backend esté en ejecución.',
          0,
          null,
        );
      },
    );
  }

  window.AtmApi = {
    ErrorApi: ErrorApi,

    obtenerBaseUrl: function () {
      return estado.baseUrl;
    },

    definirBaseUrl: function (url) {
      estado.baseUrl = normalizarBase(url);
      escribirAlmacen(CLAVE_API, estado.baseUrl);
    },

    obtenerBaseUrlPorDefecto: function () {
      return baseConfigurada;
    },

    restablecerBaseUrl: function () {
      estado.baseUrl = baseConfigurada;
      escribirAlmacen(CLAVE_API, estado.baseUrl);
      return estado.baseUrl;
    },

    obtenerSesion: function () {
      return estado.sesion;
    },

    haySesion: function () {
      return Boolean(estado.token);
    },

    limpiarSesion: function () {
      estado.token = null;
      estado.sesion = null;
    },

    estadoServicio: function () {
      return solicitar('GET', '/', null, false);
    },

    login: function (numeroTarjeta, pin) {
      return solicitar(
        'POST',
        '/auth/atm/login',
        { numeroTarjeta: numeroTarjeta, pin: pin },
        false,
      ).then(function (datos) {
        estado.token = datos.accessToken;
        estado.sesion = {
          usuario: datos.usuario,
          cuenta: datos.cuenta,
          tarjeta: datos.tarjeta,
        };
        return datos;
      });
    },

    logout: function () {
      if (!estado.token) {
        return Promise.resolve(null);
      }
      return solicitar('POST', '/auth/logout', null, true)
        .catch(function () {
          return null;
        })
        .then(function (resultado) {
          window.AtmApi.limpiarSesion();
          return resultado;
        });
    },

    consultarSaldo: function () {
      return solicitar('GET', '/accounts/me/saldo');
    },

    consultarMovimientos: function (limite) {
      return solicitar('GET', '/accounts/me/movimientos?limite=' + (limite || 10));
    },

    consultarLimites: function () {
      return solicitar('GET', '/transactions/limites');
    },

    retirar: function (monto) {
      return solicitar('POST', '/transactions/retiro', { monto: monto });
    },

    depositar: function (monto) {
      return solicitar('POST', '/transactions/deposito', { monto: monto });
    },

    transferir: function (cuentaDestino, monto, concepto) {
      var cuerpo = { cuentaDestino: cuentaDestino, monto: monto };
      if (concepto) {
        cuerpo.concepto = concepto;
      }
      return solicitar('POST', '/transactions/transferencia', cuerpo);
    },

    catalogoServicios: function () {
      return solicitar('GET', '/services/catalogo');
    },

    pagarServicio: function (codigoProveedor, referencia, monto) {
      return solicitar('POST', '/transactions/pago-servicio', {
        codigoProveedor: codigoProveedor,
        referencia: referencia,
        monto: monto,
      });
    },

    condicionesPrestamo: function () {
      return solicitar('GET', '/loans/condiciones');
    },

    simularPrestamo: function (monto, plazoMeses) {
      return solicitar(
        'GET',
        '/loans/simular?monto=' +
          encodeURIComponent(monto) +
          '&plazoMeses=' +
          encodeURIComponent(plazoMeses),
      );
    },

    prestamosPendientes: function () {
      return solicitar('GET', '/loans/pendientes');
    },

    detallePrestamo: function (prestamoId) {
      return solicitar('GET', '/loans/' + prestamoId);
    },

    pagarPrestamo: function (prestamoId, monto) {
      return solicitar('POST', '/loans/' + prestamoId + '/pagos', {
        monto: monto,
      });
    },

    solicitarPrestamo: function (monto, plazoMeses) {
      return solicitar('POST', '/loans/solicitar', {
        monto: monto,
        plazoMeses: plazoMeses,
      });
    },

    consultarTarjeta: function () {
      return solicitar('GET', '/cards/me');
    },

    bloquearTarjeta: function () {
      return solicitar('POST', '/cards/me/bloquear');
    },

    cambiarPin: function (pinActual, pinNuevo) {
      return solicitar('POST', '/cards/me/cambiar-pin', {
        pinActual: pinActual,
        pinNuevo: pinNuevo,
      });
    },

    consultarNotificaciones: function (limite) {
      return solicitar('GET', '/notifications/me?limite=' + (limite || 10));
    },
  };
})();
