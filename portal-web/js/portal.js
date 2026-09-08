(function () {
  'use strict';

  var config = window.PORTAL_CONFIG || {};
  var api = window.PortalApi;
  var util = window.PortalUtil;
  var vistas = window.PortalVistas || {};
  var nodo = util.nodo;
  var nodos = util.nodos;

  var estado = {
    sesion: null,
    rutaActual: null,
    temporizadorSesion: null,
    temporizadorInactividad: null,
  };

  function mostrarCarga(visible) {
    nodo('#capaCarga').hidden = !visible;
  }

  function salir(motivo) {
    try {
      window.sessionStorage.setItem('portal.motivoSalida', motivo || 'salida');
    } catch (error) {
    }

    window.clearInterval(estado.temporizadorSesion);
    window.clearTimeout(estado.temporizadorInactividad);

    if (window.PortalNotificaciones) {
      window.PortalNotificaciones.desconectar();
    }

    api.logout().then(function () {
      window.location.href = '/login';
    });
  }

  function terminarSesionLocal(motivo) {
    try {
      window.sessionStorage.setItem('portal.motivoSalida', motivo);
    } catch (error) {
    }
    if (window.PortalNotificaciones) {
      window.PortalNotificaciones.desconectar();
    }
    api.limpiarSesion();
    window.location.href = '/login';
  }

  function rutaDeClave(clave) {
    return '/' + clave;
  }

  function claveDeRuta(ruta) {
    return String(ruta || '')
      .replace(/^#\/?/, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');
  }

  function rutaPorDefecto() {
    return api.esAdministrador() ? '/admin' : '/resumen';
  }

  function rutaActualDelNavegador() {
    if (window.location.hash) {
      return rutaDeClave(claveDeRuta(window.location.hash));
    }
    return window.location.pathname || rutaPorDefecto();
  }

  function vistasPermitidas() {
    var rol = estado.sesion.usuario.rol;
    return Object.keys(vistas)
      .filter(function (clave) {
        return vistas[clave].rol === rol;
      })
      .map(function (clave) {
        var vista = vistas[clave];
        return {
          clave: clave,
          ruta: rutaDeClave(clave),
          etiqueta: vista.etiqueta || vista.titulo,
          icono: vista.icono,
          grupo: vista.grupo || 'General',
        };
      });
  }

  function construirNavegacion() {
    var permitidas = vistasPermitidas();
    var grupos = [];

    permitidas.forEach(function (entrada) {
      var grupo = grupos.filter(function (item) {
        return item.nombre === entrada.grupo;
      })[0];
      if (!grupo) {
        grupo = { nombre: entrada.grupo, entradas: [] };
        grupos.push(grupo);
      }
      grupo.entradas.push(entrada);
    });

    nodo('#navegacionLateral').innerHTML = grupos
      .map(function (grupo) {
        var idGrupo = 'grupo-' + grupo.nombre.toLowerCase().replace(/[^a-z]+/g, '-');
        return (
          '<div class="lateral__grupo" role="group" aria-labelledby="' + idGrupo + '">' +
          '<div class="lateral__rotulo" id="' + idGrupo + '">' +
          util.escapar(grupo.nombre) +
          '</div>' +
          grupo.entradas
            .map(function (entrada) {
              return (
                '<a class="lateral__enlace" href="' +
                entrada.ruta +
                '" data-ruta="' +
                entrada.ruta +
                '">' +
                util.icono(entrada.icono) +
                '<span>' +
                util.escapar(entrada.etiqueta) +
                '</span></a>'
              );
            })
            .join('') +
          '</div>'
        );
      })
      .join('') +
      '<div class="lateral__grupo">' +
      '<button type="button" class="lateral__enlace" id="salirLateral">' +
      util.icono('salir') +
      '<span>Cerrar sesión</span></button></div>';

    nodo('#salirLateral').addEventListener('click', function () {
      salir('salida');
    });

    nodos('.lateral__enlace[data-ruta]').forEach(function (enlace) {
      enlace.addEventListener('click', function (evento) {
        evento.preventDefault();
        cerrarMenuMovil();
        irA(enlace.getAttribute('data-ruta'));
      });
    });
  }

  function marcarNavegacion(ruta) {
    nodos('.lateral__enlace[data-ruta]').forEach(function (enlace) {
      var activo = enlace.getAttribute('data-ruta') === ruta;
      enlace.classList.toggle('activo', activo);
      if (activo) {
        enlace.setAttribute('aria-current', 'page');
      } else {
        enlace.removeAttribute('aria-current');
      }
    });
  }

  function anunciar(mensaje) {
    var region = nodo('#anuncioVista');
    if (region) {
      region.textContent = mensaje;
    }
  }

  function pintarIdentidad() {
    var usuario = estado.sesion.usuario;
    nodo('#nombreUsuario').textContent = usuario.nombreCompleto;
    nodo('#avatarUsuario').textContent = util.iniciales(usuario.nombreCompleto);
    nodo('#metaUsuario').textContent =
      (usuario.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Cliente') +
      ' · ' +
      (usuario.correo || '');
    nodo('#nombreMarca').textContent = config.nombreBanco || 'Banco ATM';
    nodo('#selloMarca').textContent = config.nombreCorto || 'BA';
    document.title =
      (config.nombreBanco || 'Banco ATM') +
      ' · ' +
      (usuario.rol === 'ADMINISTRADOR' ? 'Administración' : 'Mi banca');
    nodo('#pieCanal').textContent =
      'Canal web · ' + util.etiquetaCanal(config.canal || 'WEB');
  }

  function actualizarContadorSesion() {
    var expira = estado.sesion.expiraEn;
    var indicador = nodo('#indicadorSesion');
    var texto = nodo('#textoSesion');

    if (!expira) {
      texto.textContent = 'Sesión activa';
      return;
    }

    var restante = Math.floor((expira - Date.now()) / 1000);

    if (restante <= 0) {
      terminarSesionLocal('expirada');
      return;
    }

    var minutos = Math.floor(restante / 60);
    var segundos = restante % 60;
    texto.textContent =
      'Sesión: ' + minutos + ':' + String(segundos).padStart(2, '0');
    indicador.classList.toggle('sesion--por-vencer', restante <= 120);
  }

  function reiniciarInactividad() {
    window.clearTimeout(estado.temporizadorInactividad);
    var minutos = config.minutosInactividad || 10;
    estado.temporizadorInactividad = window.setTimeout(function () {
      terminarSesionLocal('inactividad');
    }, minutos * 60 * 1000);
  }

  function abrirMenuMovil() {
    nodo('#lateral').classList.add('abierto');
    sincronizarBotonMenu(true);
    if (!nodo('#veloLateral')) {
      var velo = document.createElement('div');
      velo.className = 'velo-lateral';
      velo.id = 'veloLateral';
      velo.addEventListener('click', cerrarMenuMovil);
      document.body.appendChild(velo);
    }
  }

  function sincronizarBotonMenu(abierto) {
    var boton = nodo('#botonMenu');
    if (boton) {
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      boton.setAttribute(
        'aria-label',
        abierto ? 'Cerrar menú de secciones' : 'Abrir menú de secciones',
      );
    }
  }

  function cerrarMenuMovil() {
    nodo('#lateral').classList.remove('abierto');
    sincronizarBotonMenu(false);
    var velo = nodo('#veloLateral');
    if (velo && velo.parentNode) {
      velo.parentNode.removeChild(velo);
    }
  }

  function irA(ruta) {
    var destino = rutaDeClave(claveDeRuta(ruta));

    if (window.location.pathname === destino && !window.location.hash) {
      resolverRuta();
      return;
    }

    window.history.pushState({ ruta: destino }, '', destino);
    resolverRuta();
  }

  function contexto() {
    return {
      api: api,
      util: util,
      config: config,
      sesion: estado.sesion,
      irA: irA,
      mostrarCarga: mostrarCarga,
      recargar: function () {
        resolverRuta();
      },
    };
  }

  function resolverRuta() {
    var rutaSolicitada = rutaActualDelNavegador();
    var clave = claveDeRuta(rutaSolicitada) || claveDeRuta(rutaPorDefecto());
    var vista = vistas[clave];

    if (!vista || vista.rol !== estado.sesion.usuario.rol) {
      var porDefecto = rutaPorDefecto();
      if (rutaDeClave(clave) !== porDefecto) {
        window.history.replaceState({ ruta: porDefecto }, '', porDefecto);
      }
      clave = claveDeRuta(porDefecto);
      vista = vistas[clave];
    }

    if (!vista) {
      nodo('#contenido').innerHTML = util.vacio(
        'Sección no disponible',
        'Elija una opción del menú lateral.',
      );
      return;
    }

    estado.rutaActual = rutaDeClave(clave);
    if (window.location.pathname !== estado.rutaActual || window.location.hash) {
      window.history.replaceState({ ruta: estado.rutaActual }, '', estado.rutaActual);
    }
    marcarNavegacion(estado.rutaActual);
    reiniciarInactividad();

    var contenido = nodo('#contenido');
    contenido.setAttribute('aria-busy', 'true');
    contenido.innerHTML =
      '<header class="vista__encabezado">' +
      '<h1 class="vista__titulo">' +
      util.escapar(vista.titulo) +
      '</h1>' +
      '<p class="vista__texto">' +
      util.escapar(vista.texto || '') +
      '</p>' +
      '</header>' +
      '<div id="cuerpoVista"><div class="vacio">Cargando…</div></div>';

    var cuerpo = nodo('#cuerpoVista');
    document.title = vista.titulo + ' · ' + (config.nombreBanco || 'Banco ATM');

    Promise.resolve(vista.render(cuerpo, contexto()))
      .then(function () {
        contenido.setAttribute('aria-busy', 'false');
        anunciar(vista.titulo + ' cargado.');
      })
      .catch(function (error) {
        contenido.setAttribute('aria-busy', 'false');
        cuerpo.innerHTML =
          '<div class="aviso aviso--error" role="alert">' +
          util.escapar(
            error && error.message
              ? error.message
              : 'No fue posible cargar esta sección.',
          ) +
          '</div>';
        anunciar(
          util.frase('No fue posible cargar {seccion}.', {
            seccion: util.t(vista.titulo),
          }),
        );
      });

    var titulo = nodo('.vista__titulo');
    if (titulo) {
      titulo.setAttribute('tabindex', '-1');
      titulo.focus({ preventScroll: true });
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function iniciar() {
    if (!api.haySesion()) {
      window.location.href = '/login';
      return;
    }

    estado.sesion = api.obtenerSesion();

    if (!estado.sesion || !estado.sesion.usuario) {
      terminarSesionLocal('expirada');
      return;
    }

    api.alPerderSesion(function () {
      terminarSesionLocal('expirada');
    });

    pintarIdentidad();
    construirNavegacion();

    nodo('#botonMenu').innerHTML = util.icono('menu');
    nodo('#botonMenu').addEventListener('click', abrirMenuMovil);
    nodo('#botonSalir').addEventListener('click', function () {
      salir('salida');
    });

    ['click', 'keydown', 'mousemove', 'touchstart'].forEach(function (evento) {
      document.addEventListener(evento, reiniciarInactividad, { passive: true });
    });

    actualizarContadorSesion();
    estado.temporizadorSesion = window.setInterval(actualizarContadorSesion, 1000);

    window.addEventListener('popstate', resolverRuta);

    if (window.PortalNotificaciones) {
      window.PortalNotificaciones.iniciar();
    }

    if (window.PortalAsistente) {
      window.PortalAsistente.iniciar({ publico: false });
    }

    document.addEventListener('notificacionrecibida', function () {
      if (estado.rutaActual === '/avisos' || estado.rutaActual === '/resumen') {
        resolverRuta();
      }
    });

    document.addEventListener('idiomacambiado', function () {
      construirNavegacion();
      pintarIdentidad();
      if (estado.rutaActual) {
        resolverRuta();
      }
    });

    document.addEventListener('click', function (evento) {
      var disparador = evento.target.closest('[data-ir]');
      if (!disparador) {
        return;
      }
      evento.preventDefault();
      irA(disparador.getAttribute('data-ir'));
    });

    resolverRuta();
  }

  window.PortalNavegacion = {
    irA: irA,
    rutaActual: function () {
      return estado.rutaActual;
    },
  };

  document.addEventListener('DOMContentLoaded', iniciar);
})();
