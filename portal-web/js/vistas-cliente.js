(function () {
  'use strict';

  var api = window.PortalApi;
  var util = window.PortalUtil;
  var config = window.PORTAL_CONFIG || {};

  window.PortalVistas = window.PortalVistas || {};

  function nombreBanco() {
    return config.nombreBanco || 'Banco ATM';
  }

  function mostrarComprobante(comprobante, titulo) {
    var texto = util.textoComprobante(comprobante, nombreBanco());
    util.abrirModal({
      titulo: titulo || 'Operación aplicada',
      contenido:
        '<pre class="comprobante" id="comprobanteImprimible">' +
        util.escapar(texto) +
        '</pre>',
      botones: [
        {
          texto: 'Imprimir',
          clase: 'boton--secundario',
          cerrar: false,
          accion: function () {
            window.print();
          },
        },
        { texto: 'Cerrar', clase: 'boton' },
      ],
    });
  }

  function abrirDetalleTarjeta(tarjetaId, contexto) {
    var visible = false;

    function ocultar(valor) {
      return String(valor || '').replace(/[0-9]/g, '•');
    }

    function filaDetalle(etiqueta, valor, sensible) {
      return (
        '<div class="resumen-operacion__fila">' +
        '<span class="resumen-operacion__etiqueta">' +
        util.escapar(util.t(etiqueta)) +
        '</span><span class="resumen-operacion__valor dato" data-sensible="' +
        (sensible ? util.escapar(valor) : '') +
        '">' +
        util.escapar(sensible ? ocultar(valor) : valor) +
        '</span></div>'
      );
    }

    contexto.mostrarCarga(true);

    return window.PortalApi.detalleTarjeta(tarjetaId)
      .then(function (detalle) {
        contexto.mostrarCarga(false);

        var esCredito = detalle.tipo === 'CREDITO';

        var filas =
          filaDetalle(
            'Número completo',
            util.agruparNumero(detalle.numeroCompleto),
            true,
          ) +
          filaDetalle('CVV', detalle.cvv, true) +
          filaDetalle('Fecha de expiración', util.fechaCorta(detalle.expiraEn)) +
          filaDetalle('Fecha de emisión', util.fechaCorta(detalle.emitidaEn)) +
          filaDetalle('Titular', detalle.titular || '—') +
          filaDetalle('Cuenta', detalle.numeroCuenta || '—') +
          filaDetalle(
            'Tipo',
            esCredito
              ? util.frase('Crédito · {nivel}', {
                  nivel: util.t(detalle.nombreNivel || ''),
                })
              : util.t('Débito'),
          ) +
          filaDetalle('Estado', util.t(detalle.estado));

        if (esCredito && detalle.limiteCredito !== null) {
          filas +=
            filaDetalle('Línea autorizada', util.moneda(detalle.limiteCredito)) +
            filaDetalle(
              'Crédito disponible',
              util.moneda(detalle.creditoDisponible),
            );
        }

        var capa = util.abrirModal({
          titulo: util.t('Detalle de la tarjeta'),
          contenido:
            '<div class="resumen-operacion">' +
            filas +
            '</div>' +
            '<div class="aviso aviso--atencion">' +
            util.escapar(
              util.t(
                'Estos datos son confidenciales. No los comparta con nadie.',
              ),
            ) +
            '</div>',
          botones: [
            {
              texto: 'Mostrar datos sensibles',
              clase: 'boton--secundario',
              cerrar: false,
              accion: function (nodoCapa, boton) {
                visible = !visible;
                util.nodos('[data-sensible]', nodoCapa).forEach(function (celda) {
                  var real = celda.getAttribute('data-sensible');
                  if (!real) {
                    return;
                  }
                  celda.textContent = visible ? real : ocultar(real);
                });
                if (boton) {
                  boton.textContent = util.t(
                    visible ? 'Ocultar datos sensibles' : 'Mostrar datos sensibles',
                  );
                }
              },
            },
            { texto: 'Cerrar', clase: 'boton--secundario' },
          ],
        });

        return capa;
      })
      .catch(function () {
        contexto.mostrarCarga(false);
        util.avisar(
          util.t('No fue posible cargar el detalle de la tarjeta.'),
          'error',
        );
      });
  }

  function conectarDetalleTarjetas(contenedor, contexto) {
    util.nodos('[data-detalle-tarjeta]', contenedor).forEach(function (nodo) {
      var id = nodo.getAttribute('data-detalle-tarjeta');
      if (!id) {
        return;
      }
      nodo.addEventListener('click', function () {
        abrirDetalleTarjeta(id, contexto);
      });
    });
  }

  function plastico(tarjeta, titular) {
    if (!tarjeta) {
      return util.vacio(
        'Sin tarjeta asociada',
        'Esta cuenta todavía no tiene una tarjeta emitida.',
      );
    }

    var esCredito = tarjeta.tipo === 'CREDITO';

    var clase = 'plastico plastico--' + (tarjeta.color || 'debito');
    if (tarjeta.estado === 'BLOQUEADA') {
      clase += ' plastico--bloqueada';
    } else if (tarjeta.estado === 'INACTIVA') {
      clase += ' plastico--inactiva';
    }

    var etiquetaTipo = esCredito
      ? util.frase('Crédito · {nivel}', {
          nivel: util.t(tarjeta.nombreNivel || ''),
        })
      : util.t('Débito');

    var lineaCredito = '';
    if (esCredito && tarjeta.limiteCredito !== null && tarjeta.limiteCredito !== undefined) {
      lineaCredito =
        '<div class="plastico__linea">' +
        '<span class="plastico__linea-etiqueta">Disponible</span>' +
        '<span class="plastico__linea-valor">' +
        util.escapar(util.moneda(tarjeta.creditoDisponible)) +
        '</span>' +
        '<span class="plastico__linea-etiqueta">' +
        util.escapar(
          util.frase('de {limite}', {
            limite: util.moneda(tarjeta.limiteCredito),
          }),
        ) +
        '</span>' +
        '</div>';
    }

    return (
      '<button type="button" class="' + clase + '" data-detalle-tarjeta="' +
      util.escapar(tarjeta.id || '') +
      '" aria-label="' +
      util.escapar(util.t('Ver datos completos')) +
      '">' +
      '<div class="plastico__fila">' +
      '<span class="plastico__banco">' +
      util.escapar(nombreBanco()) +
      '</span>' +
      '<span class="plastico__estado">' +
      util.escapar(tarjeta.estado) +
      '</span>' +
      '</div>' +
      '<div class="plastico__chip"></div>' +
      '<div>' +
      '<div class="plastico__numero">' +
      util.escapar(util.agruparNumero(tarjeta.numeroTarjeta)) +
      '</div>' +
      lineaCredito +
      '</div>' +
      '<div class="plastico__fila">' +
      '<span class="plastico__titular">' +
      util.escapar(titular || tarjeta.titular || 'Titular') +
      '</span>' +
      '<span class="plastico__titular">' +
      util.escapar(etiquetaTipo) +
      '</span>' +
      '</div>' +
      '</button>'
    );
  }

  function filaMovimiento(movimiento) {
    var abono = movimiento.signo === 'ABONO';
    var signo = abono ? '+' : '−';
    return (
      '<li class="movimiento">' +
      '<span class="movimiento__marca' +
      (abono ? ' movimiento__marca--abono' : '') +
      '">' +
      signo +
      '</span>' +
      '<span>' +
      '<span class="movimiento__titulo">' +
      util.escapar(util.etiquetaTipo(movimiento.tipo)) +
      '</span>' +
      '<span class="movimiento__detalle">' +
      util.escapar(
        util.frase('{concepto} · {fecha}', {
          concepto:
            movimiento.descripcion || util.etiquetaCanal(movimiento.canal),
          fecha: util.fecha(movimiento.fecha),
        }),
      ) +
      '</span>' +
      '</span>' +
      '<span class="movimiento__monto ' +
      (abono ? 'monto--abono' : 'monto--cargo') +
      '">' +
      signo +
      ' ' +
      util.escapar(util.moneda(movimiento.monto)) +
      '</span>' +
      '</li>'
    );
  }

  window.PortalVistas['resumen'] = {
    titulo: 'Resumen',
    texto: 'Su posición del día y las últimas operaciones registradas en la cuenta.',
    etiqueta: 'Resumen',
    icono: 'resumen',
    grupo: 'Mi banca',
    rol: 'CLIENTE',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Consultando su cuenta…</div>';

      return Promise.all([
        api.resumenCuenta(),
        api.consultarMovimientos({ limite: config.movimientosResumen || 5 }),
        api.consultarTarjeta().catch(function () {
          return null;
        }),
        api.consultarNotificaciones(config.notificacionesResumen || 4).catch(
          function () {
            return [];
          },
        ),
      ]).then(function (resultados) {
        var cuenta = resultados[0];
        var movimientos = resultados[1] || [];
        var tarjeta = resultados[2];
        var notificaciones = resultados[3] || [];

        var listaMovimientos = movimientos.length
          ? '<ul class="lista-movimientos">' +
            movimientos.map(filaMovimiento).join('') +
            '</ul>'
          : util.vacio(
              'Todavía no hay movimientos',
              'Cuando realice su primera operación aparecerá aquí.',
            );

        var listaNotificaciones = notificaciones.length
          ? notificaciones
              .map(function (notificacion) {
                return (
                  '<div class="notificacion">' +
                  '<span class="notificacion__punto"></span>' +
                  '<span>' +
                  util.escapar(notificacion.mensaje) +
                  '<span class="notificacion__fecha">' +
                  util.escapar(util.fecha(notificacion.creadaEn)) +
                  '</span></span></div>'
                );
              })
              .join('')
          : util.vacio('Sin avisos', 'No hay notificaciones recientes.');

        contenedor.innerHTML =
          '<div class="rejilla rejilla--resumen">' +
          '<div class="rejilla">' +
          '<section class="saldo">' +
          '<span class="rotulo">Saldo disponible</span>' +
          '<div class="saldo__monto">' +
          util.escapar(util.moneda(cuenta.saldo)) +
          '</div>' +
          '<span class="texto-tenue">' +
          util.escapar(
            util.frase('Cuenta {numero} · {titular}', {
              numero: cuenta.numeroCuenta,
              titular: cuenta.titular || '',
            }),
          ) +
          '</span>' +
          '<div class="saldo__pie">' +
          '<span>Cuenta abierta el ' +
          util.escapar(util.fechaCorta(cuenta.creadaEn)) +
          '</span>' +
          '<span>Consultado el ' +
          util.escapar(util.fecha(new Date())) +
          '</span>' +
          '</div>' +
          '</section>' +
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado"><h2>Accesos rápidos</h2></div>' +
          '<div class="accesos">' +
          '<button type="button" class="acceso-rapido" data-ir="/transferencias">' +
          util.icono('transferencias') +
          'Transferir</button>' +
          '<button type="button" class="acceso-rapido" data-ir="/pagos">' +
          util.icono('pagos') +
          'Pagar servicio</button>' +
          '<button type="button" class="acceso-rapido" data-ir="/movimientos">' +
          util.icono('movimientos') +
          'Ver movimientos</button>' +
          '<button type="button" class="acceso-rapido" data-ir="/tarjetas">' +
          util.icono('tarjeta') +
          'Mi tarjeta</button>' +
          '</div>' +
          '</section>' +
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado">' +
          '<h2>Últimos movimientos</h2>' +
          '<button type="button" class="enlace-accion" data-ir="/movimientos">Ver todos</button>' +
          '</div>' +
          listaMovimientos +
          '</section>' +
          '</div>' +
          '<div class="rejilla">' +
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado"><h2>Mi tarjeta</h2></div>' +
          plastico(tarjeta, cuenta.titular) +
          '<div class="acciones-fila" style="margin-top:16px">' +
          '<button type="button" class="boton boton--secundario boton--chico" data-ir="/tarjetas">Administrar tarjeta</button>' +
          '</div>' +
          '</section>' +
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado">' +
          '<h2>Avisos</h2>' +
          '<button type="button" class="enlace-accion" data-ir="/notificaciones">Ver todos</button>' +
          '</div>' +
          listaNotificaciones +
          '</section>' +
          '</div>' +
          '</div>';

        conectarDetalleTarjetas(contenedor, contexto);

        util.nodos('[data-ir]', contenedor).forEach(function (boton) {
          boton.addEventListener('click', function () {
            contexto.irA(boton.getAttribute('data-ir'));
          });
        });
      });
    },
  };

  window.PortalVistas['cuentas'] = {
    titulo: 'Mis cuentas',
    texto: 'Cuentas de las que usted es titular en el banco.',
    etiqueta: 'Cuentas',
    icono: 'cuentas',
    grupo: 'Mi banca',
    rol: 'CLIENTE',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Consultando sus cuentas…</div>';

      return api.listarCuentas().then(function (cuentas) {
        if (!cuentas || !cuentas.length) {
          contenedor.innerHTML = util.vacio(
            'Sin cuentas registradas',
            'Su usuario todavía no tiene una cuenta asociada.',
          );
          return;
        }

        contenedor.innerHTML =
          '<div class="rejilla rejilla--dos">' +
          cuentas
            .map(function (cuenta) {
              return (
                '<section class="tarjeta">' +
                '<div class="tarjeta__encabezado">' +
                '<div><span class="rotulo">Cuenta de ahorro</span>' +
                '<h2 class="dato">' +
                util.escapar(cuenta.numeroCuenta) +
                '</h2></div>' +
                '<span class="insignia insignia--activa">Activa</span>' +
                '</div>' +
                '<span class="rotulo">Saldo disponible</span>' +
                '<div class="saldo__monto">' +
                util.escapar(util.moneda(cuenta.saldo)) +
                '</div>' +
                '<div class="saldo__pie">' +
                '<span>Abierta el ' +
                util.escapar(util.fechaCorta(cuenta.creadaEn)) +
                '</span>' +
                '<button type="button" class="enlace-accion" data-ir="/movimientos">Ver movimientos</button>' +
                '</div>' +
                '</section>'
              );
            })
            .join('') +
          '</div>';

        util.nodos('[data-ir]', contenedor).forEach(function (boton) {
          boton.addEventListener('click', function () {
            contexto.irA(boton.getAttribute('data-ir'));
          });
        });
      });
    },
  };

  window.PortalVistas['movimientos'] = {
    titulo: 'Movimientos',
    texto:
      'Filtre por periodo y tipo de operación. Puede descargar el resultado o abrir el comprobante de cada movimiento.',
    etiqueta: 'Movimientos',
    icono: 'movimientos',
    grupo: 'Mi banca',
    rol: 'CLIENTE',
    render: function (contenedor) {
      contenedor.innerHTML =
        '<form class="filtros" id="filtrosMovimientos">' +
        '<label class="campo"><span class="campo__etiqueta">Desde</span>' +
        '<input type="date" id="filtroDesde" class="campo__control" value="' +
        util.hoyIso(30) +
        '" /></label>' +
        '<label class="campo"><span class="campo__etiqueta">Hasta</span>' +
        '<input type="date" id="filtroHasta" class="campo__control" value="' +
        util.hoyIso(0) +
        '" /></label>' +
        '<label class="campo"><span class="campo__etiqueta">Tipo</span>' +
        '<select id="filtroTipo" class="campo__control">' +
        '<option value="">Todos</option>' +
        '<option value="TRANSFERENCIA">Transferencia</option>' +
        '<option value="RETIRO">Retiro de efectivo</option>' +
        '<option value="DEPOSITO">Depósito</option>' +
        '<option value="PAGO_SERVICIO">Pago de servicio</option>' +
        '</select></label>' +
        '<div class="filtros__acciones">' +
        '<button type="submit" class="boton">Consultar</button>' +
        '<button type="button" class="boton boton--secundario" id="botonLimpiar">Quitar filtros</button>' +
        '<button type="button" class="boton boton--secundario" id="botonCsv">Descargar CSV</button>' +
        '</div>' +
        '</form>' +
        '<div id="resultadoMovimientos"><div class="vacio">Consultando movimientos…</div></div>';

      var resultado = util.nodo('#resultadoMovimientos', contenedor);
      var ultimos = [];

      function pintar(movimientos) {
        ultimos = movimientos || [];

        if (!ultimos.length) {
          resultado.innerHTML = util.vacio(
            'Sin movimientos en el periodo',
            'Ajuste las fechas o el tipo de operación y vuelva a consultar.',
          );
          return;
        }

        resultado.innerHTML =
          '<div class="tabla-envoltura"><table class="tabla">' +
          '<thead><tr><th scope="col">Fecha</th><th scope="col">Operación</th><th scope="col">Concepto</th>' +
          '<th scope="col">Canal</th><th scope="col">Contraparte</th><th scope="col" class="tabla__numero">Monto</th><th scope="col"></th></tr></thead>' +
          '<tbody>' +
          ultimos
            .map(function (movimiento) {
              var abono = movimiento.signo === 'ABONO';
              return (
                '<tr>' +
                '<td>' +
                util.escapar(util.fecha(movimiento.fecha)) +
                '</td>' +
                '<td>' +
                util.escapar(util.etiquetaTipo(movimiento.tipo)) +
                '</td>' +
                '<td>' +
                util.escapar(movimiento.descripcion || '—') +
                '</td>' +
                '<td>' +
                util.escapar(util.etiquetaCanal(movimiento.canal)) +
                '</td>' +
                '<td class="dato">' +
                util.escapar(movimiento.contraparte || '—') +
                '</td>' +
                '<td class="tabla__numero ' +
                (abono ? 'monto--abono' : 'monto--cargo') +
                '">' +
                (abono ? '+' : '−') +
                ' ' +
                util.escapar(util.moneda(movimiento.monto)) +
                '</td>' +
                '<td><button type="button" class="enlace-accion" data-comprobante="' +
                util.escapar(movimiento.id) +
                '">Comprobante</button></td>' +
                '</tr>'
              );
            })
            .join('') +
          '</tbody></table></div>';

        util.nodos('[data-comprobante]', resultado).forEach(function (boton) {
          boton.addEventListener('click', function () {
            api
              .comprobante(boton.getAttribute('data-comprobante'))
              .then(function (comprobante) {
                mostrarComprobante(comprobante, 'Comprobante de la operación');
              })
              .catch(function (error) {
                util.avisar(error.message, 'error');
              });
          });
        });
      }

      function consultar() {
        resultado.innerHTML = '<div class="vacio">Consultando movimientos…</div>';
        return api
          .consultarMovimientos({
            limite: config.movimientosPorConsulta || 50,
            desde: util.nodo('#filtroDesde', contenedor).value,
            hasta: util.nodo('#filtroHasta', contenedor).value,
            tipo: util.nodo('#filtroTipo', contenedor).value,
          })
          .then(pintar)
          .catch(function (error) {
            resultado.innerHTML =
              '<div class="aviso aviso--error">' +
              util.escapar(error.message) +
              '</div>';
          });
      }

      util.nodo('#filtrosMovimientos', contenedor).addEventListener(
        'submit',
        function (evento) {
          evento.preventDefault();
          consultar();
        },
      );

      util.nodo('#botonLimpiar', contenedor).addEventListener('click', function () {
        util.nodo('#filtroDesde', contenedor).value = '';
        util.nodo('#filtroHasta', contenedor).value = '';
        util.nodo('#filtroTipo', contenedor).value = '';
        consultar();
      });

      util.nodo('#botonCsv', contenedor).addEventListener('click', function () {
        if (!ultimos.length) {
          util.avisar('No hay movimientos que descargar.', 'error');
          return;
        }
        util.descargarCsv(
          'movimientos-' + util.hoyIso(0) + '.csv',
          ['Fecha', 'Operacion', 'Concepto', 'Canal', 'Contraparte', 'Signo', 'Monto'],
          ultimos.map(function (movimiento) {
            return [
              util.fecha(movimiento.fecha),
              util.etiquetaTipo(movimiento.tipo),
              movimiento.descripcion || '',
              util.etiquetaCanal(movimiento.canal),
              movimiento.contraparte || '',
              movimiento.signo,
              movimiento.monto,
            ];
          }),
        );
        util.avisar('Descargamos el archivo con los movimientos.', 'exito');
      });

      return consultar();
    },
  };

  window.PortalVistas['transferencias'] = {
    titulo: 'Transferencias',
    texto:
      'Envíe dinero a otra cuenta de este banco. Revisará el detalle antes de que se aplique.',
    etiqueta: 'Transferencias',
    icono: 'transferencias',
    grupo: 'Operaciones',
    rol: 'CLIENTE',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Preparando la operación…</div>';

      return Promise.all([api.consultarSaldo(), api.consultarLimites()]).then(
        function (resultados) {
          var saldo = resultados[0];
          var limites = resultados[1];

          contenedor.innerHTML =
            '<div class="pasos">' +
            '<span class="paso activo" data-paso="1"><span class="paso__numero">1</span>Datos</span>' +
            '<span class="paso" data-paso="2"><span class="paso__numero">2</span>Confirmación</span>' +
            '</div>' +
            '<div class="rejilla rejilla--dos">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Datos de la transferencia</h2></div>' +
            '<div id="avisoTransferencia" hidden></div>' +
            '<form id="formularioTransferencia" novalidate>' +
            '<label class="campo campo--numerico"><span class="campo__etiqueta">Cuenta destino</span>' +
            '<input type="text" id="cuentaDestino" class="campo__control" inputmode="numeric" placeholder="1000000002" maxlength="30" />' +
            '<span class="campo__ayuda">Entre 6 y 30 dígitos. Debe ser una cuenta de este banco.</span></label>' +
            '<label class="campo campo--numerico"><span class="campo__etiqueta">Monto</span>' +
            '<input type="number" id="montoTransferencia" class="campo__control" min="1" step="0.01" inputmode="decimal" />' +
            '<span class="campo__ayuda">' +
            util.escapar(
              util.frase('Máximo por operación: {monto}', {
                monto: util.moneda(limites.transferencia.maximo),
              }),
            ) +
            '</span></label>' +
            '<div class="montos-sugeridos">' +
            [100, 250, 500, 1000, 2500]
              .map(function (monto) {
                return (
                  '<button type="button" class="monto-sugerido" data-monto="' +
                  monto +
                  '">' +
                  util.escapar(util.moneda(monto)) +
                  '</button>'
                );
              })
              .join('') +
            '</div>' +
            '<label class="campo"><span class="campo__etiqueta">Concepto (opcional)</span>' +
            '<input type="text" id="conceptoTransferencia" class="campo__control" maxlength="120" placeholder="Pago de renta" /></label>' +
            '<button type="submit" class="boton boton--bloque">Continuar</button>' +
            '</form>' +
            '</section>' +
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Su cuenta</h2></div>' +
            '<span class="rotulo">Saldo disponible</span>' +
            '<div class="saldo__monto">' +
            util.escapar(util.moneda(saldo.saldo)) +
            '</div>' +
            '<span class="texto-tenue dato">' +
            util.escapar(saldo.numeroCuenta) +
            '</span>' +
            '<div class="aviso" style="margin-top:20px">' +
            'Las transferencias se aplican al momento y quedan reflejadas de inmediato en el cajero y en la app.' +
            '</div>' +
            '</section>' +
            '</div>';

          util.nodos('[data-monto]', contenedor).forEach(function (boton) {
            boton.addEventListener('click', function () {
              util.nodo('#montoTransferencia', contenedor).value =
                boton.getAttribute('data-monto');
            });
          });

          function mostrarAviso(mensaje, tipo) {
            var caja = util.nodo('#avisoTransferencia', contenedor);
            if (!mensaje) {
              caja.hidden = true;
              return;
            }
            caja.className = 'aviso aviso--' + tipo;
            caja.textContent = mensaje;
            caja.hidden = false;
          }

          util.nodo('#formularioTransferencia', contenedor).addEventListener(
            'submit',
            function (evento) {
              evento.preventDefault();

              var cuentaDestino = util
                .nodo('#cuentaDestino', contenedor)
                .value.trim();
              var monto = Number(util.nodo('#montoTransferencia', contenedor).value);
              var concepto = util
                .nodo('#conceptoTransferencia', contenedor)
                .value.trim();

              if (!/^\d{6,30}$/.test(cuentaDestino)) {
                mostrarAviso(
                  'La cuenta destino debe contener entre 6 y 30 dígitos.',
                  'error',
                );
                return;
              }

              if (!monto || monto <= 0) {
                mostrarAviso('Escriba un monto mayor a cero.', 'error');
                return;
              }

              if (monto > limites.transferencia.maximo) {
                mostrarAviso(
                  util.frase('El máximo por operación es {monto}.', {
                    monto: util.moneda(limites.transferencia.maximo),
                  }),
                  'error',
                );
                return;
              }

              if (monto > saldo.saldo) {
                mostrarAviso(
                  util.frase('El monto supera su saldo disponible de {monto}.', {
                    monto: util.moneda(saldo.saldo),
                  }),
                  'error',
                );
                return;
              }

              mostrarAviso('');
              util.nodo('.paso[data-paso="1"]', contenedor).className =
                'paso completado';
              util.nodo('.paso[data-paso="2"]', contenedor).className = 'paso activo';

              util.abrirModal({
                titulo: 'Confirme la transferencia',
                contenido:
                  '<div class="resumen-operacion">' +
                  '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Cuenta destino</span>' +
                  '<span class="resumen-operacion__valor dato">' +
                  util.escapar(cuentaDestino) +
                  '</span></div>' +
                  '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Monto</span>' +
                  '<span class="resumen-operacion__valor">' +
                  util.escapar(util.moneda(monto)) +
                  '</span></div>' +
                  '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Concepto</span>' +
                  '<span class="resumen-operacion__valor">' +
                  util.escapar(concepto || 'Transferencia entre cuentas') +
                  '</span></div>' +
                  '<div class="resumen-operacion__fila"><span class="resumen-operacion__etiqueta">Saldo tras la operación</span>' +
                  '<span class="resumen-operacion__valor">' +
                  util.escapar(util.moneda(saldo.saldo - monto)) +
                  '</span></div>' +
                  '</div>' +
                  '<p class="texto-tenue">La operación se aplica de inmediato y no puede revertirse desde el portal.</p>',
                botones: [
                  {
                    texto: 'Volver',
                    clase: 'boton--secundario',
                    accion: function () {
                      util.nodo('.paso[data-paso="1"]', contenedor).className =
                        'paso activo';
                      util.nodo('.paso[data-paso="2"]', contenedor).className = 'paso';
                    },
                  },
                  {
                    texto: 'Transferir',
                    clase: 'boton',
                    accion: function () {
                      contexto.mostrarCarga(true);
                      api
                        .transferir(cuentaDestino, monto, concepto)
                        .then(function (comprobante) {
                          contexto.mostrarCarga(false);
                          util.avisar('Transferencia aplicada.', 'exito');
                          mostrarComprobante(
                            comprobante,
                            'Transferencia aplicada',
                          );
                          contexto.recargar();
                        })
                        .catch(function (error) {
                          contexto.mostrarCarga(false);
                          util.nodo('.paso[data-paso="1"]', contenedor).className =
                            'paso activo';
                          util.nodo('.paso[data-paso="2"]', contenedor).className =
                            'paso';
                          mostrarAviso(error.message, 'error');
                        });
                    },
                  },
                ],
              });
            },
          );
        },
      );
    },
  };

  window.PortalVistas['pagos'] = {
    titulo: 'Pago de servicios',
    texto:
      'Pague los servicios del catálogo del banco con cargo a su cuenta. Recibirá comprobante con folio.',
    etiqueta: 'Pago de servicios',
    icono: 'pagos',
    grupo: 'Operaciones',
    rol: 'CLIENTE',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Cargando el catálogo…</div>';

      return Promise.all([
        api.catalogoServicios(),
        api.consultarSaldo(),
        api.prestamosPendientes().catch(function () {
          return [];
        }),
      ]).then(
        function (resultados) {
          var proveedores = resultados[0] || [];
          var saldo = resultados[1];
          var prestamosPendientes = resultados[2] || [];

          contenedor.innerHTML =
            '<div class="rejilla rejilla--dos">' +
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Datos del pago</h2></div>' +
            '<div id="avisoPago" hidden></div>' +
            '<form id="formularioPago" novalidate>' +
            '<label class="campo"><span class="campo__etiqueta">Servicio</span>' +
            '<select id="proveedor" class="campo__control">' +
            proveedores
              .map(function (proveedor) {
                return (
                  '<option value="' +
                  util.escapar(proveedor.codigo) +
                  '">' +
                  util.escapar(
                    util.frase('{proveedor} · {categoria}', {
                      proveedor: util.t(proveedor.nombre),
                      categoria: util.t(proveedor.categoria),
                    }),
                  ) +
                  '</option>'
                );
              })
              .join('') +
            '</select>' +
            '<span class="campo__ayuda" id="ayudaProveedor"></span></label>' +
            '<label class="campo campo--numerico"><span class="campo__etiqueta">Referencia del recibo</span>' +
            '<input type="text" id="referencia" class="campo__control" maxlength="20" placeholder="123456789012" />' +
            '<span class="campo__ayuda">Entre 4 y 20 caracteres alfanuméricos.</span></label>' +
            '<label class="campo campo--numerico"><span class="campo__etiqueta">Monto</span>' +
            '<input type="number" id="montoPago" class="campo__control" min="1" step="0.01" inputmode="decimal" /></label>' +
            '<button type="submit" class="boton boton--bloque">Pagar servicio</button>' +
            '</form>' +
            '</section>' +
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Cargo a su cuenta</h2></div>' +
            '<span class="rotulo">Saldo disponible</span>' +
            '<div class="saldo__monto">' +
            util.escapar(util.moneda(saldo.saldo)) +
            '</div>' +
            '<span class="texto-tenue dato">' +
            util.escapar(saldo.numeroCuenta) +
            '</span>' +
            '<div class="aviso" style="margin-top:20px">' +
            'Los montos mínimos y máximos los define cada proveedor del catálogo del banco.' +
            '</div>' +
            '</section>' +
            '</div>' +
            bloquePrestamos();

          prepararPagoPrestamos();

        function bloquePrestamos() {
          if (!prestamosPendientes.length) {
            return '';
          }

          return (
            '<section class="tarjeta" id="seccionPrestamosPago">' +
            '<div class="tarjeta__encabezado"><h2>Pagos de préstamos</h2>' +
            '<span class="insignia insignia--neutra">' +
            util.escapar(prestamosPendientes.length) +
            ' pendientes</span></div>' +
            '<p class="texto-tenue">Seleccione los préstamos que desea pagar. ' +
            'Puede pagar varios en una sola operación.</p>' +
            '<div id="avisoPagoPrestamos" hidden></div>' +
            '<div class="prestamos-pago">' +
            prestamosPendientes
              .map(function (item) {
                return (
                  '<label class="prestamo-pago">' +
                  '<input type="checkbox" class="prestamo-pago__casilla" value="' +
                  util.escapar(item.id) +
                  '" />' +
                  '<span class="prestamo-pago__datos">' +
                  '<span class="dato">' + util.escapar(item.folio) + '</span>' +
                  '<span class="prestamo-pago__detalle">Vence el ' +
                  util.escapar(util.fechaCorta(item.proximoPagoEn)) +
                  ' · quedan ' + util.escapar(item.pagosRestantes) + ' pagos' +
                  ' · liquidar: ' + util.escapar(util.moneda(item.montoLiquidacion)) +
                  '</span></span>' +
                  '<input type="number" class="campo__control prestamo-pago__monto" ' +
                  'aria-label="Monto a pagar del préstamo ' + util.escapar(item.folio) + '" ' +
                  'min="' + util.escapar(item.pagoMinimo) +
                  '" max="' + util.escapar(item.montoLiquidacion) +
                  '" step="0.01" value="' + util.escapar(item.pagoMinimo) + '" disabled />' +
                  '</label>'
                );
              })
              .join('') +
            '</div>' +
            '<div class="resumen-operacion"><div class="resumen-operacion__fila">' +
            '<span class="resumen-operacion__etiqueta">Total seleccionado</span>' +
            '<span class="resumen-operacion__valor resumen-operacion__valor--fuerte" id="totalPagoPrestamos">' +
            util.escapar(util.moneda(0)) + '</span></div></div>' +
            '<div class="acciones-fila">' +
            '<button type="button" class="boton" id="botonPagarPrestamos" disabled>' +
            'Pagar seleccionados</button></div>' +
            '</section>'
          );
        }

        function prepararPagoPrestamos() {
          if (!prestamosPendientes.length) {
            return;
          }

          var casillas = util.nodos('.prestamo-pago__casilla', contenedor);
          var boton = util.nodo('#botonPagarPrestamos', contenedor);
          var total = util.nodo('#totalPagoPrestamos', contenedor);

          function elegidos() {
            return casillas.filter(function (casilla) {
              return casilla.checked;
            });
          }

          function actualizarTotal() {
            var suma = elegidos().reduce(function (acumulado, casilla) {
              var monto = Number(
                casilla.parentNode.querySelector('.prestamo-pago__monto').value,
              );
              return acumulado + (Number.isFinite(monto) ? monto : 0);
            }, 0);
            total.textContent = util.moneda(Math.round(suma * 100) / 100);
            boton.disabled = elegidos().length === 0;
          }

          casillas.forEach(function (casilla) {
            var campo = casilla.parentNode.querySelector('.prestamo-pago__monto');
            casilla.addEventListener('change', function () {
              campo.disabled = !casilla.checked;
              casilla.parentNode.classList.toggle('activa', casilla.checked);
              actualizarTotal();
            });
            campo.addEventListener('input', actualizarTotal);
          });

          boton.addEventListener('click', function () {
            var aviso = util.nodo('#avisoPagoPrestamos', contenedor);
            var pagos = elegidos().map(function (casilla) {
              return {
                prestamoId: casilla.value,
                monto: Number(
                  casilla.parentNode.querySelector('.prestamo-pago__monto').value,
                ),
              };
            });

            if (!pagos.length) {
              return;
            }

            util
              .confirmar(
                'Confirmar pagos',
                util.frase(
                  'Se aplicarán {cantidad} pagos por un total de {total}. El importe se descontará de su cuenta.',
                  { cantidad: pagos.length, total: total.textContent },
                ),
                'Confirmar pagos',
              )
              .then(function (aceptado) {
                if (!aceptado) {
                  return;
                }
                contexto.mostrarCarga(true);
                api
                  .pagarPrestamos(pagos)
                  .then(function (resultado) {
                    contexto.mostrarCarga(false);
                    util.avisar(resultado.mensaje, 'exito');
                    contexto.recargar();
                  })
                  .catch(function (error) {
                    contexto.mostrarCarga(false);
                    aviso.className = 'aviso aviso--error';
                    aviso.textContent = error.message;
                    aviso.hidden = false;
                  });
              });
          });
        }

          function proveedorActual() {
            var codigo = util.nodo('#proveedor', contenedor).value;
            return (
              proveedores.filter(function (proveedor) {
                return proveedor.codigo === codigo;
              })[0] || null
            );
          }

          function actualizarAyuda() {
            var proveedor = proveedorActual();
            if (!proveedor) {
              return;
            }
            util.nodo('#ayudaProveedor', contenedor).textContent =
              util.frase(
                'Monto entre {minimo} y {maximo} · referencia de {longitud} caracteres.',
                {
                  minimo: util.moneda(proveedor.montoMinimo),
                  maximo: util.moneda(proveedor.montoMaximo),
                  longitud: proveedor.longitudReferencia,
                },
              );
          }

          function mostrarAviso(mensaje, tipo) {
            var caja = util.nodo('#avisoPago', contenedor);
            if (!mensaje) {
              caja.hidden = true;
              return;
            }
            caja.className = 'aviso aviso--' + tipo;
            caja.textContent = mensaje;
            caja.hidden = false;
          }

          util.nodo('#proveedor', contenedor).addEventListener(
            'change',
            actualizarAyuda,
          );
          actualizarAyuda();

          util.nodo('#formularioPago', contenedor).addEventListener(
            'submit',
            function (evento) {
              evento.preventDefault();

              var proveedor = proveedorActual();
              var referencia = util.nodo('#referencia', contenedor).value.trim();
              var monto = Number(util.nodo('#montoPago', contenedor).value);

              if (!proveedor) {
                mostrarAviso('Seleccione un servicio del catálogo.', 'error');
                return;
              }

              if (!/^[A-Za-z0-9]{4,20}$/.test(referencia)) {
                mostrarAviso(
                  'La referencia debe ser alfanumérica de 4 a 20 caracteres.',
                  'error',
                );
                return;
              }

              if (
                !monto ||
                monto < proveedor.montoMinimo ||
                monto > proveedor.montoMaximo
              ) {
                mostrarAviso(
                  util.frase(
                    'El monto para {proveedor} debe estar entre {minimo} y {maximo}.',
                    {
                      proveedor: proveedor.nombre,
                      minimo: util.moneda(proveedor.montoMinimo),
                      maximo: util.moneda(proveedor.montoMaximo),
                    },
                  ),
                  'error',
                );
                return;
              }

              mostrarAviso('');

              util
                .confirmar(
                  'Confirme el pago',
                  util.frase(
                    'Se aplicará un cargo de {monto} a {proveedor} con referencia {referencia}.',
                    {
                      monto: util.moneda(monto),
                      proveedor: proveedor.nombre,
                      referencia: referencia,
                    },
                  ),
                  'Pagar',
                )
                .then(function (aceptado) {
                  if (!aceptado) {
                    return;
                  }
                  contexto.mostrarCarga(true);
                  api
                    .pagarServicio(proveedor.codigo, referencia, monto)
                    .then(function (comprobante) {
                      contexto.mostrarCarga(false);
                      util.avisar('Pago aplicado.', 'exito');
                      mostrarComprobante(comprobante, 'Pago aplicado');
                      contexto.recargar();
                    })
                    .catch(function (error) {
                      contexto.mostrarCarga(false);
                      mostrarAviso(error.message, 'error');
                    });
                });
            },
          );
        },
      );
    },
  };

  window.PortalVistas['tarjetas'] = {
    titulo: 'Mis tarjetas',
    texto:
      'Consulte sus tarjetas de débito y crédito, adminístrelas y solicite una nueva línea de crédito.',
    etiqueta: 'Mis tarjetas',
    icono: 'tarjeta',
    grupo: 'Operaciones',
    rol: 'CLIENTE',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Consultando sus tarjetas…</div>';

      return Promise.all([
        api.listarTarjetas(),
        api.catalogoCredito().catch(function () {
          return null;
        }),
        api.resumenCuenta().catch(function () {
          return null;
        }),
      ]).then(function (resultados) {
        var tarjetas = resultados[0] || [];
        var catalogo = resultados[1];
        var cuenta = resultados[2];
        var titular = cuenta ? cuenta.titular : null;

        contenedor.innerHTML =
          '<div id="zonaTarjetas"></div>' +
          '<section class="tarjeta" id="zonaCatalogo"></section>';

        pintarTarjetas(tarjetas, titular);
        pintarCatalogo(catalogo);

        function pintarTarjetas(lista, titularCuenta) {
          var zona = util.nodo('#zonaTarjetas', contenedor);

          if (!lista.length) {
            zona.innerHTML = util.vacio(
              'Sin tarjetas',
              'Todavía no tiene ninguna tarjeta emitida.',
            );
            return;
          }

          zona.innerHTML =
            '<div class="rejilla rejilla--dos">' +
            lista.map(function (t) { return bloqueTarjeta(t, titularCuenta); }).join('') +
            '</div>';

          conectarDetalleTarjetas(zona, contexto);

          util.nodos('[data-bloquear]', zona).forEach(function (boton) {
            boton.addEventListener('click', function () {
              var id = boton.getAttribute('data-bloquear');
              util
                .confirmar(
                  'Bloquear tarjeta',
                  'Nadie podrá usar esta tarjeta hasta que usted la desbloquee.',
                  'Bloquear',
                  'boton--peligro',
                )
                .then(function (aceptado) {
                  if (!aceptado) {
                    return;
                  }
                  contexto.mostrarCarga(true);
                  api
                    .bloquearTarjeta(id)
                    .then(function () {
                      contexto.mostrarCarga(false);
                      util.avisar('Tarjeta bloqueada.', 'exito');
                      contexto.recargar();
                    })
                    .catch(function (error) {
                      contexto.mostrarCarga(false);
                      util.avisar(error.message, 'error');
                    });
                });
            });
          });

          util.nodos('[data-desbloquear]', zona).forEach(function (boton) {
            boton.addEventListener('click', function () {
              contexto.mostrarCarga(true);
              api
                .desbloquearTarjeta(boton.getAttribute('data-desbloquear'))
                .then(function () {
                  contexto.mostrarCarga(false);
                  util.avisar('Tarjeta desbloqueada.', 'exito');
                  contexto.recargar();
                })
                .catch(function (error) {
                  contexto.mostrarCarga(false);
                  util.avisar(error.message, 'error');
                });
            });
          });
        }

        function bloqueTarjeta(t, titularCuenta) {
          var esCredito = t.tipo === 'CREDITO';
          var motivo = util.motivoLegible(t.motivoBloqueo);

          var acciones = '';
          if (t.estado === 'ACTIVA') {
            acciones =
              '<button type="button" class="boton boton--peligro" data-bloquear="' +
              util.escapar(t.id) +
              '">Bloquear tarjeta</button>';
          } else if (t.estado === 'BLOQUEADA' && t.motivoBloqueo === 'CLIENTE') {
            acciones =
              '<button type="button" class="boton boton--exito" data-desbloquear="' +
              util.escapar(t.id) +
              '">Desbloquear tarjeta</button>';
          }

          var explicacion = '';
          if (t.estado === 'BLOQUEADA' && t.motivoBloqueo !== 'CLIENTE') {
            explicacion =
              '<div class="aviso aviso--atencion">Esta tarjeta no la bloqueó usted, ' +
              'así que el desbloqueo lo debe hacer el banco.</div>';
          }

          var filas =
            fila('Número', '<span class="dato">' + util.escapar(t.numeroTarjeta) + '</span>') +
            fila('Titular', util.escapar(titularCuenta || t.titular || '—')) +
            fila(
              'Tipo',
              esCredito
                ? util.escapar(
                    util.frase('Crédito · {nivel}', {
                      nivel: util.t(t.nombreNivel || ''),
                    }),
                  )
                : util.escapar(util.t('Débito')),
            ) +
            fila('Emitida el', util.escapar(util.fechaCorta(t.emitidaEn)));

          if (esCredito) {
            filas +=
              fila('Línea autorizada', util.escapar(util.moneda(t.limiteCredito))) +
              fila('Disponible', util.escapar(util.moneda(t.creditoDisponible))) +
              fila(
                'Anualidad',
                t.anualidad ? util.escapar(util.moneda(t.anualidad)) : 'Sin anualidad',
              );
          } else {
            filas += fila('Intentos fallidos de PIN', util.escapar(String(t.intentosFallidos)));
          }

          if (motivo) {
            filas += fila('Motivo del bloqueo', util.escapar(motivo));
          }

          var beneficios = '';
          if (esCredito && t.beneficios && t.beneficios.length) {
            beneficios =
              '<div class="beneficios">' +
              '<span class="beneficios__titulo">Beneficios de su nivel ' +
              util.escapar(t.nombreNivel || '') +
              '</span><ul class="beneficios__lista">' +
              t.beneficios
                .map(function (b) {
                  return '<li>' + util.escapar(b) + '</li>';
                })
                .join('') +
              '</ul></div>';
          }

          return (
            '<section class="tarjeta tarjeta--plastico">' +
            '<div class="tarjeta__encabezado">' +
            '<h2>' +
            (esCredito ? 'Tarjeta de crédito' : 'Tarjeta de débito') +
            '</h2>' +
            '<span class="' + util.claseEstadoTarjeta(t.estado) + '">' +
            util.escapar(t.estado) +
            '</span></div>' +
            plastico(t, titularCuenta) +
            '<div class="resumen-operacion">' + filas + '</div>' +
            beneficios +
            explicacion +
            '<div class="acciones-fila">' + acciones + '</div>' +
            '</section>'
          );
        }

        function fila(etiqueta, valor) {
          return (
            '<div class="resumen-operacion__fila">' +
            '<span class="resumen-operacion__etiqueta">' +
            util.escapar(etiqueta) +
            '</span><span class="resumen-operacion__valor">' +
            valor +
            '</span></div>'
          );
        }

        function pintarCatalogo(datos) {
          var zona = util.nodo('#zonaCatalogo', contenedor);

          if (!datos) {
            zona.innerHTML = util.vacio(
              'Catálogo no disponible',
              'No fue posible consultar las tarjetas de crédito en este momento.',
            );
            return;
          }

          var recomendada = datos.niveles.filter(function (n) {
            return n.recomendada;
          })[0];

          var encabezado =
            '<div class="tarjeta__encabezado"><h2>Solicitar una tarjeta de crédito</h2></div>' +
            '<p class="texto-tenue">' +
            util.escapar(
              util.frase(
                'Su saldo actual es de {saldo}. La aprobación depende de ese saldo en el momento de solicitarla.',
                { saldo: util.moneda(datos.saldoActual) },
              ),
            ) +
            '</p>';

          if (recomendada) {
            encabezado +=
              '<div class="aviso aviso--exito">' +
              util.escapar(
                util.frase(
                  'Le recomendamos la tarjeta {nivel}: su saldo alcanza el mínimo requerido y obtendría una línea estimada de {linea}.',
                  {
                    nivel: recomendada.nombre,
                    linea: util.moneda(recomendada.lineaEstimada),
                  },
                ),
              ) +
              '</div>';
          } else {
            encabezado +=
              '<div class="aviso aviso--atencion">Por ahora su saldo no alcanza el mínimo de ninguna ' +
              'tarjeta de crédito. Aumente su saldo para poder solicitar una.</div>';
          }

          zona.innerHTML =
            encabezado +
            '<div class="niveles">' +
            datos.niveles.map(tarjetaNivel).join('') +
            '</div>';

          util.nodos('[data-solicitar]', zona).forEach(function (boton) {
            boton.addEventListener('click', function () {
              solicitar(boton.getAttribute('data-solicitar'), boton.getAttribute('data-nombre'));
            });
          });
        }

        function tarjetaNivel(n) {
          var clases = 'nivel nivel--' + n.color;
          if (n.recomendada) {
            clases += ' nivel--recomendada';
          }
          if (!n.alcanzaRequisito) {
            clases += ' nivel--fuera-alcance';
          }

          var estado;
          if (n.yaContratada) {
            estado = '<span class="insignia insignia--activa">Ya la tiene</span>';
          } else if (n.alcanzaRequisito) {
            estado = '<span class="insignia insignia--activa">Disponible</span>';
          } else {
            estado =
              '<span class="insignia insignia--bloqueada">' +
              util.escapar(
                util.frase('Le faltan {monto}', {
                  monto: util.moneda(n.faltante),
                }),
              ) +
              '</span>';
          }

          var boton;
          if (n.yaContratada) {
            boton = '<button type="button" class="boton boton--secundario" disabled>Contratada</button>';
          } else {
            boton =
              '<button type="button" class="boton' +
              (n.recomendada ? '' : ' boton--secundario') +
              '" data-solicitar="' +
              util.escapar(n.nivel) +
              '" data-nombre="' +
              util.escapar(n.nombre) +
              '">Solicitar</button>';
          }

          return (
            '<article class="' + clases + '">' +
            '<div class="nivel__cabecera">' +
            '<h3 class="nivel__nombre">' + util.escapar(n.nombre) + '</h3>' +
            estado +
            '</div>' +
            (n.recomendada ? '<span class="nivel__sello">Recomendada para usted</span>' : '') +
            '<div class="nivel__datos">' +
            '<div><span class="nivel__etiqueta">Saldo mínimo</span><span class="nivel__valor">' +
            util.escapar(util.moneda(n.saldoMinimo)) +
            '</span></div>' +
            '<div><span class="nivel__etiqueta">Línea estimada</span><span class="nivel__valor">' +
            (n.lineaEstimada !== null && n.lineaEstimada !== undefined
              ? util.escapar(util.moneda(n.lineaEstimada))
              : '—') +
            '</span></div>' +
            '<div><span class="nivel__etiqueta">Anualidad</span><span class="nivel__valor">' +
            (n.anualidad ? util.escapar(util.moneda(n.anualidad)) : 'Sin anualidad') +
            '</span></div>' +
            '</div>' +
            '<ul class="nivel__beneficios">' +
            n.beneficios
              .map(function (b) {
                return '<li>' + util.escapar(b) + '</li>';
              })
              .join('') +
            '</ul>' +
            '<div class="nivel__accion">' + boton + '</div>' +
            '</article>'
          );
        }

        function solicitar(nivel, nombre) {
          util
            .confirmar(
              'Solicitar tarjeta ' + nombre,
              'El banco evaluará el saldo de su cuenta en este momento para aprobar o rechazar la solicitud.',
              'Solicitar',
            )
            .then(function (aceptado) {
              if (!aceptado) {
                return;
              }

              contexto.mostrarCarga(true);
              api
                .solicitarCredito(nivel)
                .then(function (resultado) {
                  contexto.mostrarCarga(false);
                  util.abrirModal({
                    titulo: 'Solicitud aprobada',
                    contenido:
                      '<p>' + util.escapar(resultado.mensaje) + '</p>' +
                      '<p class="texto-tenue">Su PIN inicial es <strong class="dato">' +
                      util.escapar(resultado.pinInicial) +
                      '</strong>. Cámbielo desde el cajero en cuanto pueda.</p>',
                    botones: [
                      {
                        texto: 'Ver mis tarjetas',
                        clase: 'boton',
                        accion: function () {
                          contexto.recargar();
                        },
                      },
                    ],
                  });
                })
                .catch(function (error) {
                  contexto.mostrarCarga(false);
                  util.abrirModal({
                    titulo: 'Solicitud rechazada',
                    contenido:
                      '<div class="aviso aviso--error">' +
                      util.escapar(error.message) +
                      '</div>' +
                      '<p class="texto-tenue">Puede intentarlo de nuevo cuando su cuenta alcance el saldo mínimo, ' +
                      'o solicitar un nivel inferior.</p>',
                    botones: [
                      {
                        texto: 'Entendido',
                        clase: 'boton boton--secundario',
                        accion: function () {
                          contexto.recargar();
                        },
                      },
                    ],
                  });
                });
            });
        }
      });
    },
  };

  window.PortalVistas['prestamos'] = {
    titulo: 'Préstamos',
    texto:
      'Consulte su límite disponible y solicite un préstamo con depósito inmediato en su cuenta.',
    etiqueta: 'Préstamos',
    icono: 'transferencias',
    grupo: 'Operaciones',
    rol: 'CLIENTE',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Consultando sus condiciones…</div>';

      return Promise.all([
        api.condicionesPrestamo(),
        api.listarPrestamos().catch(function () {
          return [];
        }),
      ]).then(function (resultados) {
        var condiciones = resultados[0];
        var historial = resultados[1] || [];

        var seleccion = {
          monto: null,
          plazo: condiciones.plazoPorDefecto || 12,
        };

        contenedor.innerHTML =
          seccionCondiciones() +
          (condiciones.elegible ? seccionSolicitud() : seccionNoElegible()) +
          seccionHistorial();

        if (condiciones.elegible) {
          prepararSolicitud();
        }

        prepararAccionesPrestamos();

        function fila(etiqueta, valor, destacado) {
          return (
            '<div class="resumen-operacion__fila">' +
            '<span class="resumen-operacion__etiqueta">' +
            util.escapar(etiqueta) +
            '</span><span class="resumen-operacion__valor' +
            (destacado ? ' resumen-operacion__valor--fuerte' : '') +
            '">' +
            valor +
            '</span></div>'
          );
        }

        function seccionCondiciones() {
          var perfil = condiciones.tieneTarjetaCredito
            ? util.escapar(condiciones.nombrePerfil)
            : 'Sin tarjeta de crédito';

          var nota = condiciones.tieneTarjetaCredito
            ? util.frase(
                'Su nivel de tarjeta de crédito {nivel} aumenta el límite disponible y reduce la tasa aplicada.',
                { nivel: util.escapar(condiciones.nombrePerfil) },
              )
            : util.t(
                'Su límite corresponde al perfil sin tarjeta de crédito. Al contratar una tarjeta de crédito, su límite y su tasa mejoran según el nivel.',
              );

          return (
            '<section class="tarjeta prestamo-perfil prestamo-perfil--' +
            util.escapar(condiciones.color || 'debito') +
            '">' +
            '<div class="tarjeta__encabezado"><h2>Su límite de préstamo</h2>' +
            '<span class="insignia' +
            (condiciones.tieneTarjetaCredito ? '' : ' insignia--neutra') +
            '">' +
            perfil +
            '</span></div>' +
            '<div class="prestamo-limite">' +
            '<span class="prestamo-limite__etiqueta">Puede solicitar hasta</span>' +
            '<span class="prestamo-limite__monto">' +
            util.escapar(util.moneda(condiciones.montoMaximo)) +
            '</span></div>' +
            '<div class="resumen-operacion">' +
            fila('Monto mínimo', util.escapar(util.moneda(condiciones.montoMinimo))) +
            fila('Monto máximo', util.escapar(util.moneda(condiciones.montoMaximo)), true) +
            fila('Saldo considerado', util.escapar(util.moneda(condiciones.saldoDisponible))) +
            fila('Tasa anual aplicada', util.escapar(condiciones.tasaAnual) + ' %') +
            fila(
              'Préstamos vigentes',
              util.escapar(
                util.frase('{activos} de {maximo}', {
                  activos: condiciones.prestamosActivos,
                  maximo: condiciones.maximoPrestamosActivos,
                }),
              ),
            ) +
            '</div>' +
            '<p class="texto-tenue">' + nota + '</p>' +
            '</section>'
          );
        }

        function seccionNoElegible() {
          return (
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Solicitar un préstamo</h2></div>' +
            '<div class="aviso aviso--atencion">' +
            '<strong>Por ahora no puede solicitar un préstamo.</strong>' +
            '<ul class="lista-motivos">' +
            condiciones.motivos
              .map(function (motivo) {
                return '<li>' + util.escapar(motivo) + '</li>';
              })
              .join('') +
            '</ul></div>' +
            '<p class="texto-tenue">Cuando su cuenta cumpla las condiciones, esta sección ' +
            'le permitirá solicitar el préstamo.</p>' +
            '</section>'
          );
        }

        function seccionSolicitud() {
          return (
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Solicitar un préstamo</h2></div>' +
            '<div id="avisoPrestamo" hidden></div>' +
            '<span class="rotulo">Montos disponibles</span>' +
            '<div class="montos-prestamo">' +
            condiciones.montosSugeridos
              .map(function (monto) {
                return (
                  '<button type="button" class="monto-prestamo" data-monto="' +
                  util.escapar(monto) +
                  '">' +
                  util.escapar(util.moneda(monto)) +
                  '</button>'
                );
              })
              .join('') +
            '</div>' +
            '<label class="campo"><span class="campo__etiqueta">O escriba otra cantidad</span>' +
            '<input type="number" id="montoPersonalizado" class="campo__control" ' +
            'min="' + util.escapar(condiciones.montoMinimo) + '" ' +
            'max="' + util.escapar(condiciones.montoMaximo) + '" step="100" ' +
            'placeholder="' +
            util.escapar(
              util.frase('Entre {minimo} y {maximo}', {
                minimo: condiciones.montoMinimo,
                maximo: condiciones.montoMaximo,
              }),
            ) +
            '" />' +
            '<span class="campo__ayuda">' +
            util.escapar(
              util.frase('Mínimo {minimo} · Máximo {maximo}', {
                minimo: util.moneda(condiciones.montoMinimo),
                maximo: util.moneda(condiciones.montoMaximo),
              }),
            ) +
            '</span></label>' +
            '<span class="rotulo">Plazo</span>' +
            '<div class="plazos-prestamo">' +
            condiciones.plazosDisponibles
              .map(function (plazo) {
                return (
                  '<button type="button" class="plazo-prestamo' +
                  (plazo === seleccion.plazo ? ' activa' : '') +
                  '" data-plazo="' +
                  util.escapar(plazo) +
                  '">' +
                  util.escapar(plazo) +
                  ' meses</button>'
                );
              })
              .join('') +
            '</div>' +
            '<div id="resumenPrestamo" class="resumen-prestamo" hidden></div>' +
            '<div class="acciones-fila">' +
            '<button type="button" class="boton" id="botonPrestamo" disabled>' +
            'Continuar con la solicitud</button>' +
            '</div>' +
            '</section>'
          );
        }

        function mostrarAviso(mensaje, tipo) {
          var caja = util.nodo('#avisoPrestamo', contenedor);
          if (!caja) {
            return;
          }
          if (!mensaje) {
            caja.hidden = true;
            caja.textContent = '';
            return;
          }
          caja.className = 'aviso aviso--' + tipo;
          caja.textContent = mensaje;
          caja.hidden = false;
        }

        function validarMonto(monto) {
          if (!Number.isFinite(monto) || monto <= 0) {
            return 'Escriba una cantidad válida.';
          }
          if (monto < condiciones.montoMinimo) {
            return (
              util.frase('El préstamo mínimo es de {monto}.', {
                monto: util.moneda(condiciones.montoMinimo),
              })
            );
          }
          if (monto > condiciones.montoMaximo) {
            return (
              util.frase(
                'El monto supera su límite. Puede solicitar como máximo {monto}.',
                { monto: util.moneda(condiciones.montoMaximo) },
              )
            );
          }
          return null;
        }

        function actualizarResumen() {
          var caja = util.nodo('#resumenPrestamo', contenedor);
          var boton = util.nodo('#botonPrestamo', contenedor);

          if (!caja || !boton) {
            return;
          }

          if (seleccion.monto === null) {
            caja.hidden = true;
            boton.disabled = true;
            return;
          }

          var error = validarMonto(seleccion.monto);
          if (error) {
            caja.hidden = true;
            boton.disabled = true;
            mostrarAviso(error, 'error');
            return;
          }

          mostrarAviso('');
          boton.disabled = true;
          caja.hidden = false;
          caja.innerHTML = '<div class="vacio">Calculando condiciones…</div>';

          api
            .simularPrestamo(seleccion.monto, seleccion.plazo)
            .then(function (simulacion) {
              caja.innerHTML =
                '<span class="rotulo">Resumen de su solicitud</span>' +
                '<div class="resumen-operacion">' +
                fila('Monto solicitado', util.escapar(util.moneda(simulacion.monto)), true) +
                fila('Límite disponible', util.escapar(util.moneda(condiciones.montoMaximo))) +
                fila('Plazo', util.escapar(simulacion.plazoMeses) + ' meses') +
                fila('Tasa anual', util.escapar(simulacion.tasaAnual) + ' %') +
                fila('Pago mensual', util.escapar(util.moneda(simulacion.pagoMensual)), true) +
                fila('Intereses', util.escapar(util.moneda(simulacion.intereses))) +
                fila('Total a pagar', util.escapar(util.moneda(simulacion.totalAPagar))) +
                '</div>' +
                '<p class="campo__ayuda">El monto se depositará en su cuenta al confirmar. ' +
                'El primer pago vence a los 30 días.</p>';
              boton.disabled = false;
            })
            .catch(function (fallo) {
              caja.hidden = true;
              mostrarAviso(fallo.message, 'error');
            });
        }

        function prepararSolicitud() {
          util.nodos('[data-monto]', contenedor).forEach(function (boton) {
            boton.addEventListener('click', function () {
              util.nodos('[data-monto]', contenedor).forEach(function (otro) {
                otro.classList.remove('activa');
              });
              boton.classList.add('activa');
              var campo = util.nodo('#montoPersonalizado', contenedor);
              if (campo) {
                campo.value = '';
              }
              seleccion.monto = Number(boton.getAttribute('data-monto'));
              actualizarResumen();
            });
          });

          util.nodos('[data-plazo]', contenedor).forEach(function (boton) {
            boton.addEventListener('click', function () {
              util.nodos('[data-plazo]', contenedor).forEach(function (otro) {
                otro.classList.remove('activa');
                otro.setAttribute('aria-pressed', 'false');
              });
              boton.classList.add('activa');
              boton.setAttribute('aria-pressed', 'true');
              seleccion.plazo = Number(boton.getAttribute('data-plazo'));
              actualizarResumen();
            });
          });

          var campo = util.nodo('#montoPersonalizado', contenedor);
          var temporizador = null;

          if (campo) {
            campo.addEventListener('input', function () {
              util.nodos('[data-monto]', contenedor).forEach(function (otro) {
                otro.classList.remove('activa');
              });

              window.clearTimeout(temporizador);
              temporizador = window.setTimeout(function () {
                var valor = campo.value.trim();
                if (!valor) {
                  seleccion.monto = null;
                  mostrarAviso('');
                  actualizarResumen();
                  return;
                }
                seleccion.monto = Number(valor);
                actualizarResumen();
              }, 350);
            });
          }

          var botonSolicitar = util.nodo('#botonPrestamo', contenedor);
          if (botonSolicitar) {
            botonSolicitar.addEventListener('click', confirmarSolicitud);
          }
        }

        function confirmarSolicitud() {
          var error = validarMonto(seleccion.monto);
          if (error) {
            mostrarAviso(error, 'error');
            return;
          }

          util
            .confirmar(
              'Confirmar solicitud',
              util.frase(
                'Solicitará un préstamo de {monto} a {plazo} meses. El banco evaluará su cuenta y, si aprueba, depositará el monto de inmediato.',
                { monto: util.moneda(seleccion.monto), plazo: seleccion.plazo },
              ),
              'Confirmar solicitud',
            )
            .then(function (aceptado) {
              if (!aceptado) {
                return;
              }

              contexto.mostrarCarga(true);
              api
                .solicitarPrestamo(seleccion.monto, seleccion.plazo)
                .then(function (resultado) {
                  contexto.mostrarCarga(false);
                  util.abrirModal({
                    titulo: 'Préstamo aprobado',
                    contenido:
                      '<div class="aviso aviso--exito">' +
                      util.escapar(resultado.mensaje) +
                      '</div>' +
                      '<div class="resumen-operacion">' +
                      fila('Folio', '<span class="dato">' + util.escapar(resultado.prestamo.folio) + '</span>') +
                      fila('Monto', util.escapar(util.moneda(resultado.prestamo.monto)), true) +
                      fila('Plazo', util.escapar(resultado.prestamo.plazoMeses) + ' meses') +
                      fila('Pago mensual', util.escapar(util.moneda(resultado.prestamo.pagoMensual))) +
                      fila('Total a pagar', util.escapar(util.moneda(resultado.prestamo.totalAPagar))) +
                      fila('Saldo de su cuenta', util.escapar(util.moneda(resultado.saldoResultante)), true) +
                      '</div>',
                    botones: [
                      {
                        texto: 'Entendido',
                        clase: 'boton',
                        accion: function () {
                          contexto.recargar();
                        },
                      },
                    ],
                  });
                })
                .catch(function (fallo) {
                  contexto.mostrarCarga(false);
                  util.abrirModal({
                    titulo: 'Solicitud rechazada',
                    contenido:
                      '<div class="aviso aviso--error">' +
                      util.escapar(fallo.message) +
                      '</div>' +
                      '<p class="texto-tenue">Puede intentarlo de nuevo cuando su cuenta alcance el saldo mínimo, ' +
                      'o solicitar un nivel inferior.</p>',
                    botones: [
                      {
                        texto: 'Entendido',
                        clase: 'boton boton--secundario',
                        accion: function () {
                          contexto.recargar();
                        },
                      },
                    ],
                  });
                });
            });
        }

        function seccionHistorial() {
          if (!historial.length) {
            return (
              '<section class="tarjeta">' +
              '<div class="tarjeta__encabezado"><h2>Mis préstamos</h2></div>' +
              util.vacio('Sin préstamos', 'Todavía no ha solicitado ningún préstamo.') +
              '</section>'
            );
          }

          var vigentes = historial.filter(function (p) {
            return p.estado === 'APROBADO';
          });

          return (
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Mis préstamos</h2>' +
            '<span class="insignia insignia--neutra">' +
            util.escapar(vigentes.length) +
            ' vigentes</span></div>' +
            (vigentes.length
              ? '<div class="rejilla rejilla--dos">' +
                vigentes.map(fichaPrestamo).join('') +
                '</div>'
              : '') +
            '<div class="tabla-envoltura"><table class="tabla">' +
            '<caption class="tabla__titulo">Historial de solicitudes</caption>' +
            '<thead><tr><th scope="col">Fecha</th><th scope="col">Folio</th>' +
            '<th scope="col" class="tabla__numero">Monto</th><th scope="col">Plazo</th>' +
            '<th scope="col" class="tabla__numero">Pago mensual</th>' +
            '<th scope="col" class="tabla__numero">Pendiente</th>' +
            '<th scope="col">Progreso</th><th scope="col">Próximo pago</th>' +
            '<th scope="col">Estado</th><th scope="col">Canal</th><th scope="col"></th>' +
            '</tr></thead><tbody>' +
            historial.map(filaPrestamo).join('') +
            '</tbody></table></div>' +
            '</section>'
          );
        }

        function fichaPrestamo(p) {
          return (
            '<article class="prestamo-ficha">' +
            '<div class="prestamo-ficha__cabecera">' +
            '<span class="dato">' + util.escapar(p.folio) + '</span>' +
            '<span class="insignia insignia--activa">Vigente</span>' +
            '</div>' +
            '<div class="prestamo-ficha__pendiente">' +
            '<span class="prestamo-limite__etiqueta">Falta por pagar</span>' +
            '<span class="prestamo-limite__monto">' +
            util.escapar(util.moneda(p.montoLiquidacion)) +
            '</span></div>' +
            barraProgreso(p) +
            '<div class="resumen-operacion">' +
            fila('Próximo pago', util.escapar(util.fechaCorta(p.proximoPagoEn))) +
            fila('Pago mínimo', util.escapar(util.moneda(p.pagoMinimo)), true) +
            fila('Para liquidar hoy', util.escapar(util.moneda(p.montoLiquidacion))) +
            fila('Pagos', util.escapar(p.pagosRealizados) + ' de ' + util.escapar(p.plazoMeses)) +
            '</div>' +
            '<div class="acciones-fila">' +
            '<button type="button" class="boton" data-pagar="' +
            util.escapar(p.id) + '">Pagar</button>' +
            '<button type="button" class="boton boton--secundario" data-detalle="' +
            util.escapar(p.id) + '">Ver detalle</button>' +
            '</div></article>'
          );
        }

        function barraProgreso(p) {
          return (
            '<div class="progreso" role="progressbar" aria-valuenow="' +
            util.escapar(p.progreso) +
            '" aria-valuemin="0" aria-valuemax="100" aria-label="Avance del préstamo ' +
            util.escapar(p.folio) + '">' +
            '<div class="progreso__barra" style="width:' + util.escapar(p.progreso) + '%"></div>' +
            '</div>' +
            '<p class="progreso__texto">' +
            util.escapar(
              util.frase('{progreso} % pagado · quedan {restantes} pagos', {
                progreso: p.progreso,
                restantes: p.pagosRestantes,
              }),
            ) +
            '</p>'
          );
        }

        function filaPrestamo(p) {
          var activo = p.estado === 'APROBADO';
          var clase =
            p.estado === 'APROBADO'
              ? 'insignia insignia--activa'
              : p.estado === 'LIQUIDADO'
                ? 'insignia insignia--neutra'
                : 'insignia insignia--bloqueada';

          return (
            '<tr><td>' + util.escapar(util.fechaCorta(p.creadoEn)) +
            '</td><td class="dato">' + util.escapar(p.folio) +
            '</td><td class="tabla__numero">' + util.escapar(util.moneda(p.monto)) +
            '</td><td>' + util.escapar(p.plazoMeses) + ' meses' +
            '</td><td class="tabla__numero">' +
            util.escapar(activo ? util.moneda(p.pagoMensual) : '—') +
            '</td><td class="tabla__numero">' +
            util.escapar(activo ? util.moneda(p.montoLiquidacion) : '—') +
            '</td><td>' +
            (p.estado === 'RECHAZADO'
              ? '—'
              : util.escapar(p.pagosRealizados) + '/' + util.escapar(p.plazoMeses)) +
            '</td><td>' +
            util.escapar(activo ? util.fechaCorta(p.proximoPagoEn) : '—') +
            '</td><td><span class="' + clase + '">' + util.escapar(p.estado) + '</span>' +
            (p.motivoRechazo
              ? '<span class="movimiento__detalle">' + util.escapar(p.motivoRechazo) + '</span>'
              : '') +
            '</td><td>' + util.escapar(util.etiquetaCanal(p.canal)) +
            '</td><td>' +
            (activo
              ? '<button type="button" class="enlace-accion" data-detalle="' +
                util.escapar(p.id) + '">Detalle</button>'
              : '') +
            '</td></tr>'
          );
        }

        function prepararAccionesPrestamos() {
          util.nodos('[data-detalle]', contenedor).forEach(function (boton) {
            boton.addEventListener('click', function () {
              abrirDetalle(boton.getAttribute('data-detalle'));
            });
          });
          util.nodos('[data-pagar]', contenedor).forEach(function (boton) {
            boton.addEventListener('click', function () {
              abrirPago(boton.getAttribute('data-pagar'));
            });
          });
        }

        function abrirDetalle(prestamoId) {
          contexto.mostrarCarga(true);
          api
            .detallePrestamo(prestamoId)
            .then(function (p) {
              contexto.mostrarCarga(false);
              util.abrirModal({
                titulo: 'Préstamo ' + p.folio,
                contenido:
                  barraProgreso(p) +
                  '<div class="resumen-operacion">' +
                  fila('Estado', util.escapar(p.estado)) +
                  fila('Monto original', util.escapar(util.moneda(p.monto)), true) +
                  fila('Plazo contratado', util.escapar(p.plazoMeses) + ' meses') +
                  fila('Tasa anual', util.escapar(p.tasaAnual) + ' %') +
                  fila('Pago mensual', util.escapar(util.moneda(p.pagoMensual))) +
                  fila('Total proyectado', util.escapar(util.moneda(p.totalAPagar))) +
                  fila('Capital pendiente', util.escapar(util.moneda(p.capitalPendiente))) +
                  fila('Falta por pagar', util.escapar(util.moneda(p.montoLiquidacion)), true) +
                  fila('Para liquidar hoy', util.escapar(util.moneda(p.montoLiquidacion))) +
                  fila('Pago mínimo', util.escapar(util.moneda(p.pagoMinimo))) +
                  fila('Interés del periodo', util.escapar(util.moneda(p.interesCorriente))) +
                  fila('Pagos realizados', util.escapar(p.pagosRealizados)) +
                  fila('Pagos restantes', util.escapar(p.pagosRestantes)) +
                  fila('Total pagado', util.escapar(util.moneda(p.totalPagado))) +
                  fila('Intereses cubiertos', util.escapar(util.moneda(p.interesesPagados))) +
                  fila('Próximo pago', util.escapar(util.fechaCorta(p.proximoPagoEn))) +
                  fila('Canal de solicitud', util.escapar(util.etiquetaCanal(p.canal))) +
                  '</div>' +
                  (p.estado === 'APROBADO'
                    ? '<p class="campo__ayuda">Liquidar el préstamo hoy evita los intereses ' +
                      'de los pagos que faltan.</p>'
                    : ''),
                botones:
                  p.estado === 'APROBADO'
                    ? [
                        { texto: 'Cerrar', clase: 'boton--secundario' },
                        {
                          texto: 'Pagar',
                          clase: 'boton',
                          accion: function () {
                            abrirPago(p.id);
                          },
                        },
                      ]
                    : [{ texto: 'Cerrar', clase: 'boton--secundario' }],
              });
            })
            .catch(function (error) {
              contexto.mostrarCarga(false);
              util.avisar(error.message, 'error');
            });
        }

        function abrirPago(prestamoId) {
          contexto.mostrarCarga(true);
          api
            .detallePrestamo(prestamoId)
            .then(function (p) {
              contexto.mostrarCarga(false);

              util.abrirModal({
                titulo: 'Pagar préstamo ' + p.folio,
                contenido:
                  '<div class="resumen-operacion">' +
                  fila('Pago mínimo', util.escapar(util.moneda(p.pagoMinimo)), true) +
                  fila('Para liquidar hoy', util.escapar(util.moneda(p.montoLiquidacion))) +
                  fila('Próximo pago', util.escapar(util.fechaCorta(p.proximoPagoEn))) +
                  '</div>' +
                  '<div class="montos-prestamo">' +
                  '<button type="button" class="monto-prestamo activa" data-monto-pago="' +
                  util.escapar(p.pagoMinimo) + '">Pago mínimo</button>' +
                  '<button type="button" class="monto-prestamo" data-monto-pago="' +
                  util.escapar(p.montoLiquidacion) + '">Liquidar</button>' +
                  '</div>' +
                  '<label class="campo"><span class="campo__etiqueta">Otra cantidad</span>' +
                  '<input type="number" id="montoPago" class="campo__control" min="' +
                  util.escapar(p.pagoMinimo) + '" max="' + util.escapar(p.montoLiquidacion) +
                  '" step="0.01" value="' + util.escapar(p.pagoMinimo) + '" />' +
                  '<span class="campo__ayuda">Entre ' +
                  util.escapar(util.moneda(p.pagoMinimo)) + ' y ' +
                  util.escapar(util.moneda(p.montoLiquidacion)) + '</span></label>' +
                  '<div id="avisoPago" hidden></div>',
                botones: [
                  { texto: 'Cancelar', clase: 'boton--secundario' },
                  {
                    texto: 'Confirmar pago',
                    clase: 'boton',
                    cerrar: false,
                    accion: function (capa) {
                      var campo = util.nodo('#montoPago', capa);
                      var aviso = util.nodo('#avisoPago', capa);
                      var monto = Number(campo.value);

                      if (!Number.isFinite(monto) || monto <= 0) {
                        aviso.className = 'aviso aviso--error';
                        aviso.textContent = 'Escriba una cantidad válida.';
                        aviso.hidden = false;
                        return;
                      }

                      contexto.mostrarCarga(true);
                      api
                        .pagarPrestamo(prestamoId, monto)
                        .then(function (resultado) {
                          contexto.mostrarCarga(false);
                          if (capa.parentNode) {
                            capa.parentNode.removeChild(capa);
                          }
                          util.avisar(resultado.mensaje, 'exito');
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

              util.nodos('[data-monto-pago]').forEach(function (boton) {
                boton.addEventListener('click', function () {
                  util.nodos('[data-monto-pago]').forEach(function (otro) {
                    otro.classList.remove('activa');
                  });
                  boton.classList.add('activa');
                  var campo = util.nodo('#montoPago');
                  if (campo) {
                    campo.value = boton.getAttribute('data-monto-pago');
                  }
                });
              });
            })
            .catch(function (error) {
              contexto.mostrarCarga(false);
              util.avisar(error.message, 'error');
            });
        }
      });
    },
  };

  window.PortalVistas['avisos'] = {
    titulo: 'Avisos',
    texto: 'Notificaciones generadas por el banco sobre las operaciones de su cuenta.',
    etiqueta: 'Avisos',
    icono: 'notificaciones',
    grupo: 'Operaciones',
    rol: 'CLIENTE',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Consultando sus avisos…</div>';

      return api.consultarNotificaciones(50).then(function (notificaciones) {
        var lista = notificaciones || [];

        if (!lista.length) {
          contenedor.innerHTML = util.vacio(
            'Sin avisos',
            'El banco todavía no ha generado notificaciones para su cuenta.',
          );
          return;
        }

        var pendientes = lista.filter(function (item) {
          return !item.leida;
        });

        contenedor.innerHTML =
          '<section class="tarjeta">' +
          '<div class="tarjeta__encabezado"><h2>Sus avisos</h2>' +
          (pendientes.length
            ? '<span class="insignia insignia--activa">' +
              util.escapar(pendientes.length) +
              ' sin leer</span>'
            : '<span class="insignia insignia--neutra">Todo leído</span>') +
          '</div>' +
          (pendientes.length
            ? '<div class="acciones-fila"><button type="button" class="boton boton--secundario" ' +
              'id="marcarTodas">Marcar todo como leído</button></div>'
            : '') +
          '<ul class="notificaciones" id="listaAvisos">' +
          lista.map(elemento).join('') +
          '</ul></section>';

        prepararAcciones();

        function elemento(notificacion) {
          return (
            '<li class="notificacion' +
            (notificacion.leida ? '' : ' notificacion--nueva') +
            '" data-aviso="' +
            util.escapar(notificacion.id) +
            '">' +
            '<span class="notificacion__punto" aria-hidden="true"></span>' +
            '<span class="notificacion__cuerpo">' +
            '<span class="notificacion__mensaje">' +
            util.escapar(notificacion.mensaje) +
            '</span>' +
            '<span class="notificacion__meta">' +
            '<span class="notificacion__categoria">' +
            util.escapar(categoria(notificacion.categoria)) +
            '</span>' +
            '<span class="notificacion__fecha">' +
            util.escapar(util.fecha(notificacion.creadaEn)) +
            '</span>' +
            (notificacion.leida
              ? ''
              : '<span class="notificacion__estado">Sin leer</span>') +
            '</span></span>' +
            (notificacion.leida
              ? ''
              : '<button type="button" class="enlace-accion" data-leer="' +
                util.escapar(notificacion.id) +
                '">Marcar leído</button>') +
            '</li>'
          );
        }

        function categoria(clave) {
          var mapa = {
            MOVIMIENTO: 'Movimiento',
            TARJETA: 'Tarjeta',
            PRESTAMO: 'Préstamo',
            SEGURIDAD: 'Seguridad',
            PERFIL: 'Perfil',
            GENERAL: 'General',
          };
          return mapa[clave] || 'General';
        }

        function prepararAcciones() {
          util.nodos('[data-leer]', contenedor).forEach(function (boton) {
            boton.addEventListener('click', function () {
              contexto.mostrarCarga(true);
              api
                .marcarNotificacionLeida(boton.getAttribute('data-leer'))
                .then(function (resultado) {
                  contexto.mostrarCarga(false);
                  if (window.PortalNotificaciones) {
                    window.PortalNotificaciones.definirNoLeidas(resultado.noLeidas);
                  }
                  contexto.recargar();
                })
                .catch(function (error) {
                  contexto.mostrarCarga(false);
                  util.avisar(error.message, 'error');
                });
            });
          });

          var todas = util.nodo('#marcarTodas', contenedor);
          if (todas) {
            todas.addEventListener('click', function () {
              contexto.mostrarCarga(true);
              api
                .marcarNotificacionesLeidas()
                .then(function (resultado) {
                  contexto.mostrarCarga(false);
                  if (window.PortalNotificaciones) {
                    window.PortalNotificaciones.definirNoLeidas(resultado.noLeidas);
                  }
                  util.avisar('Avisos marcados como leídos.', 'exito');
                  contexto.recargar();
                })
                .catch(function (error) {
                  contexto.mostrarCarga(false);
                  util.avisar(error.message, 'error');
                });
            });
          }
        }
      });
    },
  };

  window.PortalVistas['perfil'] = {
    titulo: 'Mi perfil',
    texto:
      'Consulte y actualice sus datos personales y la contraseña de su banca en línea.',
    etiqueta: 'Mi perfil',
    icono: 'perfil',
    grupo: 'Operaciones',
    rol: 'CLIENTE',
    render: function (contenedor, contexto) {
      contenedor.innerHTML = '<div class="vacio">Consultando su perfil…</div>';

      return Promise.all([
        api.miPerfil(),
        api.listarCuentas().catch(function () {
          return [];
        }),
      ]).then(function (resultados) {
        var perfil = resultados[0];
        var cuentas = resultados[1] || [];

        contenedor.innerHTML =
          '<div class="rejilla rejilla--dos">' +
          seccionIdentidad(perfil) +
          seccionCuentas(cuentas) +
          '</div>' +
          '<div class="rejilla rejilla--dos">' +
          seccionDatos(perfil) +
          seccionPassword() +
          '</div>' +
          '<section class="tarjeta" id="zonaSegundoFactor"></section>';

        prepararDatos();
        prepararPassword();
        pintarSegundoFactor();

        function pintarSegundoFactor() {
          var zona = util.nodo('#zonaSegundoFactor', contenedor);

          if (!zona) {
            return;
          }

          return api
            .estadoTotp()
            .then(function (estado) {
              var insignia = estado.requiereRevinculacion
                ? '<span class="insignia insignia--bloqueada">' +
                  util.escapar(util.t('Debe volver a vincular su aplicación')) +
                  '</span>'
                : estado.activo
                ? '<span class="insignia insignia--activa">' +
                  util.escapar(util.t('Activada')) +
                  '</span>'
                : estado.configuracionPendiente
                  ? '<span class="insignia insignia--bloqueada">' +
                    util.escapar(util.t('Configuración pendiente')) +
                    '</span>'
                  : '<span class="insignia">' +
                    util.escapar(util.t('Desactivada')) +
                    '</span>';

              var restantes =
                estado.activo && estado.codigosDisponibles
                  ? '<p class="campo__ayuda">' +
                    util.escapar(
                      util.frase('Le quedan {cantidad} códigos de recuperación', {
                        cantidad: estado.codigosDisponibles,
                      }),
                    ) +
                    '</p>'
                  : '';

              zona.innerHTML =
                '<div class="tarjeta__encabezado"><h2>' +
                util.escapar(util.t('Verificación en dos pasos')) +
                '</h2>' +
                insignia +
                '</div>' +
                '<p class="texto-tenue">' +
                util.escapar(
                  util.t(
                    'Añada una capa extra de seguridad con una aplicación autenticadora como Google Authenticator o Microsoft Authenticator. Al entrar le pediremos un código de seis dígitos.',
                  ),
                ) +
                '</p>' +
                (estado.requiereRevinculacion
                  ? '<div class="aviso aviso--atencion">' +
                    util.escapar(
                      util.t(
                        'La configuración guardada ya no puede leerse con la clave actual del servidor. Vuelva a vincular su aplicación autenticadora. Mientras tanto, puede entrar con uno de sus códigos de recuperación.',
                      ),
                    ) +
                    '</div>'
                  : '') +
                restantes +
                '<div class="acciones-fila">' +
                (estado.requiereRevinculacion
                  ? '<button type="button" class="boton" id="botonActivarTotp">' +
                    util.escapar(util.t('Volver a vincular')) +
                    '</button>'
                  : estado.activo
                  ? '<button type="button" class="boton boton--peligro" id="botonDesactivarTotp">' +
                    util.escapar(util.t('Desactivar verificación en dos pasos')) +
                    '</button>'
                  : '<button type="button" class="boton" id="botonActivarTotp">' +
                    util.escapar(util.t('Activar verificación en dos pasos')) +
                    '</button>') +
                '</div>';

              var activar = util.nodo('#botonActivarTotp', zona);
              if (activar) {
                activar.addEventListener('click', iniciarSegundoFactor);
              }

              var desactivar = util.nodo('#botonDesactivarTotp', zona);
              if (desactivar) {
                desactivar.addEventListener('click', desactivarSegundoFactor);
              }
            })
            .catch(function () {
              zona.hidden = true;
            });
        }

        function iniciarSegundoFactor() {
          contexto.mostrarCarga(true);

          api
            .iniciarTotp()
            .then(function (datos) {
              contexto.mostrarCarga(false);

              util.abrirModal({
                titulo: util.t('Configurar la aplicación autenticadora'),
                contenido:
                  '<p class="texto-tenue">' +
                  util.escapar(
                    util.t(
                      'Escanee este código con su aplicación autenticadora. Si no puede escanearlo, escriba el secreto manualmente.',
                    ),
                  ) +
                  '</p>' +
                  '<div class="totp__qr"><img src="' +
                  util.escapar(datos.qr) +
                  '" alt="' +
                  util.escapar(util.t('Código QR para la aplicación autenticadora')) +
                  '" width="200" height="200" /></div>' +
                  '<div class="resumen-operacion"><div class="resumen-operacion__fila">' +
                  '<span class="resumen-operacion__etiqueta">' +
                  util.escapar(util.t('Secreto')) +
                  '</span><span class="resumen-operacion__valor dato">' +
                  util.escapar(datos.secreto) +
                  '</span></div></div>' +
                  '<label class="campo"><span class="campo__etiqueta">' +
                  util.escapar(util.t('Código de verificación')) +
                  '</span><input type="text" id="codigoTotp" class="campo__control" ' +
                  'inputmode="numeric" autocomplete="one-time-code" maxlength="6" /></label>' +
                  '<p class="campo__ayuda">' +
                  util.escapar(
                    util.t('Escriba el código de seis dígitos que muestra su aplicación.'),
                  ) +
                  '</p>' +
                  '<div id="avisoTotp" hidden></div>',
                botones: [
                  { texto: 'Cancelar', clase: 'boton--secundario' },
                  {
                    texto: 'Confirmar y activar',
                    clase: 'boton',
                    cerrar: false,
                    accion: function (capa) {
                      var campoCodigo = util.nodo('#codigoTotp', capa);
                      var aviso = util.nodo('#avisoTotp', capa);

                      api
                        .confirmarTotp((campoCodigo.value || '').trim())
                        .then(function (resultado) {
                          if (capa.parentNode) {
                            capa.parentNode.removeChild(capa);
                          }
                          mostrarCodigosRecuperacion(
                            resultado.codigosRecuperacion || [],
                          );
                          pintarSegundoFactor();
                        })
                        .catch(function (error) {
                          aviso.className = 'aviso aviso--error';
                          aviso.setAttribute('role', 'alert');
                          aviso.textContent = util.t(
                            error && error.message
                              ? error.message
                              : 'El código no es válido. Compruebe la hora de su dispositivo e inténtelo de nuevo.',
                          );
                          aviso.hidden = false;
                        });
                    },
                  },
                ],
              });
            })
            .catch(function () {
              contexto.mostrarCarga(false);
              util.avisar(util.t('No fue posible iniciar la configuración.'), 'error');
            });
        }

        function mostrarCodigosRecuperacion(codigos) {
          util.abrirModal({
            titulo: util.t('Guarde sus códigos de recuperación'),
            contenido:
              '<div class="aviso aviso--atencion">' +
              util.escapar(
                util.t(
                  'Guarde estos códigos en un lugar seguro. Cada uno sirve una sola vez y le permitirán entrar si pierde su dispositivo. No volveremos a mostrárselos.',
                ),
              ) +
              '</div>' +
              '<ul class="totp__codigos">' +
              codigos
                .map(function (codigo) {
                  return '<li class="dato">' + util.escapar(codigo) + '</li>';
                })
                .join('') +
              '</ul>',
            botones: [
              {
                texto: 'Descargar códigos',
                clase: 'boton--secundario',
                cerrar: false,
                accion: function () {
                  util.descargarCsv(
                    'codigos-recuperacion.csv',
                    ['Código de recuperación'],
                    codigos.map(function (codigo) {
                      return [codigo];
                    }),
                  );
                },
              },
              { texto: 'Cerrar', clase: 'boton' },
            ],
          });

          util.avisar(util.t('La verificación en dos pasos quedó activada.'), 'exito');
        }

        function desactivarSegundoFactor() {
          util.abrirModal({
            titulo: util.t('Desactivar verificación en dos pasos'),
            contenido:
              '<p class="texto-tenue">' +
              util.escapar(
                util.t(
                  'Escriba su contraseña para desactivar la verificación en dos pasos.',
                ),
              ) +
              '</p>' +
              '<label class="campo"><span class="campo__etiqueta">' +
              util.escapar(util.t('Contraseña actual')) +
              '</span><input type="password" id="passwordTotp" class="campo__control" /></label>' +
              '<div id="avisoTotpBaja" hidden></div>',
            botones: [
              { texto: 'Cancelar', clase: 'boton--secundario' },
              {
                texto: 'Desactivar',
                clase: 'boton boton--peligro',
                cerrar: false,
                accion: function (capa) {
                  var aviso = util.nodo('#avisoTotpBaja', capa);

                  api
                    .desactivarTotp(util.nodo('#passwordTotp', capa).value)
                    .then(function () {
                      if (capa.parentNode) {
                        capa.parentNode.removeChild(capa);
                      }
                      util.avisar(
                        util.t('La verificación en dos pasos quedó desactivada.'),
                        'exito',
                      );
                      pintarSegundoFactor();
                    })
                    .catch(function (error) {
                      aviso.className = 'aviso aviso--error';
                      aviso.setAttribute('role', 'alert');
                      aviso.textContent = util.t(
                        (error && error.message) || 'No fue posible completar la operación.',
                      );
                      aviso.hidden = false;
                    });
                },
              },
            ],
          });
        }

        function fila(etiqueta, valor) {
          return (
            '<div class="resumen-operacion__fila">' +
            '<span class="resumen-operacion__etiqueta">' +
            util.escapar(etiqueta) +
            '</span><span class="resumen-operacion__valor">' +
            valor +
            '</span></div>'
          );
        }

        function seccionIdentidad(p) {
          return (
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Identidad</h2>' +
            (p.correoVerificado
              ? '<span class="insignia insignia--activa">Correo verificado</span>'
              : '<span class="insignia insignia--bloqueada">Correo sin verificar</span>') +
            '</div>' +
            '<div class="resumen-operacion">' +
            fila('Nombre', util.escapar(p.nombreCompleto)) +
            fila('Correo', util.escapar(p.correo)) +
            fila('Teléfono', util.escapar(p.telefono || 'Sin registrar')) +
            fila('Perfil', util.escapar(p.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Cliente')) +
            fila('Canal de la sesión', util.escapar(util.etiquetaCanal(p.canal))) +
            fila('Cliente desde', util.escapar(util.fechaCorta(p.creadoEn))) +
            '</div>' +
            '<p class="texto-tenue">Cada cambio en estos datos genera un aviso en su portal ' +
            'y un correo a la dirección registrada.</p>' +
            '</section>'
          );
        }

        function seccionCuentas(lista) {
          return (
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Cuentas asociadas</h2></div>' +
            (lista.length
              ? '<div class="resumen-operacion">' +
                lista
                  .map(function (c) {
                    return (
                      '<div class="resumen-operacion__fila">' +
                      '<span class="resumen-operacion__etiqueta dato">' +
                      util.escapar(c.numeroCuenta) +
                      '</span><span class="resumen-operacion__valor">' +
                      util.escapar(util.moneda(c.saldo)) +
                      '</span></div>'
                    );
                  })
                  .join('') +
                '</div>'
              : util.vacio('Sin cuentas', 'Su usuario no tiene cuentas asociadas.')) +
            '</section>'
          );
        }

        function seccionDatos(p) {
          return (
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Modificar mis datos</h2></div>' +
            '<div id="avisoDatos" hidden></div>' +
            '<form id="formularioDatos" novalidate>' +
            campo('Nombre completo', 'perfilNombre', 'text', p.nombreCompleto) +
            campo('Correo electrónico', 'perfilCorreo', 'email', p.correo) +
            campo('Teléfono', 'perfilTelefono', 'tel', p.telefono || '') +
            '<div class="acciones-fila">' +
            '<button type="submit" class="boton" id="botonDatos">Guardar cambios</button>' +
            '</div>' +
            '</form>' +
            '</section>'
          );
        }

        function seccionPassword() {
          return (
            '<section class="tarjeta">' +
            '<div class="tarjeta__encabezado"><h2>Cambiar contraseña</h2></div>' +
            '<div id="avisoPassword" hidden></div>' +
            '<form id="formularioPassword" novalidate>' +
            campo('Contraseña actual', 'passwordActual', 'password', '') +
            campo('Nueva contraseña', 'passwordNueva', 'password', '') +
            campo('Repita la nueva contraseña', 'passwordConfirmacion', 'password', '') +
            '<p class="campo__ayuda">' +
            util.escapar(
              util.t(
                'La nueva contraseña debe tener al menos 8 caracteres. Se la pedimos dos veces para evitar un error de escritura.',
              ),
            ) +
            '</p>' +
            '<div class="acciones-fila">' +
            '<button type="submit" class="boton" id="botonPassword">Cambiar contraseña</button>' +
            '</div>' +
            '</form>' +
            '</section>'
          );
        }

        function campo(etiqueta, id, tipo, valor) {
          return (
            '<label class="campo"><span class="campo__etiqueta">' +
            util.escapar(etiqueta) +
            '</span><input type="' +
            tipo +
            '" id="' +
            id +
            '" class="campo__control" value="' +
            util.escapar(valor || '') +
            '" autocomplete="off" /></label>'
          );
        }

        function mostrarAviso(selector, mensaje, tipo) {
          var caja = util.nodo(selector, contenedor);
          if (!mensaje) {
            caja.hidden = true;
            caja.textContent = '';
            return;
          }
          caja.className = 'aviso aviso--' + tipo;
          caja.textContent = mensaje;
          caja.hidden = false;
        }

        function prepararDatos() {
          util
            .nodo('#formularioDatos', contenedor)
            .addEventListener('submit', function (evento) {
              evento.preventDefault();

              var datos = {};
              var nombre = util.nodo('#perfilNombre', contenedor).value.trim();
              var correo = util.nodo('#perfilCorreo', contenedor).value.trim();
              var telefono = util.nodo('#perfilTelefono', contenedor).value.trim();

              if (nombre && nombre !== perfil.nombreCompleto) {
                datos.nombreCompleto = nombre;
              }
              if (correo && correo !== perfil.correo) {
                datos.correo = correo;
              }
              if (telefono && telefono !== (perfil.telefono || '')) {
                datos.telefono = telefono;
              }

              if (!Object.keys(datos).length) {
                mostrarAviso('#avisoDatos', 'No modificó ningún dato.', 'atencion');
                return;
              }

              mostrarAviso('#avisoDatos', '');
              contexto.mostrarCarga(true);
              util.nodo('#botonDatos', contenedor).disabled = true;

              api
                .actualizarPerfil(datos)
                .then(function (resultado) {
                  contexto.mostrarCarga(false);
                  util.avisar(resultado.mensaje, 'exito');
                  contexto.recargar();
                })
                .catch(function (error) {
                  contexto.mostrarCarga(false);
                  util.nodo('#botonDatos', contenedor).disabled = false;
                  mostrarAviso('#avisoDatos', error.message, 'error');
                });
            });
        }

        function prepararPassword() {
          util
            .nodo('#formularioPassword', contenedor)
            .addEventListener('submit', function (evento) {
              evento.preventDefault();

              var actual = util.nodo('#passwordActual', contenedor).value;
              var nueva = util.nodo('#passwordNueva', contenedor).value;
              var confirmacion = util.nodo('#passwordConfirmacion', contenedor).value;

              if (!actual || !nueva || !confirmacion) {
                mostrarAviso('#avisoPassword', 'Complete los tres campos.', 'error');
                return;
              }

              if (nueva !== confirmacion) {
                mostrarAviso(
                  '#avisoPassword',
                  'La confirmación no coincide con la nueva contraseña.',
                  'error',
                );
                return;
              }

              if (nueva.length < 8) {
                mostrarAviso(
                  '#avisoPassword',
                  'La nueva contraseña debe tener al menos 8 caracteres.',
                  'error',
                );
                return;
              }

              mostrarAviso('#avisoPassword', '');
              contexto.mostrarCarga(true);
              util.nodo('#botonPassword', contenedor).disabled = true;

              api
                .cambiarPassword(actual, nueva, confirmacion)
                .then(function (resultado) {
                  contexto.mostrarCarga(false);
                  util.avisar(resultado.mensaje, 'exito');
                  contexto.recargar();
                })
                .catch(function (error) {
                  contexto.mostrarCarga(false);
                  util.nodo('#botonPassword', contenedor).disabled = false;
                  mostrarAviso('#avisoPassword', error.message, 'error');
                });
            });
        }
      });
    },
  };
})();
