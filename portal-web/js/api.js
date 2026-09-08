(function () {
  'use strict';

  var CLAVE_API = 'portal.apiBaseUrl';
  var CLAVE_TOKEN = 'portal.token';
  var CLAVE_SESION = 'portal.sesion';

  var config = window.PORTAL_CONFIG || {};

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
      if (valor === null || valor === undefined) {
        window.sessionStorage.removeItem(clave);
      } else {
        window.sessionStorage.setItem(clave, valor);
      }
    } catch (error) {
      return;
    }
  }

  function normalizarBase(url) {
    if (!url) {
      return '';
    }
    return String(url).replace(/\/+$/, '');
  }

  function leerSesionGuardada() {
    var crudo = leerAlmacen(CLAVE_SESION);
    if (!crudo) {
      return null;
    }
    try {
      return JSON.parse(crudo);
    } catch (error) {
      return null;
    }
  }

  var estado = {
    baseUrl:
      normalizarBase(leerParametroUrl('api')) ||
      normalizarBase(leerAlmacen(CLAVE_API)) ||
      normalizarBase(config.apiBaseUrl),
    token: leerAlmacen(CLAVE_TOKEN),
    sesion: leerSesionGuardada(),
  };

  if (estado.baseUrl) {
    escribirAlmacen(CLAVE_API, estado.baseUrl);
  }

  function ErrorApi(mensaje, codigo, cuerpo) {
    this.name = 'ErrorApi';
    this.message = mensaje;
    this.codigo = codigo || 0;
    this.cuerpo = cuerpo || null;
  }
  ErrorApi.prototype = Object.create(Error.prototype);

  function frase(plantilla, parametros) {
    if (window.PortalUtil && window.PortalUtil.frase) {
      return window.PortalUtil.frase(plantilla, parametros);
    }
    var valores = parametros || {};
    return Object.keys(valores).reduce(function (acumulado, nombre) {
      return acumulado.split('{' + nombre + '}').join(String(valores[nombre]));
    }, plantilla);
  }

  function extraerMensaje(cuerpo, respuesta) {
    var campo = null;
    if (cuerpo && cuerpo.mensaje) {
      campo = cuerpo.mensaje;
    } else if (cuerpo && cuerpo.message) {
      campo = cuerpo.message;
    }
    if (Array.isArray(campo)) {
      return campo.join('. ');
    }
    if (campo) {
      return String(campo);
    }
    return frase('No fue posible completar la operación (error {codigo}).', {
      codigo: respuesta.status,
    });
  }

  var manejadorSesionInvalida = null;

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
              if (
                respuesta.status === 401 &&
                requiereToken !== false &&
                typeof manejadorSesionInvalida === 'function'
              ) {
                manejadorSesionInvalida();
              }
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
          'No fue posible contactar al servidor bancario. Verifique que el backend esté en ejecución y que la URL de la API sea correcta.',
          0,
          null,
        );
      },
    );
  }

  function parametros(objeto) {
    var partes = [];
    Object.keys(objeto || {}).forEach(function (clave) {
      var valor = objeto[clave];
      if (valor === undefined || valor === null || valor === '') {
        return;
      }
      partes.push(
        encodeURIComponent(clave) + '=' + encodeURIComponent(String(valor)),
      );
    });
    return partes.length ? '?' + partes.join('&') : '';
  }

  function guardarSesion(datos) {
    estado.token = datos.accessToken;
    estado.sesion = {
      usuario: datos.usuario,
      cuenta: datos.cuenta || null,
      expiraEn: expiracionDeToken(datos.accessToken),
    };
    escribirAlmacen(CLAVE_TOKEN, estado.token);
    escribirAlmacen(CLAVE_SESION, JSON.stringify(estado.sesion));
  }

  function expiracionDeToken(token) {
    try {
      var carga = token.split('.')[1];
      var normalizado = carga.replace(/-/g, '+').replace(/_/g, '/');
      var datos = JSON.parse(window.atob(normalizado));
      return datos.exp ? datos.exp * 1000 : null;
    } catch (error) {
      return null;
    }
  }

  window.PortalApi = {
    ErrorApi: ErrorApi,

    obtenerBaseUrl: function () {
      return estado.baseUrl;
    },

    obtenerToken: function () {
      return estado.token;
    },

    definirBaseUrl: function (url) {
      estado.baseUrl = normalizarBase(url);
      escribirAlmacen(CLAVE_API, estado.baseUrl);
    },

    obtenerSesion: function () {
      return estado.sesion;
    },

    haySesion: function () {
      return Boolean(estado.token);
    },

    esAdministrador: function () {
      return Boolean(
        estado.sesion &&
          estado.sesion.usuario &&
          estado.sesion.usuario.rol === 'ADMINISTRADOR',
      );
    },

    alPerderSesion: function (manejador) {
      manejadorSesionInvalida = manejador;
    },

    limpiarSesion: function () {
      estado.token = null;
      estado.sesion = null;
      escribirAlmacen(CLAVE_TOKEN, null);
      escribirAlmacen(CLAVE_SESION, null);
    },

    estadoServicio: function () {
      return solicitar('GET', '/', null, false);
    },

    solicitarRecuperacion: function (correo, idioma) {
      return solicitar(
        'POST',
        '/auth/recuperar/solicitar',
        { correo: correo, idioma: idioma },
        false,
      );
    },

    restablecerPassword: function (correo, codigo, password) {
      return solicitar(
        'POST',
        '/auth/recuperar/restablecer',
        { correo: correo, codigo: codigo, password: password },
        false,
      );
    },

    estadoTotp: function () {
      return solicitar('GET', '/profile/me/totp');
    },

    iniciarTotp: function () {
      return solicitar('POST', '/profile/me/totp/iniciar');
    },

    confirmarTotp: function (codigo) {
      return solicitar('POST', '/profile/me/totp/confirmar', {
        codigo: codigo,
      });
    },

    desactivarTotp: function (password) {
      return solicitar('POST', '/profile/me/totp/desactivar', {
        password: password,
      });
    },

    login: function (correo, password, codigoTotp) {
      return solicitar(
        'POST',
        '/auth/login',
        {
          correo: correo,
          password: password,
          codigoTotp: codigoTotp || undefined,
          canal: (window.PORTAL_CONFIG && window.PORTAL_CONFIG.canal) || 'WEB',
        },
        false,
      ).then(function (datos) {
        if (datos && datos.requiereSegundoFactor) {
          return datos;
        }
        guardarSesion(datos);
        return datos;
      });
    },

    perfil: function () {
      return solicitar('GET', '/auth/me');
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
          window.PortalApi.limpiarSesion();
          return resultado;
        });
    },

    listarCuentas: function () {
      return solicitar('GET', '/accounts');
    },

    resumenCuenta: function () {
      return solicitar('GET', '/accounts/me');
    },

    consultarSaldo: function () {
      return solicitar('GET', '/accounts/me/saldo');
    },

    consultarMovimientos: function (filtros) {
      return solicitar('GET', '/accounts/me/movimientos' + parametros(filtros));
    },

    resumenCuentaPorId: function (cuentaId) {
      return solicitar('GET', '/accounts/' + cuentaId);
    },

    movimientosPorCuenta: function (cuentaId, filtros) {
      return solicitar(
        'GET',
        '/accounts/' + cuentaId + '/movimientos' + parametros(filtros),
      );
    },

    consultarLimites: function () {
      return solicitar('GET', '/transactions/limites');
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

    comprobante: function (transaccionId) {
      return solicitar('GET', '/transactions/' + transaccionId + '/comprobante');
    },

    consultarTarjeta: function () {
      return solicitar('GET', '/cards/me');
    },

    detalleTarjeta: function (tarjetaId) {
      return solicitar('GET', '/cards/' + tarjetaId + '/detalle');
    },

    listarTarjetas: function () {
      return solicitar('GET', '/cards/me/todas');
    },

    catalogoCredito: function () {
      return solicitar('GET', '/cards/credito/catalogo');
    },

    solicitarCredito: function (nivel) {
      return solicitar('POST', '/cards/credito/solicitar', nivel ? { nivel: nivel } : {});
    },

    bloquearTarjeta: function (tarjetaId) {
      return solicitar(
        'POST',
        tarjetaId ? '/cards/' + tarjetaId + '/bloquear' : '/cards/me/bloquear',
      );
    },

    desbloquearTarjeta: function (tarjetaId) {
      return solicitar(
        'POST',
        tarjetaId ? '/cards/' + tarjetaId + '/desbloquear' : '/cards/me/desbloquear',
      );
    },

    condicionesPrestamo: function () {
      return solicitar('GET', '/loans/condiciones');
    },

    listarPrestamos: function () {
      return solicitar('GET', '/loans/me');
    },

    simularPrestamo: function (monto, plazoMeses) {
      return solicitar(
        'GET',
        '/loans/simular?monto=' + encodeURIComponent(monto) +
          '&plazoMeses=' + encodeURIComponent(plazoMeses),
      );
    },

    detallePrestamo: function (prestamoId) {
      return solicitar('GET', '/loans/' + prestamoId);
    },

    prestamosPendientes: function () {
      return solicitar('GET', '/loans/pendientes');
    },

    pagarPrestamo: function (prestamoId, monto) {
      return solicitar('POST', '/loans/' + prestamoId + '/pagos', {
        monto: monto,
      });
    },

    pagarPrestamos: function (pagos) {
      return solicitar('POST', '/loans/pagos', { pagos: pagos });
    },

    solicitarPrestamo: function (monto, plazoMeses) {
      return solicitar('POST', '/loans/solicitar', {
        monto: monto,
        plazoMeses: plazoMeses,
      });
    },

    miPerfil: function () {
      return solicitar('GET', '/profile/me');
    },

    actualizarPerfil: function (datos) {
      return solicitar('PATCH', '/profile/me', datos);
    },

    cambiarPassword: function (actual, nueva, confirmacion) {
      return solicitar('POST', '/profile/me/password', {
        passwordActual: actual,
        passwordNueva: nueva,
        passwordConfirmacion: confirmacion,
      });
    },

    registrar: function (datos) {
      return solicitar('POST', '/auth/registro', datos, false);
    },

    verificarCorreo: function (correo, codigo) {
      return solicitar(
        'POST',
        '/auth/verificar',
        { correo: correo, codigo: codigo },
        false,
      );
    },

    reenviarCodigo: function (correo) {
      return solicitar('POST', '/auth/reenviar-codigo', { correo: correo }, false);
    },

    consultarNotificaciones: function (limite) {
      return solicitar('GET', '/notifications/me' + parametros({ limite: limite }));
    },

    bienvenidaAsistente: function (idioma) {
      return solicitar(
        'GET',
        '/assistant/bienvenida' + parametros({ idioma: idioma }),
      );
    },

    consultarAsistente: function (mensaje, idioma) {
      return solicitar('POST', '/assistant/consultar', {
        mensaje: mensaje,
        idioma: idioma,
      });
    },

    bienvenidaAsistentePublico: function (idioma) {
      return solicitar(
        'GET',
        '/assistant/publico/bienvenida' + parametros({ idioma: idioma }),
        null,
        false,
      );
    },

    consultarAsistentePublico: function (mensaje, idioma) {
      return solicitar(
        'POST',
        '/assistant/publico/consultar',
        { mensaje: mensaje, idioma: idioma },
        false,
      );
    },

    resumenNotificaciones: function () {
      return solicitar('GET', '/notifications/me/resumen');
    },

    marcarNotificacionLeida: function (notificacionId) {
      return solicitar('PATCH', '/notifications/' + notificacionId + '/leida');
    },

    marcarNotificacionesLeidas: function (identificadores) {
      return solicitar(
        'POST',
        '/notifications/me/leidas',
        identificadores ? { identificadores: identificadores } : {},
      );
    },

    adminUsuarios: function () {
      return solicitar('GET', '/admin/usuarios');
    },

    adminUsuario: function (usuarioId) {
      return solicitar('GET', '/admin/usuarios/' + usuarioId);
    },

    adminCrearCliente: function (datos) {
      return solicitar('POST', '/admin/usuarios', datos);
    },

    adminActualizarUsuario: function (usuarioId, datos) {
      return solicitar('PATCH', '/admin/usuarios/' + usuarioId, datos);
    },

    adminEliminarUsuario: function (usuarioId) {
      return solicitar('DELETE', '/admin/usuarios/' + usuarioId);
    },

    adminCambiarRol: function (usuarioId, rol) {
      return solicitar('PATCH', '/admin/usuarios/' + usuarioId + '/rol', {
        rol: rol,
      });
    },

    adminTarjetas: function () {
      return solicitar('GET', '/admin/tarjetas');
    },

    adminActualizarEstadoTarjeta: function (tarjetaId, estadoNuevo) {
      return solicitar('PATCH', '/admin/tarjetas/' + tarjetaId + '/estado', {
        estado: estadoNuevo,
      });
    },

    adminReporte: function () {
      return solicitar('GET', '/admin/reportes/operaciones');
    },

    adminAuditoria: function (limite) {
      return solicitar('GET', '/admin/auditoria' + parametros({ limite: limite }));
    },
  };
})();
