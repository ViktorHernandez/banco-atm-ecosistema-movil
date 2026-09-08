(function () {
  'use strict';

  var config = window.PORTAL_CONFIG || {};
  var api = window.PortalApi;
  var util = window.PortalUtil;
  var nodo = util.nodo;
  var nodos = util.nodos;

  var RUTAS_PANEL = {
    '/login': 'acceso',
    '/crearcuenta': 'crearcuenta',
    '/verificar': 'verificar',
  };

  var PANEL_RUTA = {
    acceso: '/login',
    crearcuenta: '/crearcuenta',
    verificar: '/verificar',
  };

  function aplicarIdentidad() {
    var nombre = config.nombreBanco || 'Banco ATM';

    nodos('.marca__nombre').forEach(function (elemento) {
      elemento.textContent = nombre;
    });
    nodos('.marca__sello').forEach(function (elemento) {
      elemento.textContent = config.nombreCorto || 'BA';
    });
    document.title = nombre + ' · Banca en línea';

    if (config.telefonoAtencion) {
      nodo('#telefonoCinta').textContent = config.telefonoAtencion;
      nodo('#pieTelefono').textContent = config.telefonoAtencion;
    }
    if (config.correoAtencion) {
      nodo('#pieCorreo').textContent = config.correoAtencion;
    }

    if (config.atmUrl) {
      ['#enlaceCajero', '#enlaceCajeroPie'].forEach(function (selector) {
        var enlace = nodo(selector);
        if (enlace) {
          enlace.href = config.atmUrl;
        }
      });
    }

    nodo('#pieLegal').textContent =
      '© ' +
      new Date().getFullYear() +
      ' ' +
      nombre +
      '. Proyecto académico sin operación financiera real.';
  }

  function dibujarIconos() {
    nodos('[data-icono]').forEach(function (elemento) {
      elemento.innerHTML = util.icono(elemento.getAttribute('data-icono'));
    });
  }

  function mostrarPanel(nombre, opciones) {
    var ajustes = opciones || {};

    nodos('.acceso__panel').forEach(function (panel) {
      panel.classList.toggle(
        'activa',
        panel.getAttribute('data-panel-contenido') === nombre,
      );
    });

    nodos('.acceso__pestana').forEach(function (pestana) {
      var destino = pestana.getAttribute('data-panel');
      pestana.classList.toggle(
        'activa',
        destino === nombre || (nombre === 'verificar' && destino === 'crearcuenta'),
      );
    });

    if (ajustes.actualizarUrl !== false) {
      var ruta = PANEL_RUTA[nombre] || '/login';
      if (window.location.pathname !== ruta) {
        window.history.pushState({ panel: nombre }, '', ruta);
      }
    }

    if (ajustes.desplazar !== false) {
      var seccion = nodo('#acceso');
      if (seccion) {
        seccion.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function panelDeRutaActual() {
    return RUTAS_PANEL[window.location.pathname] || 'acceso';
  }

  function prepararNavegacionPaneles() {
    nodos('[data-panel]').forEach(function (disparador) {
      disparador.addEventListener('click', function (evento) {
        if (disparador.tagName === 'A') {
          evento.preventDefault();
        }
        mostrarPanel(disparador.getAttribute('data-panel'));
      });
    });

    window.addEventListener('popstate', function () {
      mostrarPanel(panelDeRutaActual(), {
        actualizarUrl: false,
        desplazar: false,
      });
    });
  }

  var CAMPOS_POR_PANEL = {
    '#avisoAcceso': ['#correo', '#password'],
    '#avisoRegistro': [
      '#registroNombre',
      '#registroCorreo',
      '#registroTelefono',
      '#registroPassword',
      '#registroConfirmacion',
    ],
    '#avisoVerificacion': ['#verificarCorreo', '#verificarCodigo'],
  };

  function marcarCampos(selector, invalido) {
    (CAMPOS_POR_PANEL[selector] || []).forEach(function (id) {
      var campo = nodo(id);
      if (!campo) {
        return;
      }
      if (invalido) {
        campo.setAttribute('aria-invalid', 'true');
        campo.setAttribute('aria-describedby', selector.replace('#', ''));
      } else {
        campo.removeAttribute('aria-invalid');
        campo.removeAttribute('aria-describedby');
      }
    });
  }

  function mostrarAviso(selector, mensaje, tipo) {
    var caja = nodo(selector);
    if (!caja) {
      return;
    }
    if (!mensaje) {
      caja.hidden = true;
      caja.textContent = '';
      caja.removeAttribute('role');
      marcarCampos(selector, false);
      return;
    }
    caja.className = 'aviso' + (tipo ? ' aviso--' + tipo : '');
    caja.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    caja.textContent = mensaje;
    caja.hidden = false;
    marcarCampos(selector, tipo === 'error');
  }

  function mostrarCarga(visible) {
    nodo('#capaCarga').hidden = !visible;
  }

  function verificarServicio() {
    var etiqueta = nodo('#estadoServicio');
    api
      .estadoServicio()
      .then(function (datos) {
        var baseDatos = util.t(
          datos && datos.database === 'connected'
            ? 'base de datos conectada'
            : 'base de datos no disponible',
        );
        etiqueta.textContent = util.frase(
          'API bancaria disponible · {estado}.',
          { estado: baseDatos },
        );
      })
      .catch(function () {
        etiqueta.textContent = util.frase(
          'No hay enlace con la API bancaria en {url}. Inicie el backend antes de entrar.',
          { url: api.obtenerBaseUrl() },
        );
      });
  }

  var codigoSegundoFactor = '';

  function pedirSegundoFactor(correo, password) {
    util.abrirModal({
      titulo: util.t('Verificación en dos pasos'),
      contenido:
        '<p class="texto-tenue">' +
        util.escapar(
          util.t(
            'Introduzca el código de su aplicación autenticadora para continuar.',
          ),
        ) +
        '</p>' +
        '<label class="campo"><span class="campo__etiqueta">' +
        util.escapar(util.t('Código de su aplicación autenticadora')) +
        '</span><input type="text" id="codigoSegundoFactor" class="campo__control" ' +
        'inputmode="numeric" autocomplete="one-time-code" maxlength="11" /></label>' +
        '<p class="campo__ayuda">' +
        util.escapar(
          util.t(
            'Puede usar uno de sus códigos de recuperación si no tiene su dispositivo.',
          ),
        ) +
        '</p>' +
        '<div id="avisoSegundoFactor" hidden></div>',
      botones: [
        { texto: 'Cancelar', clase: 'boton--secundario' },
        {
          texto: 'Verificar',
          clase: 'boton',
          cerrar: false,
          accion: function (capa) {
            var aviso = util.nodo('#avisoSegundoFactor', capa);
            var codigo = (
              util.nodo('#codigoSegundoFactor', capa).value || ''
            ).trim();

            api
              .login(correo, password, codigo)
              .then(function (datos) {
                if (datos && datos.requiereSegundoFactor) {
                  aviso.className = 'aviso aviso--error';
                  aviso.setAttribute('role', 'alert');
                  aviso.textContent = util.t(
                    'El código de verificación no es válido.',
                  );
                  aviso.hidden = false;
                  return;
                }
                window.location.href = '/resumen';
              })
              .catch(function (error) {
                aviso.className = 'aviso aviso--error';
                aviso.setAttribute('role', 'alert');
                aviso.textContent = util.t(
                  (error && error.message) ||
                    'El código de verificación no es válido.',
                );
                aviso.hidden = false;
              });
          },
        },
      ],
    });
  }

  function abrirRecuperacion() {
    util.abrirModal({
      titulo: util.t('Recuperar su contraseña'),
      contenido:
        '<p class="texto-tenue">' +
        util.escapar(
          util.t(
            'Escriba el correo de su cuenta y le enviaremos un código para establecer una contraseña nueva.',
          ),
        ) +
        '</p>' +
        '<label class="campo"><span class="campo__etiqueta">' +
        util.escapar(util.t('Correo electrónico')) +
        '</span><input type="email" id="correoRecuperar" class="campo__control" autocomplete="email" /></label>' +
        '<div id="avisoRecuperar" hidden></div>',
      botones: [
        { texto: 'Cancelar', clase: 'boton--secundario' },
        {
          texto: 'Enviar código',
          clase: 'boton',
          cerrar: false,
          accion: function (capa) {
            var aviso = util.nodo('#avisoRecuperar', capa);
            var correo = (
              util.nodo('#correoRecuperar', capa).value || ''
            ).trim();

            if (!correo) {
              aviso.className = 'aviso aviso--error';
              aviso.setAttribute('role', 'alert');
              aviso.textContent = util.t('Escriba su correo para continuar.');
              aviso.hidden = false;
              return;
            }

            api
              .solicitarRecuperacion(
                correo,
                window.PortalI18n ? window.PortalI18n.actual() : 'es',
              )
              .then(function (respuesta) {
                if (capa.parentNode) {
                  capa.parentNode.removeChild(capa);
                }
                abrirRestablecer(correo, respuesta && respuesta.mensaje);
              })
              .catch(function () {
                aviso.className = 'aviso aviso--error';
                aviso.setAttribute('role', 'alert');
                aviso.textContent = util.t(
                  'No fue posible completar la solicitud. Inténtelo de nuevo.',
                );
                aviso.hidden = false;
              });
          },
        },
      ],
    });
  }

  function abrirRestablecer(correo, mensaje) {
    util.abrirModal({
      titulo: util.t('Recuperar su contraseña'),
      contenido:
        '<div class="aviso aviso--exito">' +
        util.escapar(
          util.t(
            mensaje ||
              'Si el correo corresponde a una cuenta activa, le enviamos un código para restablecer su contraseña.',
          ),
        ) +
        '</div>' +
        '<p class="texto-tenue">' +
        util.escapar(
          util.t('Escriba el código que recibió por correo y su contraseña nueva.'),
        ) +
        '</p>' +
        '<label class="campo"><span class="campo__etiqueta">' +
        util.escapar(util.t('Código recibido')) +
        '</span><input type="text" id="codigoRecuperar" class="campo__control" ' +
        'inputmode="numeric" maxlength="6" autocomplete="one-time-code" /></label>' +
        '<label class="campo"><span class="campo__etiqueta">' +
        util.escapar(util.t('Contraseña nueva')) +
        '</span><input type="password" id="passwordNuevo" class="campo__control" autocomplete="new-password" /></label>' +
        '<label class="campo"><span class="campo__etiqueta">' +
        util.escapar(util.t('Repita la contraseña nueva')) +
        '</span><input type="password" id="passwordRepetido" class="campo__control" autocomplete="new-password" /></label>' +
        '<div id="avisoRestablecer" hidden></div>',
      botones: [
        { texto: 'Cancelar', clase: 'boton--secundario' },
        {
          texto: 'Establecer contraseña',
          clase: 'boton',
          cerrar: false,
          accion: function (capa) {
            var aviso = util.nodo('#avisoRestablecer', capa);
            var codigo = (util.nodo('#codigoRecuperar', capa).value || '').trim();
            var nueva = util.nodo('#passwordNuevo', capa).value || '';
            var repetida = util.nodo('#passwordRepetido', capa).value || '';

            function fallar(texto) {
              aviso.className = 'aviso aviso--error';
              aviso.setAttribute('role', 'alert');
              aviso.textContent = util.t(texto);
              aviso.hidden = false;
            }

            if (nueva.length < 8) {
              fallar('La contraseña debe tener al menos 8 caracteres.');
              return;
            }

            if (nueva !== repetida) {
              fallar('Las contraseñas no coinciden.');
              return;
            }

            api
              .restablecerPassword(correo, codigo, nueva)
              .then(function () {
                if (capa.parentNode) {
                  capa.parentNode.removeChild(capa);
                }
                mostrarAviso(
                  '#avisoAcceso',
                  util.t(
                    'Su contraseña fue actualizada. Ya puede entrar con la nueva contraseña.',
                  ),
                  'exito',
                );
                nodo('#correo').value = correo;
                nodo('#password').focus();
              })
              .catch(function (error) {
                fallar(
                  (error && error.message) ||
                    'El código no es válido o ya expiró. Solicite uno nuevo.',
                );
              });
          },
        },
      ],
    });
  }

  function entrar(evento) {
    evento.preventDefault();

    var correo = nodo('#correo').value.trim();
    var password = nodo('#password').value;

    if (!correo || !password) {
      mostrarAviso('#avisoAcceso', 'Escriba su correo y su contraseña para continuar.', 'error');
      return;
    }

    mostrarAviso('#avisoAcceso', '');
    mostrarCarga(true);
    nodo('#botonAcceso').disabled = true;

    api
      .login(correo, password, codigoSegundoFactor)
      .then(function (datos) {
        if (datos && datos.requiereSegundoFactor) {
          mostrarCarga(false);
          nodo('#botonAcceso').disabled = false;
          pedirSegundoFactor(correo, password);
          return;
        }
        window.location.href = '/resumen';
      })
      .catch(function (error) {
        mostrarCarga(false);
        nodo('#botonAcceso').disabled = false;

        if (error.codigo === 403 && /verificad/i.test(error.message || '')) {
          nodo('#verificarCorreo').value = correo;
          mostrarPanel('verificar');
          mostrarAviso('#avisoVerificacion', error.message, 'atencion');
          return;
        }

        mostrarAviso('#avisoAcceso', error.message, 'error');
        nodo('#password').value = '';
        nodo('#password').focus();
      });
  }

  function registrar(evento) {
    evento.preventDefault();

    var nombre = nodo('#registroNombre').value.trim();
    var correo = nodo('#registroCorreo').value.trim();
    var telefono = nodo('#registroTelefono').value.trim();
    var password = nodo('#registroPassword').value;
    var confirmacion = nodo('#registroConfirmacion').value;

    if (!nombre || !correo || !telefono || !password) {
      mostrarAviso('#avisoRegistro', 'Complete todos los campos para continuar.', 'error');
      return;
    }

    if (password.length < 8) {
      mostrarAviso('#avisoRegistro', 'La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    if (password !== confirmacion) {
      mostrarAviso('#avisoRegistro', 'Las contraseñas no coinciden.', 'error');
      return;
    }

    mostrarAviso('#avisoRegistro', '');
    mostrarCarga(true);
    nodo('#botonRegistro').disabled = true;

    api
      .registrar({
        nombreCompleto: nombre,
        correo: correo,
        telefono: telefono,
        password: password,
      })
      .then(function (resultado) {
        mostrarCarga(false);
        nodo('#botonRegistro').disabled = false;
        nodo('#formularioRegistro').reset();

        nodo('#verificarCorreo').value = resultado.correo || correo;
        nodo('#textoVerificacion').textContent =
          'Enviamos un código de 6 dígitos a ' +
          (resultado.correo || correo) +
          '. El código vence en 30 minutos.';

        mostrarPanel('verificar');
        mostrarAviso(
          '#avisoVerificacion',
          resultado.mensaje,
          resultado.correoEnviado === false ? 'atencion' : 'exito',
        );
      })
      .catch(function (error) {
        mostrarCarga(false);
        nodo('#botonRegistro').disabled = false;
        mostrarAviso('#avisoRegistro', error.message, 'error');
      });
  }

  function verificar(evento) {
    evento.preventDefault();

    var correo = nodo('#verificarCorreo').value.trim();
    var codigo = nodo('#verificarCodigo').value.trim();

    if (!correo || !codigo) {
      mostrarAviso('#avisoVerificacion', 'Escriba su correo y el código recibido.', 'error');
      return;
    }

    mostrarAviso('#avisoVerificacion', '');
    mostrarCarga(true);
    nodo('#botonVerificar').disabled = true;

    api
      .verificarCorreo(correo, codigo)
      .then(function (resultado) {
        mostrarCarga(false);
        nodo('#botonVerificar').disabled = false;

        nodo('#correo').value = correo;
        mostrarPanel('acceso');
        mostrarAviso('#avisoAcceso', resultado.mensaje, 'exito');
        nodo('#password').focus();
      })
      .catch(function (error) {
        mostrarCarga(false);
        nodo('#botonVerificar').disabled = false;
        mostrarAviso('#avisoVerificacion', error.message, 'error');
      });
  }

  function reenviar() {
    var correo = nodo('#verificarCorreo').value.trim();

    if (!correo) {
      mostrarAviso('#avisoVerificacion', 'Escriba su correo para reenviarle el código.', 'error');
      return;
    }

    mostrarCarga(true);
    api
      .reenviarCodigo(correo)
      .then(function (resultado) {
        mostrarCarga(false);
        mostrarAviso('#avisoVerificacion', resultado.mensaje, 'exito');
      })
      .catch(function (error) {
        mostrarCarga(false);
        mostrarAviso('#avisoVerificacion', error.message, 'error');
      });
  }

  function abrirContacto() {
    var telefono = config.telefonoAtencion || '56 2972 7628';
    var motivos = config.motivosContacto || [];

    var modal = util.abrirModal({
      titulo: 'Atención a clientes',
      contenido:
        '<p class="texto-tenue">' +
        util.escapar(
          util.frase(
            'Elija el motivo de su consulta y le abriremos WhatsApp con el mensaje preparado. También puede escribirnos al {telefono}.',
            { telefono: telefono },
          ),
        ) +
        '</p>' +
        '<div class="contacto__motivos">' +
        motivos
          .map(function (motivo) {
            return (
              '<button type="button" class="contacto__motivo" data-motivo="' +
              util.escapar(motivo.clave) +
              '">' +
              '<span class="contacto__extension">' +
              util.escapar(motivo.extension) +
              '</span>' +
              '<span><strong>' +
              util.escapar(util.t(motivo.titulo)) +
              '</strong><span class="contacto__texto">' +
              util.escapar(util.t(motivo.texto)) +
              '</span></span></button>'
            );
          })
          .join('') +
        '</div>' +
        '<div id="contactoDetalle"></div>',
      botones: [{ texto: 'Cerrar', clase: 'boton--secundario' }],
    });

    util.nodos('[data-motivo]', modal.capa).forEach(function (boton) {
      boton.addEventListener('click', function () {
        util.nodos('[data-motivo]', modal.capa).forEach(function (otro) {
          otro.classList.remove('activa');
        });
        boton.classList.add('activa');

        var motivo = motivos.filter(function (item) {
          return item.clave === boton.getAttribute('data-motivo');
        })[0];

        if (!motivo) {
          return;
        }

        var soloDigitos = telefono.replace(/\D/g, '');
        var numeroInternacional =
          (config.ladaAtencion || '52') + soloDigitos;
        var mensaje = util.frase(
          'Hola, escribo desde el portal de {banco}. Solicito información sobre: {motivo}. {detalle}',
          {
            banco: config.nombreBanco || 'Banco ATM',
            motivo: util.t(motivo.titulo),
            detalle: util.t(motivo.texto),
          },
        );

        util.nodo('#contactoDetalle', modal.capa).innerHTML =
          '<div class="aviso aviso--exito">' +
          util.escapar(
            util.frase(
              'Le atenderemos sobre {motivo}. Enviaremos su consulta por WhatsApp al {telefono} con el asunto ya preparado.',
              {
                motivo: util.t(motivo.titulo).toLowerCase(),
                telefono: telefono,
              },
            ),
          ) +
          '</div>' +
          '<div class="acciones-fila">' +
          '<a class="boton" target="_blank" rel="noopener" href="https://wa.me/' +
          util.escapar(numeroInternacional) +
          '?text=' +
          encodeURIComponent(mensaje) +
          '">Enviar mensaje por WhatsApp</a>' +
          '<a class="boton boton--secundario" href="mailto:' +
          util.escapar(config.correoAtencion || 'atencion@bancoatm.test') +
          '?subject=' +
          encodeURIComponent(
            util.frase('Consulta: {motivo}', { motivo: util.t(motivo.titulo) }),
          ) +
          '&body=' +
          encodeURIComponent(mensaje) +
          '">Escribir un correo</a>' +
          '</div>' +
          '<p class="campo__ayuda">' +
          util.escapar(
            util.frase(
              'Atención las 24 horas. {banco} nunca le pedirá su contraseña ni su PIN por WhatsApp, correo o teléfono.',
              { banco: config.nombreBanco || 'Banco ATM' },
            ),
          ) +
          '</p>';
      });
    });
  }

  function revisarMotivoSalida() {
    var motivo = null;
    try {
      motivo = window.sessionStorage.getItem('portal.motivoSalida');
      window.sessionStorage.removeItem('portal.motivoSalida');
    } catch (error) {
      motivo = null;
    }

    if (motivo === 'expirada') {
      mostrarAviso('#avisoAcceso', 'Su sesión venció por seguridad. Entre de nuevo para continuar.', 'atencion');
    } else if (motivo === 'inactividad') {
      mostrarAviso('#avisoAcceso', 'Cerramos su sesión por inactividad. Entre de nuevo para continuar.', 'atencion');
    } else if (motivo === 'salida') {
      mostrarAviso('#avisoAcceso', 'Su sesión se cerró correctamente.', 'exito');
    }
  }

  function aplicarParametrosDeUrl() {
    var parametros;
    try {
      parametros = new URLSearchParams(window.location.search);
    } catch (error) {
      return false;
    }

    var correo = parametros.get('correo');
    var codigo = parametros.get('codigo');

    if (!correo && !codigo) {
      return false;
    }

    if (correo) {
      nodo('#verificarCorreo').value = correo;
    }
    if (codigo) {
      nodo('#verificarCodigo').value = codigo;
    }

    return true;
  }

  function iniciar() {
    aplicarIdentidad();
    dibujarIconos();
    prepararNavegacionPaneles();
    revisarMotivoSalida();
    verificarServicio();

    nodos('.credencial').forEach(function (boton) {
      boton.addEventListener('click', function () {
        nodo('#correo').value = boton.getAttribute('data-correo');
        nodo('#password').value = boton.getAttribute('data-password');
        mostrarAviso('#avisoAcceso', '');
        nodo('#botonAcceso').focus();
      });
    });

    nodo('#formularioAcceso').addEventListener('submit', entrar);

    var enlaceRecuperar = document.getElementById('enlaceRecuperar');
    if (enlaceRecuperar) {
      enlaceRecuperar.addEventListener('click', abrirRecuperacion);
    }
    nodo('#formularioRegistro').addEventListener('submit', registrar);
    nodo('#formularioVerificacion').addEventListener('submit', verificar);
    nodo('#botonReenviar').addEventListener('click', reenviar);

    nodo('#telefonoCinta').addEventListener('click', abrirContacto);
    nodo('#pieTelefono').addEventListener('click', abrirContacto);

    var traeDatosDeCorreo = aplicarParametrosDeUrl();
    var panelInicial = traeDatosDeCorreo ? 'verificar' : panelDeRutaActual();

    mostrarPanel(panelInicial, {
      actualizarUrl: false,
      desplazar: panelInicial !== 'acceso' || window.location.pathname !== '/',
    });

    if (window.PortalAsistente) {
      window.PortalAsistente.iniciar({ publico: true });
    }

    if (api.haySesion()) {
      window.location.href = '/resumen';
    }
  }

  document.addEventListener('DOMContentLoaded', iniciar);
})();
