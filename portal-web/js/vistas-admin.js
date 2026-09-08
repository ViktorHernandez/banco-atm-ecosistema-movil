(function () {
  'use strict';

  function mensajeErrorEliminacion(error) {
    var codigo = error && error.codigo ? error.codigo : 0;

    if (codigo === 401) {
      return util.t('Su sesión venció. Entre de nuevo para continuar.');
    }
    if (codigo === 403) {
      return util.t('Su perfil no tiene permiso para eliminar cuentas.');
    }
    if (codigo === 404) {
      return util.t('El usuario ya no existe.');
    }
    if (codigo === 400 || codigo === 409) {
      return error && error.message
        ? util.t(error.message)
        : util.t('No fue posible eliminar la cuenta.');
    }
    return error && error.message
      ? util.t(error.message)
      : util.t('No fue posible eliminar la cuenta.');
  }

  function comprobanteReporte(reporte) {
    var bloque = util.bloqueComprobante(util.t('REPORTE DE OPERACIONES'), [
      ['Generado', util.fecha(reporte.generadoEn)],
      ['Usuarios registrados', util.numero(reporte.totales.usuarios)],
      ['Cuentas abiertas', util.numero(reporte.totales.cuentas)],
      [
        'Operaciones analizadas',
        util.numero(reporte.totales.transaccionesAnalizadas),
      ],
      ['Exitosas', util.numero(reporte.totales.exitosas)],
      ['Fallidas', util.numero(reporte.totales.fallidas)],
      ['Monto operado', util.moneda(reporte.totales.montoOperado)],
    ]);

    return []
      .concat(bloque.titulo, bloque.separador, bloque.lineas)
      .join('\n');
  }

  var api = window.PortalApi;
  var util = window.PortalUtil;

  window.PortalVistas = window.PortalVistas || {};

  function barra(etiqueta, valor, total, variante) {
    var porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;
    return (
      '<div class="barra">' +
      '<div class="barra__cabeza"><span>' +
      util.escapar(etiqueta) +
      '</span><span class="cifra">' +
      util.escapar(util.numero(valor)) +
      ' · ' +
      porcentaje +
      '%</span></div>' +
      '<div class="barra__pista"><div class="barra__valor' +
      (variante ? ' barra__valor--' + variante : '') +
      '" style="width:' +
      porcentaje +
      '%"></div></div>' +
      '</div>'
    );
  }

  function varianteCanal(canal) {
    if (canal === 'ATM') {
      return 'acento';
    }
    if (canal === 'APP') {
      return 'ambar';
    }
    return null;
  }

  window.PortalVistas['admin'] = {
    titulo: 'Panel administrativo',
    texto:
      'Estado general del banco a partir de las operaciones registradas por todos los canales.',
    etiqueta: 'Panel',
    icono: 'panel',
    grupo: 'Administración',
    rol: 'ADMINISTRADOR',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Generando el panel…</div>';

      return Promise.all([
        api.adminReporte(),
        api.adminTarjetas().catch(function () {
          return [];
        }),
      ]).then(function (resultados) {
        var reporte = resultados[0];
        var tarjetas = resultados[1] || [];

        var bloqueadas = tarjetas.filter(function (tarjeta) {
          return tarjeta.estado === 'BLOQUEADA';
        }).length;

        var totalCanal = Object.keys(reporte.porCanal || {}).reduce(function (
          suma,
          canal,
        ) {
          return suma + reporte.porCanal[canal];
        },
        0);

        contenedor.innerHTML =
          '<div class="rejilla rejilla--tres" style="margin-bottom:20px">' +
          '<div class="indicador"><span class="rotulo">Usuarios</span>' +
          '<div class="indicador__valor">' +
          util.escapar(util.numero(reporte.totales.usuarios)) +
          '</div><div class="indicador__nota">clientes y administradores</div></div>' +
          '<div class="indicador"><span class="rotulo">Cuentas</span>' +
          '<div class="indicador__valor">' +
          util.escapar(util.numero(reporte.totales.cuentas)) +
          '</div><div class="indicador__nota">activas en el banco</div></div>' +
          '<div class="indicador"><span class="rotulo">Monto operado</span>' +
          '<div class="indicador__valor">' +
          util.escapar(util.moneda(reporte.totales.montoOperado)) +
          '</div><div class="indicador__nota">en las operaciones analizadas</div></div>' +
          '<div class="indicador"><span class="rotulo">Tarjetas bloqueadas</span>' +
          '<div class="indicador__valor">' +
          util.escapar(util.numero(bloqueadas)) +
          '</div><div class="indicador__nota">de ' +
          util.escapar(util.numero(tarjetas.length)) +
          ' emitidas</div></div>' +
          '</div>' +
          '<div class="rejilla rejilla--dos">' +
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado"><h2>Operaciones por canal</h2>' +
          '<button type="button" class="enlace-accion" data-ir="/admin/reportes">Ver reporte</button></div>' +
          '<div class="barras">' +
          (totalCanal
            ? Object.keys(reporte.porCanal)
                .map(function (canal) {
                  return barra(
                    util.etiquetaCanal(canal),
                    reporte.porCanal[canal],
                    totalCanal,
                    varianteCanal(canal),
                  );
                })
                .join('')
            : util.vacio('Sin operaciones', 'Todavía no hay transacciones registradas.')) +
          '</div>' +
          '</section>' +
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado"><h2>Resultado de las operaciones</h2></div>' +
          '<div class="barras">' +
          barra(
            'Exitosas',
            reporte.totales.exitosas,
            reporte.totales.transaccionesAnalizadas,
            'acento',
          ) +
          barra(
            'Fallidas',
            reporte.totales.fallidas,
            reporte.totales.transaccionesAnalizadas,
            'alerta',
          ) +
          '</div>' +
          '<p class="texto-tenue" style="margin-top:16px">Analizamos las ' +
          util.escapar(util.numero(reporte.totales.transaccionesAnalizadas)) +
          ' operaciones más recientes del banco.</p>' +
          '</section>' +
          '</div>' +
          '<section class="tarjeta" style="margin-top:20px">' +
          '<div class="tarjeta__encabezado"><h2>Últimas operaciones del banco</h2>' +
          '<button type="button" class="enlace-accion" data-ir="/admin/auditoria">Ver auditoría</button></div>' +
          (reporte.ultimasOperaciones.length
            ? '<div class="tabla-envoltura"><table class="tabla">' +
              '<thead><tr><th scope="col">Fecha</th><th scope="col">Operación</th><th scope="col">Canal</th><th scope="col">Origen</th><th scope="col">Destino</th>' +
              '<th scope="col">Estado</th><th scope="col" class="tabla__numero">Monto</th></tr></thead><tbody>' +
              reporte.ultimasOperaciones
                .map(function (operacion) {
                  return (
                    '<tr><td>' +
                    util.escapar(util.fecha(operacion.fecha)) +
                    '</td><td>' +
                    util.escapar(util.etiquetaTipo(operacion.tipo)) +
                    '</td><td>' +
                    util.escapar(util.etiquetaCanal(operacion.canal)) +
                    '</td><td class="dato">' +
                    util.escapar(operacion.origen || '—') +
                    '</td><td class="dato">' +
                    util.escapar(operacion.destino || '—') +
                    '</td><td><span class="insignia ' +
                    (operacion.estado === 'EXITOSA'
                      ? 'insignia--activa'
                      : 'insignia--bloqueada') +
                    '">' +
                    util.escapar(operacion.estado) +
                    '</span></td><td class="tabla__numero">' +
                    util.escapar(util.moneda(operacion.monto)) +
                    '</td></tr>'
                  );
                })
                .join('') +
              '</tbody></table></div>'
            : util.vacio('Sin operaciones', 'Todavía no hay transacciones registradas.')) +
          '</section>';

        util.nodos('[data-ir]', contenedor).forEach(function (boton) {
          boton.addEventListener('click', function () {
            contexto.irA(boton.getAttribute('data-ir'));
          });
        });
      });
    },
  };

  window.PortalVistas['admin/usuarios'] = {
    titulo: 'Usuarios',
    texto:
      'Alta de clientes con su cuenta y tarjeta, actualización de datos y consulta de movimientos.',
    etiqueta: 'Usuarios',
    icono: 'usuarios',
    grupo: 'Administración',
    rol: 'ADMINISTRADOR',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Consultando usuarios…</div>';

      return api.adminUsuarios().then(function (usuarios) {
        contenedor.innerHTML =
          '<div class="filtros">' +
          '<label class="campo" style="flex:2 1 260px"><span class="campo__etiqueta">Buscar</span>' +
          '<input type="search" id="buscador" class="campo__control" placeholder="Nombre, correo o número de cuenta" /></label>' +
          '<div class="filtros__acciones">' +
          '<button type="button" class="boton" id="botonAlta">Registrar cliente</button>' +
          '</div></div>' +
          '<div id="tablaUsuarios"></div>';

        function pintar(lista) {
          var destino = util.nodo('#tablaUsuarios', contenedor);

          if (!lista.length) {
            destino.innerHTML = util.vacio(
              'Sin coincidencias',
              'Ningún usuario coincide con la búsqueda.',
            );
            return;
          }

          destino.innerHTML =
            '<div class="tabla-envoltura"><table class="tabla">' +
            '<thead><tr><th scope="col">Titular</th><th scope="col">Correo</th><th scope="col">Estado</th><th scope="col">Perfil</th><th scope="col">Cuenta</th>' +
            '<th scope="col" class="tabla__numero">Saldo</th><th scope="col">Alta</th><th scope="col"></th></tr></thead><tbody>' +
            lista
              .map(function (usuario) {
                return (
                  '<tr><td><strong>' +
                  util.escapar(usuario.nombreCompleto) +
                  '</strong></td><td>' +
                  util.escapar(usuario.correo) +
                  '</td><td><span class="' +
                  (usuario.correoVerificado
                    ? 'insignia insignia--activa'
                    : 'insignia insignia--bloqueada') +
                  '">' +
                  util.escapar(usuario.correoVerificado ? 'Activa' : 'Pendiente') +
                  '</span>' +
                  (usuario.correoVerificado
                    ? ''
                    : '<span class="movimiento__detalle">Correo sin verificar</span>') +
                  '</td><td><span class="insignia ' +
                  (usuario.rol === 'ADMINISTRADOR' ? '' : 'insignia--neutra') +
                  '">' +
                  util.escapar(usuario.rol) +
                  '</span></td><td class="dato">' +
                  util.escapar(usuario.cuenta ? usuario.cuenta.numeroCuenta : '—') +
                  '</td><td class="tabla__numero">' +
                  util.escapar(
                    usuario.cuenta ? util.moneda(usuario.cuenta.saldo) : '—',
                  ) +
                  '</td><td>' +
                  util.escapar(util.fechaCorta(usuario.creadoEn)) +
                  '</td><td><div class="acciones-fila">' +
                  '<button type="button" class="enlace-accion" data-editar="' +
                  util.escapar(usuario.id) +
                  '">Editar</button>' +
                  '<button type="button" class="enlace-accion" data-rol="' +
                  util.escapar(usuario.id) +
                  '">Cambiar perfil</button>' +
                  (usuario.cuenta
                    ? '<button type="button" class="enlace-accion" data-movimientos="' +
                      util.escapar(usuario.cuenta.id) +
                      '" data-titular="' +
                      util.escapar(usuario.nombreCompleto) +
                      '">Movimientos</button>'
                    : '') +
                  (usuario.puedeEliminarse
                    ? '<button type="button" class="enlace-accion enlace-accion--peligro" data-eliminar="' +
                      util.escapar(usuario.id) +
                      '">Eliminar</button>'
                    : '') +
                  '</div></td></tr>'
                );
              })
              .join('') +
            '</tbody></table></div>';

          util.nodos('[data-editar]', destino).forEach(function (boton) {
            boton.addEventListener('click', function () {
              var usuario = usuarios.filter(function (item) {
                return item.id === boton.getAttribute('data-editar');
              })[0];
              abrirEdicion(usuario);
            });
          });

          util.nodos('[data-rol]', destino).forEach(function (boton) {
            boton.addEventListener('click', function () {
              var usuario = usuarios.filter(function (item) {
                return item.id === boton.getAttribute('data-rol');
              })[0];
              abrirCambioRol(usuario);
            });
          });

          util.nodos('[data-movimientos]', destino).forEach(function (boton) {
            boton.addEventListener('click', function () {
              verMovimientos(
                boton.getAttribute('data-movimientos'),
                boton.getAttribute('data-titular'),
              );
            });
          });

          util.nodos('[data-eliminar]', destino).forEach(function (boton) {
            boton.addEventListener('click', function () {
              var usuario = usuarios.filter(function (item) {
                return item.id === boton.getAttribute('data-eliminar');
              })[0];
              if (usuario) {
                abrirEliminacion(usuario);
              }
            });
          });
        }

        function abrirEliminacion(usuario) {
          util.abrirModal({
            titulo: util.frase('Eliminar la cuenta de {titular}', {
              titular: usuario.nombreCompleto,
            }),
            contenido:
              '<div class="resumen-operacion">' +
              '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Titular</span>' +
              '<span class="resumen-operacion__valor">' +
              util.escapar(usuario.nombreCompleto) +
              '</span></div>' +
              '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Correo</span>' +
              '<span class="resumen-operacion__valor">' +
              util.escapar(usuario.correo) +
              '</span></div>' +
              '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Cuenta</span>' +
              '<span class="resumen-operacion__valor dato">' +
              util.escapar(usuario.cuenta ? usuario.cuenta.numeroCuenta : '—') +
              '</span></div>' +
              '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Saldo</span>' +
              '<span class="resumen-operacion__valor">' +
              util.escapar(
                usuario.cuenta ? util.moneda(usuario.cuenta.saldo) : '—',
              ) +
              '</span></div>' +
              '</div>' +
              '<div class="aviso aviso--atencion">' +
              util.escapar(
                util.t(
                  'La cuenta y sus tarjetas, préstamos y avisos se eliminarán definitivamente de la base de datos. Las operaciones compartidas con otros clientes y la auditoría se conservan sin vincular. Esta acción no puede deshacerse desde el panel.',
                ),
              ) +
              '</div>' +
              '<div id="avisoEliminar" hidden></div>',
            botones: [
              { texto: 'Cancelar', clase: 'boton--secundario' },
              {
                texto: 'Eliminar cuenta',
                clase: 'boton boton--peligro',
                cerrar: false,
                accion: function (capa) {
                  var aviso = util.nodo('#avisoEliminar', capa);
                  aviso.hidden = true;
                  contexto.mostrarCarga(true);

                  api
                    .adminEliminarUsuario(usuario.id)
                    .then(function (resultado) {
                      contexto.mostrarCarga(false);
                      util.avisar(
                        resultado && resultado.mensaje
                          ? resultado.mensaje
                          : util.t('La cuenta fue eliminada.'),
                        'exito',
                      );
                      if (capa.parentNode) {
                        capa.parentNode.removeChild(capa);
                      }
                      contexto.recargar();
                    })
                    .catch(function (error) {
                      contexto.mostrarCarga(false);
                      aviso.className = 'aviso aviso--error';
                      aviso.textContent = mensajeErrorEliminacion(error);
                      aviso.hidden = false;
                      aviso.setAttribute('role', 'alert');
                    });
                },
              },
            ],
          });
        }

        function abrirCambioRol(usuario) {
          var esAdmin = usuario.rol === 'ADMINISTRADOR';
          var rolDestino = esAdmin ? 'CLIENTE' : 'ADMINISTRADOR';

          util.abrirModal({
            titulo: 'Cambiar perfil de ' + usuario.nombreCompleto,
            contenido:
              '<div class="resumen-operacion">' +
              '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Perfil actual</span>' +
              '<span class="resumen-operacion__valor">' +
              util.escapar(usuario.rol) +
              '</span></div>' +
              '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Perfil nuevo</span>' +
              '<span class="resumen-operacion__valor">' +
              util.escapar(rolDestino) +
              '</span></div>' +
              '</div>' +
              (rolDestino === 'ADMINISTRADOR'
                ? '<div class="aviso aviso--atencion">Un administrador puede consultar y modificar ' +
                  'los datos de todos los clientes del banco, así como la auditoría. Conceda este ' +
                  'perfil solo al personal autorizado.</div>'
                : '<div class="aviso">El usuario perderá el acceso al panel administrativo y volverá ' +
                  'a ver únicamente su propia información.</div>') +
              '<div id="avisoRol" hidden></div>',
            botones: [
              { texto: 'Cancelar', clase: 'boton--secundario' },
              {
                texto: 'Confirmar cambio',
                clase: rolDestino === 'ADMINISTRADOR' ? 'boton' : 'boton boton--peligro',
                cerrar: false,
                accion: function (capa) {
                  var aviso = util.nodo('#avisoRol', capa);
                  contexto.mostrarCarga(true);

                  api
                    .adminCambiarRol(usuario.id, rolDestino)
                    .then(function (resultado) {
                      contexto.mostrarCarga(false);
                      util.avisar(resultado.mensaje, 'exito');
                      if (capa.parentNode) {
                        capa.parentNode.removeChild(capa);
                      }
                      contexto.recargar();
                    })
                    .catch(function (error) {
                      contexto.mostrarCarga(false);
                      aviso.className = 'aviso aviso--error';
                      aviso.textContent = error.message;
                      aviso.hidden = false;
                    });
                },
              },
            ],
          });
        }

        function verMovimientos(cuentaId, titular) {
          contexto.mostrarCarga(true);
          api
            .movimientosPorCuenta(cuentaId, { limite: 25 })
            .then(function (movimientos) {
              contexto.mostrarCarga(false);
              util.abrirModal({
                titulo: 'Movimientos de ' + titular,
                contenido: movimientos.length
                  ? '<div class="tabla-envoltura"><table class="tabla">' +
                    '<thead><tr><th scope="col">Fecha</th><th scope="col">Operación</th><th scope="col">Canal</th>' +
                    '<th scope="col" class="tabla__numero">Monto</th></tr></thead><tbody>' +
                    movimientos
                      .map(function (movimiento) {
                        var abono = movimiento.signo === 'ABONO';
                        return (
                          '<tr><td>' +
                          util.escapar(util.fecha(movimiento.fecha)) +
                          '</td><td>' +
                          util.escapar(util.etiquetaTipo(movimiento.tipo)) +
                          '</td><td>' +
                          util.escapar(util.etiquetaCanal(movimiento.canal)) +
                          '</td><td class="tabla__numero ' +
                          (abono ? 'monto--abono' : 'monto--cargo') +
                          '">' +
                          (abono ? '+' : '−') +
                          ' ' +
                          util.escapar(util.moneda(movimiento.monto)) +
                          '</td></tr>'
                        );
                      })
                      .join('') +
                    '</tbody></table></div>'
                  : util.vacio(
                      'Sin movimientos',
                      'Esta cuenta no registra operaciones.',
                    ),
                botones: [{ texto: 'Cerrar', clase: 'boton' }],
              });
            })
            .catch(function (error) {
              contexto.mostrarCarga(false);
              util.avisar(error.message, 'error');
            });
        }

        function abrirEdicion(usuario) {
          var modal = util.abrirModal({
            titulo: 'Editar a ' + usuario.nombreCompleto,
            contenido:
              '<div id="avisoEdicion" hidden></div>' +
              '<label class="campo"><span class="campo__etiqueta">Nombre completo</span>' +
              '<input type="text" id="edicionNombre" class="campo__control" value="' +
              util.escapar(usuario.nombreCompleto) +
              '" /></label>' +
              '<label class="campo"><span class="campo__etiqueta">Correo</span>' +
              '<input type="email" id="edicionCorreo" class="campo__control" value="' +
              util.escapar(usuario.correo) +
              '" /></label>' +
              '<label class="campo"><span class="campo__etiqueta">Teléfono</span>' +
              '<input type="tel" id="edicionTelefono" class="campo__control" value="' +
              util.escapar(usuario.telefono || '') +
              '" placeholder="55 0000 0000" /></label>' +
              '<label class="campo"><span class="campo__etiqueta">Nueva contraseña (opcional)</span>' +
              '<input type="password" id="edicionPassword" class="campo__control" placeholder="Dejar vacío para no cambiarla" />' +
              '<span class="campo__ayuda">Mínimo 6 caracteres. Se guarda cifrada.</span></label>',
            botones: [
              { texto: 'Cancelar', clase: 'boton--secundario' },
              {
                texto: 'Guardar cambios',
                clase: 'boton',
                cerrar: false,
                accion: function (capa) {
                  var datos = {};
                  var nombre = util.nodo('#edicionNombre', capa).value.trim();
                  var correo = util.nodo('#edicionCorreo', capa).value.trim();
                  var telefono = util.nodo('#edicionTelefono', capa).value.trim();

                  if (telefono && telefono !== (usuario.telefono || '')) {
                    datos.telefono = telefono;
                  }
                  var password = util.nodo('#edicionPassword', capa).value;
                  var aviso = util.nodo('#avisoEdicion', capa);

                  if (nombre && nombre !== usuario.nombreCompleto) {
                    datos.nombreCompleto = nombre;
                  }
                  if (correo && correo !== usuario.correo) {
                    datos.correo = correo;
                  }
                  if (password) {
                    datos.password = password;
                  }

                  if (!Object.keys(datos).length) {
                    aviso.className = 'aviso aviso--atencion';
                    aviso.textContent = 'No hay cambios que guardar.';
                    aviso.hidden = false;
                    return;
                  }

                  contexto.mostrarCarga(true);
                  api
                    .adminActualizarUsuario(usuario.id, datos)
                    .then(function () {
                      contexto.mostrarCarga(false);
                      modal.cerrar();
                      util.avisar('Usuario actualizado.', 'exito');
                      contexto.recargar();
                    })
                    .catch(function (error) {
                      contexto.mostrarCarga(false);
                      aviso.className = 'aviso aviso--error';
                      aviso.textContent = error.message;
                      aviso.hidden = false;
                    });
                },
              },
            ],
          });
        }

        function abrirAlta() {
          var modal = util.abrirModal({
            titulo: 'Registrar cliente',
            contenido:
              '<div id="avisoAlta" hidden></div>' +
              '<p class="texto-tenue" style="margin-bottom:16px">El alta crea el usuario, su cuenta y su tarjeta de débito en una sola operación.</p>' +
              '<div class="rejilla-campos">' +
              '<label class="campo"><span class="campo__etiqueta">Nombre completo</span>' +
              '<input type="text" id="altaNombre" class="campo__control" /></label>' +
              '<label class="campo"><span class="campo__etiqueta">Correo</span>' +
              '<input type="email" id="altaCorreo" class="campo__control" /></label>' +
              '<label class="campo"><span class="campo__etiqueta">Contraseña</span>' +
              '<input type="password" id="altaPassword" class="campo__control" /></label>' +
              '<label class="campo campo--numerico"><span class="campo__etiqueta">Saldo inicial</span>' +
              '<input type="number" id="altaSaldo" class="campo__control" min="0" step="0.01" value="0" /></label>' +
              '<label class="campo campo--numerico"><span class="campo__etiqueta">Número de cuenta</span>' +
              '<input type="text" id="altaCuenta" class="campo__control" placeholder="1000000003" /></label>' +
              '<label class="campo campo--numerico"><span class="campo__etiqueta">Número de tarjeta</span>' +
              '<input type="text" id="altaTarjeta" class="campo__control" placeholder="4000000000000003" /></label>' +
              '<label class="campo campo--numerico"><span class="campo__etiqueta">PIN inicial</span>' +
              '<input type="password" id="altaPin" class="campo__control" maxlength="6" /></label>' +
              '</div>',
            botones: [
              { texto: 'Cancelar', clase: 'boton--secundario' },
              {
                texto: 'Registrar',
                clase: 'boton',
                cerrar: false,
                accion: function (capa) {
                  var aviso = util.nodo('#avisoAlta', capa);

                  function fallar(mensaje) {
                    aviso.className = 'aviso aviso--error';
                    aviso.textContent = mensaje;
                    aviso.hidden = false;
                  }

                  var datos = {
                    nombreCompleto: util.nodo('#altaNombre', capa).value.trim(),
                    correo: util.nodo('#altaCorreo', capa).value.trim(),
                    password: util.nodo('#altaPassword', capa).value,
                    numeroCuenta: util.nodo('#altaCuenta', capa).value.trim(),
                    numeroTarjeta: util.nodo('#altaTarjeta', capa).value.trim(),
                    pin: util.nodo('#altaPin', capa).value,
                    saldoInicial: Number(util.nodo('#altaSaldo', capa).value || 0),
                  };

                  if (datos.nombreCompleto.length < 3) {
                    return fallar('Escriba el nombre completo del titular.');
                  }
                  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(datos.correo)) {
                    return fallar('El correo no tiene un formato válido.');
                  }
                  if (datos.password.length < 6) {
                    return fallar('La contraseña debe tener al menos 6 caracteres.');
                  }
                  if (!/^\d{6,30}$/.test(datos.numeroCuenta)) {
                    return fallar('El número de cuenta debe tener entre 6 y 30 dígitos.');
                  }
                  if (!/^\d{13,19}$/.test(datos.numeroTarjeta)) {
                    return fallar('El número de tarjeta debe tener entre 13 y 19 dígitos.');
                  }
                  if (!/^\d{4,6}$/.test(datos.pin)) {
                    return fallar('El PIN debe tener entre 4 y 6 dígitos.');
                  }

                  contexto.mostrarCarga(true);
                  return api
                    .adminCrearCliente(datos)
                    .then(function () {
                      contexto.mostrarCarga(false);
                      modal.cerrar();
                      util.avisar('Cliente registrado con cuenta y tarjeta.', 'exito');
                      contexto.recargar();
                    })
                    .catch(function (error) {
                      contexto.mostrarCarga(false);
                      fallar(error.message);
                    });
                },
              },
            ],
          });
        }

        util.nodo('#botonAlta', contenedor).addEventListener('click', abrirAlta);

        util.nodo('#buscador', contenedor).addEventListener('input', function (evento) {
          var texto = evento.target.value.toLowerCase().trim();
          pintar(
            usuarios.filter(function (usuario) {
              if (!texto) {
                return true;
              }
              return (
                usuario.nombreCompleto.toLowerCase().indexOf(texto) !== -1 ||
                usuario.correo.toLowerCase().indexOf(texto) !== -1 ||
                (usuario.cuenta &&
                  usuario.cuenta.numeroCuenta.indexOf(texto) !== -1)
              );
            }),
          );
        });

        pintar(usuarios);
      });
    },
  };

  window.PortalVistas['admin/tarjetas'] = {
    titulo: 'Tarjetas',
    texto:
      'Estado de las tarjetas emitidas por el banco. Desde aquí puede activarlas, bloquearlas o desactivarlas.',
    etiqueta: 'Tarjetas',
    icono: 'tarjeta',
    grupo: 'Administración',
    rol: 'ADMINISTRADOR',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Consultando tarjetas…</div>';

      return api.adminTarjetas().then(function (tarjetas) {
        if (!tarjetas.length) {
          contenedor.innerHTML = util.vacio(
            'Sin tarjetas emitidas',
            'Registre un cliente para emitir su primera tarjeta.',
          );
          return;
        }

        contenedor.innerHTML =
          '<div class="tabla-envoltura"><table class="tabla">' +
          '<thead><tr><th scope="col">Titular</th><th scope="col">Cuenta</th><th scope="col">Tarjeta</th><th scope="col">Estado</th>' +
          '<th scope="col">Motivo</th><th scope="col" class="tabla__numero">Intentos</th><th scope="col">Cambiar estado</th></tr></thead><tbody>' +
          tarjetas
            .map(function (tarjeta) {
              return (
                '<tr><td><strong>' +
                util.escapar(
                  tarjeta.cuenta ? tarjeta.cuenta.titular || '—' : '—',
                ) +
                '</strong></td><td class="dato">' +
                util.escapar(tarjeta.cuenta ? tarjeta.cuenta.numeroCuenta : '—') +
                '</td><td class="dato">' +
                util.escapar(tarjeta.numeroTarjeta) +
                '</td><td><span class="' +
                util.claseEstadoTarjeta(tarjeta.estado) +
                '">' +
                util.escapar(tarjeta.estado) +
                '</span></td><td class="texto-tenue">' +
                util.escapar(util.motivoLegible(tarjeta.motivoBloqueo) || '—') +
                '</td><td class="tabla__numero">' +
                util.escapar(String(tarjeta.intentosFallidos)) +
                '</td><td><select class="campo__control" data-tarjeta="' +
                util.escapar(tarjeta.id) +
                '">' +
                ['ACTIVA', 'BLOQUEADA', 'INACTIVA']
                  .map(function (estado) {
                    return (
                      '<option value="' +
                      estado +
                      '"' +
                      (estado === tarjeta.estado ? ' selected' : '') +
                      '>' +
                      util.escapar(util.t(estado)) +
                      '</option>'
                    );
                  })
                  .join('') +
                '</select></td></tr>'
              );
            })
            .join('') +
          '</tbody></table></div>';

        util.nodos('[data-tarjeta]', contenedor).forEach(function (select) {
          var anterior = select.value;
          select.addEventListener('change', function () {
            var nuevo = select.value;
            util
              .confirmar(
                'Cambiar estado de la tarjeta',
                util.frase(
                  'La tarjeta quedará en estado {estado} y el cliente recibirá un aviso.',
                  { estado: util.t(nuevo) },
                ),
                'Aplicar',
              )
              .then(function (aceptado) {
                if (!aceptado) {
                  select.value = anterior;
                  return;
                }
                contexto.mostrarCarga(true);
                api
                  .adminActualizarEstadoTarjeta(
                    select.getAttribute('data-tarjeta'),
                    nuevo,
                  )
                  .then(function () {
                    contexto.mostrarCarga(false);
                    util.avisar('Estado de la tarjeta actualizado.', 'exito');
                    contexto.recargar();
                  })
                  .catch(function (error) {
                    contexto.mostrarCarga(false);
                    select.value = anterior;
                    util.avisar(error.message, 'error');
                  });
              });
          });
        });
      });
    },
  };

  window.PortalVistas['admin/reportes'] = {
    titulo: 'Reportes de operaciones',
    texto:
      'Resumen de las operaciones del banco por tipo y por canal, con opción de descarga.',
    etiqueta: 'Reportes',
    icono: 'reportes',
    grupo: 'Administración',
    rol: 'ADMINISTRADOR',
    render: function (contenedor) {
      contenedor.innerHTML = '<div class="vacio">Generando el reporte…</div>';

      return api.adminReporte().then(function (reporte) {
        var tipos = Object.keys(reporte.porTipo || {});
        var totalTipo = tipos.reduce(function (suma, tipo) {
          return suma + reporte.porTipo[tipo].cantidad;
        }, 0);

        contenedor.innerHTML =
          '<div class="filtros">' +
          '<div><span class="rotulo">Generado</span><strong>' +
          util.escapar(util.fecha(reporte.generadoEn)) +
          '</strong></div>' +
          '<div class="filtros__acciones">' +
          '<button type="button" class="boton boton--secundario" id="botonCsvReporte">Descargar CSV</button>' +
          '<button type="button" class="boton boton--secundario" id="botonImprimir">Imprimir</button>' +
          '</div></div>' +
          '<div class="rejilla rejilla--dos">' +
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado"><h2>Operaciones por tipo</h2></div>' +
          (totalTipo
            ? '<div class="barras">' +
              tipos
                .map(function (tipo) {
                  return barra(
                    util.etiquetaTipo(tipo),
                    reporte.porTipo[tipo].cantidad,
                    totalTipo,
                  );
                })
                .join('') +
              '</div>'
            : util.vacio('Sin datos', 'No hay operaciones registradas.')) +
          '</section>' +
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado"><h2>Monto por tipo</h2></div>' +
          (tipos.length
            ? '<div class="resumen-operacion">' +
              tipos
                .map(function (tipo) {
                  return (
                    '<div class="resumen-operacion__fila">' +
                    '<span class="resumen-operacion__etiqueta">' +
                    util.escapar(util.etiquetaTipo(tipo)) +
                    '</span><span class="resumen-operacion__valor">' +
                    util.escapar(util.moneda(reporte.porTipo[tipo].montoTotal)) +
                    '</span></div>'
                  );
                })
                .join('') +
              '</div>'
            : util.vacio('Sin datos', 'No hay operaciones registradas.')) +
          '</section>' +
          '</div>' +
          '<section class="tarjeta" style="margin-top:20px">' +
          '<div class="tarjeta__encabezado"><h2>Comprobante del reporte</h2></div>' +
          '<pre class="comprobante">' +
          util.escapar(comprobanteReporte(reporte)) +
          '</pre>' +
          '</section>';

        util.nodo('#botonImprimir', contenedor).addEventListener('click', function () {
          window.print();
        });

        util.nodo('#botonCsvReporte', contenedor).addEventListener('click', function () {
          util.descargarCsv(
            'reporte-operaciones-' + util.hoyIso(0) + '.csv',
            ['Fecha', 'Operacion', 'Canal', 'Origen', 'Destino', 'Estado', 'Monto'],
            reporte.ultimasOperaciones.map(function (operacion) {
              return [
                util.fecha(operacion.fecha),
                util.etiquetaTipo(operacion.tipo),
                util.etiquetaCanal(operacion.canal),
                operacion.origen || '',
                operacion.destino || '',
                operacion.estado,
                operacion.monto,
              ];
            }),
          );
          util.avisar('Descargamos el reporte.', 'exito');
        });
      });
    },
  };

  window.PortalVistas['admin/auditoria'] = {
    titulo: 'Auditoría',
    texto:
      'Eventos registrados por el backend en todos los canales: accesos, operaciones y cambios de estado.',
    etiqueta: 'Auditoría',
    icono: 'auditoria',
    grupo: 'Administración',
    rol: 'ADMINISTRADOR',
    render: function (contenedor) {
      contenedor.innerHTML = '<div class="vacio">Consultando la auditoría…</div>';

      return api.adminAuditoria(150).then(function (registros) {
        if (!registros.length) {
          contenedor.innerHTML = util.vacio(
            'Sin registros',
            'El backend todavía no ha registrado eventos de auditoría.',
          );
          return;
        }

        contenedor.innerHTML =
          '<div class="filtros">' +
          '<label class="campo" style="flex:2 1 260px"><span class="campo__etiqueta">Buscar acción o usuario</span>' +
          '<input type="search" id="buscadorAuditoria" class="campo__control" placeholder="LOGIN, RETIRO, TARJETA…" /></label>' +
          '<div class="filtros__acciones">' +
          '<button type="button" class="boton boton--secundario" id="botonCsvAuditoria">Descargar CSV</button>' +
          '</div></div>' +
          '<div id="tablaAuditoria"></div>';

        function pintar(lista) {
          var destino = util.nodo('#tablaAuditoria', contenedor);

          if (!lista.length) {
            destino.innerHTML = util.vacio(
              'Sin coincidencias',
              'Ningún evento coincide con la búsqueda.',
            );
            return;
          }

          destino.innerHTML =
            '<div class="tabla-envoltura"><table class="tabla">' +
            '<thead><tr><th scope="col">Fecha</th><th scope="col">Acción</th><th scope="col">Canal</th><th scope="col">Usuario</th>' +
            '<th scope="col">Entidad</th><th scope="col">Detalle</th></tr></thead><tbody>' +
            lista
              .map(function (registro) {
                return (
                  '<tr><td>' +
                  util.escapar(util.fecha(registro.fecha)) +
                  '</td><td><strong>' +
                  util.escapar(registro.accion) +
                  '</strong></td><td>' +
                  util.escapar(util.etiquetaCanal(registro.canal)) +
                  '</td><td>' +
                  util.escapar(
                    registro.usuario ? registro.usuario.nombreCompleto : 'Sin sesión',
                  ) +
                  '</td><td>' +
                  util.escapar(registro.entidadAfectada || '—') +
                  '</td><td class="texto-tenue">' +
                  util.escapar(registro.detalle || '—') +
                  '</td></tr>'
                );
              })
              .join('') +
            '</tbody></table></div>';
        }

        util
          .nodo('#buscadorAuditoria', contenedor)
          .addEventListener('input', function (evento) {
            var texto = evento.target.value.toUpperCase().trim();
            pintar(
              registros.filter(function (registro) {
                if (!texto) {
                  return true;
                }
                var usuario = registro.usuario
                  ? registro.usuario.nombreCompleto.toUpperCase()
                  : '';
                return (
                  registro.accion.indexOf(texto) !== -1 ||
                  usuario.indexOf(texto) !== -1 ||
                  registro.canal.indexOf(texto) !== -1
                );
              }),
            );
          });

        util
          .nodo('#botonCsvAuditoria', contenedor)
          .addEventListener('click', function () {
            util.descargarCsv(
              'auditoria-' + util.hoyIso(0) + '.csv',
              ['Fecha', 'Accion', 'Canal', 'Usuario', 'Entidad', 'Detalle'],
              registros.map(function (registro) {
                return [
                  util.fecha(registro.fecha),
                  registro.accion,
                  registro.canal,
                  registro.usuario ? registro.usuario.nombreCompleto : '',
                  registro.entidadAfectada || '',
                  registro.detalle || '',
                ];
              }),
            );
            util.avisar('Descargamos la bitácora.', 'exito');
          });

        pintar(registros);
      });
    },
  };
})();
