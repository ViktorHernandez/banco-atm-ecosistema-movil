(function () {
  'use strict';

  var config = window.ATM_CONFIG || {};
  var api = window.AtmApi;

  var estado = {
    numeroTarjeta: '',
    pin: '',
    pantallaActual: 'inicio',
    temporizadorInactividad: null,
    segundosRestantes: 0,
    proveedores: [],
    limites: null,
    prestamo: null,
    prestamosVigentes: [],
    prestamoSeleccionado: null,
    textoCarga: 'Procesando operación...',
  };

  function nodo(selector) {
    return document.querySelector(selector);
  }

  function nodos(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function i18n() {
    return window.AtmI18n || null;
  }

  function t(texto) {
    var motor = i18n();
    return motor ? motor.t(texto) : texto;
  }

  function frase(plantilla, parametros) {
    var motor = i18n();
    if (motor) {
      return motor.frase(plantilla, parametros);
    }
    var valores = parametros || {};
    return Object.keys(valores).reduce(function (acumulado, nombre) {
      return acumulado.split('{' + nombre + '}').join(String(valores[nombre]));
    }, plantilla);
  }

  function regionActual() {
    var motor = i18n();
    return motor ? motor.region() : 'es-MX';
  }

  function formatearMoneda(valor) {
    var motor = i18n();
    if (motor) {
      return motor.moneda(valor);
    }
    var numero = Number(valor);
    if (isNaN(numero)) {
      return '—';
    }
    return numero.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    });
  }

  function formatearFecha(valor) {
    var motor = i18n();
    if (motor) {
      return motor.fechaHora(valor);
    }
    if (!valor) {
      return '—';
    }
    var fecha = new Date(valor);
    if (isNaN(fecha.getTime())) {
      return String(valor);
    }
    return fecha.toLocaleString(regionActual());
  }

  function mostrarCarga(texto) {
    estado.textoCarga = texto || 'Procesando operación...';
    nodo('#textoCarga').textContent = t(estado.textoCarga);
    nodo('#capaCarga').hidden = false;
    nodo('#capaCarga').setAttribute('aria-hidden', 'false');
  }

  function ocultarCarga() {
    nodo('#capaCarga').hidden = true;
    nodo('#capaCarga').setAttribute('aria-hidden', 'true');
  }

  function alertar(mensaje) {
    var region = nodo('#alertaCajero');
    if (region) {
      region.textContent = '';
      region.textContent = mensaje;
    }
  }

  function anunciar(mensaje) {
    var region = nodo('#anuncioCajero');
    if (region) {
      region.textContent = mensaje;
    }
  }

  function irA(nombre) {
    nodos('.pantalla').forEach(function (seccion) {
      seccion.classList.toggle(
        'activa',
        seccion.getAttribute('data-pantalla') === nombre,
      );
    });
    estado.pantallaActual = nombre;

    var activa = nodo('[data-pantalla="' + nombre + '"]');
    if (activa) {
      var titulo = activa.querySelector('.pantalla__titulo');
      if (titulo) {
        anunciar(titulo.textContent);
      }
      var primero = activa.querySelector(
        'input:not([disabled]), select:not([disabled]), button:not([disabled])',
      );
      if (primero) {
        primero.focus({ preventScroll: true });
      }
    }
    if (api.haySesion()) {
      reiniciarInactividad();
    }
  }

  function mostrarMensaje(titulo, texto, etiquetaBoton, alContinuar) {
    nodo('#mensajeTitulo').textContent = t(titulo);
    nodo('#mensajeTexto').textContent = t(texto);
    alertar(t(titulo) + '. ' + t(texto));
    var boton = nodo('#botonMensaje');
    boton.textContent = t(etiquetaBoton || 'Continuar');
    boton.onclick = function () {
      if (typeof alContinuar === 'function') {
        alContinuar();
      } else {
        irA('inicio');
      }
    };
    irA('mensaje');
  }

  function manejarError(error, alContinuar) {
    ocultarCarga();
    var mensaje = error && error.message ? error.message : 'Ocurrió un error inesperado.';

    if (error && error.codigo === 0) {
      verificarConexion();
    }

    if (error && error.codigo === 401 && api.haySesion()) {
      api.limpiarSesion();
      detenerInactividad();
      mostrarMensaje('Sesión finalizada', 'Su sesión expiró. Retire su tarjeta e inténtelo de nuevo.', 'Aceptar', function () {
        reiniciarFlujo();
      });
      return;
    }

    mostrarMensaje('No se pudo completar', mensaje, 'Aceptar', alContinuar || function () {
      irA(api.haySesion() ? 'menu' : 'inicio');
    });
  }

  function reiniciarFlujo() {
    estado.numeroTarjeta = '';
    estado.pin = '';
    estado.prestamo = null;
    estado.prestamosVigentes = [];
    estado.prestamoSeleccionado = null;
    pintarEntradaTarjeta();
    pintarEntradaPin();
    irA('inicio');
  }

  function detenerInactividad() {
    if (estado.temporizadorInactividad) {
      clearInterval(estado.temporizadorInactividad);
      estado.temporizadorInactividad = null;
    }
    nodo('#avisoInactividad').textContent = '';
  }

  function reiniciarInactividad() {
    estado.segundosRestantes = config.segundosInactividad || 120;
    if (estado.temporizadorInactividad) {
      return;
    }
    estado.temporizadorInactividad = setInterval(function () {
      estado.segundosRestantes -= 1;
      nodo('#avisoInactividad').textContent = frase(
        'Sesión activa · cierre automático en {segundos} s',
        { segundos: estado.segundosRestantes },
      );
      if (estado.segundosRestantes <= 0) {
        detenerInactividad();
        api.logout().then(function () {
          mostrarMensaje(
            'Sesión cerrada',
            'Se cerró la sesión por inactividad. Retire su tarjeta.',
            'Aceptar',
            reiniciarFlujo,
          );
        });
      }
    }, 1000);
  }

  function pintarEntradaTarjeta() {
    var texto = estado.numeroTarjeta || '';
    var agrupado = texto.replace(/(.{4})/g, '$1 ').trim();
    nodo('#entradaTarjeta').textContent = agrupado || '----';
  }

  function pintarEntradaPin() {
    nodo('#entradaPin').textContent = new Array(estado.pin.length + 1).join('•');
  }

  function construirTeclado(contenedor, campo) {
    var teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Borrar', '0', 'Limpiar'];
    contenedor.innerHTML = '';
    teclas.forEach(function (tecla) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'tecla' + (/^\d$/.test(tecla) ? '' : ' tecla--accion');
      boton.textContent = /^\d$/.test(tecla) ? tecla : t(tecla);
      if (!/^\d$/.test(tecla)) {
        boton.setAttribute('data-i18n', tecla);
      }
      boton.addEventListener('click', function () {
        manejarTecla(campo, tecla);
      });
      contenedor.appendChild(boton);
    });
  }

  function manejarTecla(campo, tecla) {
    var limite = campo === 'tarjeta' ? 19 : 6;
    var actual = campo === 'tarjeta' ? estado.numeroTarjeta : estado.pin;

    if (tecla === 'Borrar') {
      actual = actual.slice(0, -1);
    } else if (tecla === 'Limpiar') {
      actual = '';
    } else if (actual.length < limite) {
      actual += tecla;
    }

    if (campo === 'tarjeta') {
      estado.numeroTarjeta = actual;
      pintarEntradaTarjeta();
    } else {
      estado.pin = actual;
      pintarEntradaPin();
    }

    if (api.haySesion()) {
      reiniciarInactividad();
    }
  }

  function confirmarTarjeta() {
    if (!/^\d{13,19}$/.test(estado.numeroTarjeta)) {
      mostrarMensaje(
        'Tarjeta no válida',
        'El número de tarjeta debe tener entre 13 y 19 dígitos.',
        'Reintentar',
        function () {
          irA('tarjeta');
        },
      );
      return;
    }
    nodo('#textoTarjetaEnmascarada').textContent =
      'Tarjeta ****' + estado.numeroTarjeta.slice(-4);
    estado.pin = '';
    pintarEntradaPin();
    irA('pin');
  }

  function confirmarPin() {
    if (!/^\d{4,6}$/.test(estado.pin)) {
      mostrarMensaje('PIN no válido', 'El PIN debe tener entre 4 y 6 dígitos.', 'Reintentar', function () {
        estado.pin = '';
        pintarEntradaPin();
        irA('pin');
      });
      return;
    }

    mostrarCarga('Validando su tarjeta...');

    api
      .login(estado.numeroTarjeta, estado.pin)
      .then(function (datos) {
        ocultarCarga();
        estado.pin = '';
        pintarEntradaPin();
        nodo('#textoBienvenida').textContent = frase(
          'Sesión de {titular} · Cuenta {cuenta}',
          {
            titular: datos.usuario.nombreCompleto,
            cuenta: datos.cuenta.numeroCuenta,
          },
        );
        cargarLimites();
        reiniciarInactividad();
        irA('menu');
      })
      .catch(function (error) {
        ocultarCarga();
        estado.pin = '';
        pintarEntradaPin();

        if (error.codigo === 403) {
          detenerInactividad();
          mostrarMensaje(
            'Tarjeta bloqueada',
            error.message + ' Acuda a su sucursal o utilice la app móvil para gestionar su tarjeta.',
            'Retirar tarjeta',
            reiniciarFlujo,
          );
          return;
        }

        if (error.codigo === 401) {
          mostrarMensaje('PIN incorrecto', error.message, 'Reintentar', function () {
            irA('pin');
          });
          return;
        }

        manejarError(error, reiniciarFlujo);
      });
  }

  function aplicarLimites(limites) {
    estado.limites = limites;

    var retiro = nodo('#montoRetiro');
    retiro.min = limites.retiro.minimo;
    retiro.max = limites.retiro.maximo;
    retiro.step = limites.retiro.denominacion;

    var deposito = nodo('#montoDeposito');
    deposito.min = limites.deposito.minimo;
    deposito.max = limites.deposito.maximo;
    deposito.step = limites.deposito.denominacion;

    nodo('#notaRetiro').textContent = frase(
      'Montos entre {minimo} y {maximo}, en múltiplos de {denominacion}.',
      {
        minimo: formatearMoneda(limites.retiro.minimo),
        maximo: formatearMoneda(limites.retiro.maximo),
        denominacion: limites.retiro.denominacion,
      },
    );

    nodo('#notaDeposito').textContent = frase(
      'Montos entre {minimo} y {maximo}, en múltiplos de {denominacion}.',
      {
        minimo: formatearMoneda(limites.deposito.minimo),
        maximo: formatearMoneda(limites.deposito.maximo),
        denominacion: limites.deposito.denominacion,
      },
    );

    var transferencia = nodo('#montoTransferencia');
    transferencia.max = limites.transferencia.maximo;
  }

  function cargarLimites() {
    return api
      .consultarLimites()
      .then(aplicarLimites)
      .catch(function () {
        return null;
      });
  }

  function consultarSaldo() {
    mostrarCarga('Consultando saldo...');
    api
      .consultarSaldo()
      .then(function (datos) {
        ocultarCarga();
        nodo('#saldoCuenta').textContent = datos.numeroCuenta;
        nodo('#saldoMonto').textContent = formatearMoneda(datos.saldo);
            nodo('#saldoFecha').textContent = frase(
          'Consulta realizada el {fecha}',
          { fecha: formatearFecha(datos.consultadoEn) },
        );
        irA('saldo');
      })
      .catch(manejarError);
  }

  function construirComprobante(comprobante) {
    var filas = [
      ['Cajero', config.identificadorCajero || 'ATM-001'],
      ['Folio', comprobante.folio],
      ['Fecha', formatearFecha(comprobante.fecha)],
      ['Operacion', t(comprobante.tipo)],
      ['Canal', t(comprobante.canal)],
      ['Estado', t(comprobante.estado)],
    ];

    if (comprobante.cuentaOrigen) {
      filas.push(['Cuenta cargo', comprobante.cuentaOrigen]);
    }
    if (comprobante.cuentaDestino) {
      filas.push(['Cuenta abono', comprobante.cuentaDestino]);
    }

    filas.push(['Monto', formatearMoneda(comprobante.monto)]);

    if (
      comprobante.saldoResultante !== null &&
      comprobante.saldoResultante !== undefined
    ) {
      filas.push(['Saldo final', formatearMoneda(comprobante.saldoResultante)]);
    }

    if (comprobante.descripcion) {
      filas.push(['Concepto', comprobante.descripcion]);
    }

    var etiquetas = filas.map(function (fila) {
      return t(fila[0]);
    });

    var anchoEtiqueta = etiquetas.reduce(function (mayor, etiqueta) {
      return Math.max(mayor, etiqueta.length);
    }, 0);

    var cuerpo = filas.map(function (fila, indice) {
      var etiqueta = etiquetas[indice];
      var relleno = new Array(anchoEtiqueta - etiqueta.length + 1).join(' ');
      return etiqueta + relleno + ' : ' + fila[1];
    });

    var ancho = cuerpo.reduce(function (mayor, linea) {
      return Math.max(mayor, linea.length);
    }, 40);

    var separador = new Array(ancho + 1).join('=');

    return []
      .concat(
        centrar((config.nombreBanco || 'Banco ATM').toUpperCase(), ancho),
        centrar(t('COMPROBANTE DE OPERACION'), ancho),
        separador,
        cuerpo,
        separador,
        centrar(t('CONSERVE ESTE COMPROBANTE'), ancho),
        centrar(t('Documento simulado - proyecto academico'), ancho),
      )
      .join('\n');
  }

  function centrar(texto, ancho) {
    if (texto.length >= ancho) {
      return texto;
    }
    var espacios = Math.floor((ancho - texto.length) / 2);
    return new Array(espacios + 1).join(' ') + texto;
  }

  function mostrarComprobante(comprobante) {
    nodo('#textoComprobante').textContent = construirComprobante(comprobante);
    irA('comprobante');
  }

  function leerMonto(idCampo) {
    var valor = Number(nodo(idCampo).value);
    if (!valor || valor <= 0) {
      return null;
    }
    return valor;
  }

  function ejecutarOperacion(promesa, textoCarga) {
    mostrarCarga(textoCarga);
    return promesa
      .then(function (comprobante) {
        ocultarCarga();
        mostrarComprobante(comprobante);
      })
      .catch(function (error) {
        manejarError(error, function () {
          irA('menu');
        });
      });
  }

  function confirmarRetiro() {
    var monto = leerMonto('#montoRetiro');
    if (monto === null) {
      mostrarMensaje('Monto requerido', 'Seleccione o capture un monto válido.', 'Aceptar', function () {
        irA('retiro');
      });
      return;
    }
    ejecutarOperacion(api.retirar(monto), 'Dispensando efectivo...').then(function () {
      nodo('#montoRetiro').value = '';
    });
  }

  function confirmarDeposito() {
    var monto = leerMonto('#montoDeposito');
    if (monto === null) {
      mostrarMensaje('Monto requerido', 'Seleccione o capture un monto válido.', 'Aceptar', function () {
        irA('deposito');
      });
      return;
    }
    ejecutarOperacion(api.depositar(monto), 'Validando billetes...').then(function () {
      nodo('#montoDeposito').value = '';
    });
  }

  function confirmarTransferencia() {
    var cuenta = nodo('#cuentaDestino').value.trim();
    var monto = leerMonto('#montoTransferencia');
    var concepto = nodo('#conceptoTransferencia').value.trim();

    if (!/^\d{6,30}$/.test(cuenta)) {
      mostrarMensaje('Cuenta no válida', 'Capture una cuenta destino de 6 a 30 dígitos.', 'Aceptar', function () {
        irA('transferencia');
      });
      return;
    }

    if (monto === null) {
      mostrarMensaje('Monto requerido', 'Capture un monto válido.', 'Aceptar', function () {
        irA('transferencia');
      });
      return;
    }

    ejecutarOperacion(
      api.transferir(cuenta, monto, concepto),
      'Enviando transferencia...',
    ).then(function () {
      nodo('#cuentaDestino').value = '';
      nodo('#montoTransferencia').value = '';
      nodo('#conceptoTransferencia').value = '';
    });
  }

  function consultarMovimientos() {
    mostrarCarga('Recuperando movimientos...');
    api
      .consultarMovimientos(10)
      .then(function (lista) {
        ocultarCarga();
        var contenedor = nodo('#listaMovimientos');
        contenedor.innerHTML = '';

        if (!lista.length) {
          contenedor.innerHTML =
            '<p class="pantalla__texto">' +
            t('No hay movimientos registrados.') +
            '</p>';
          irA('movimientos');
          return;
        }

        lista.forEach(function (movimiento) {
          var fila = document.createElement('div');
          fila.className = 'movimiento';

          var izquierda = document.createElement('div');
          var titulo = document.createElement('div');
          titulo.textContent =
            t(movimiento.tipo) +
            (movimiento.estado === 'FALLIDA' ? ' (' + t('fallida') + ')' : '');
          var detalle = document.createElement('div');
          detalle.className = 'movimiento__detalle';
          detalle.textContent =
            formatearFecha(movimiento.fecha) +
            (movimiento.contraparte ? ' · ' + movimiento.contraparte : '') +
            (movimiento.descripcion ? ' · ' + movimiento.descripcion : '');
          izquierda.appendChild(titulo);
          izquierda.appendChild(detalle);

          var monto = document.createElement('div');
          monto.className =
            'movimiento__monto ' +
            (movimiento.signo === 'ABONO' ? 'movimiento__monto--abono' : 'movimiento__monto--cargo');
          monto.textContent =
            (movimiento.signo === 'ABONO' ? '+' : '-') + formatearMoneda(movimiento.monto);

          fila.appendChild(izquierda);
          fila.appendChild(monto);
          contenedor.appendChild(fila);
        });

        irA('movimientos');
      })
      .catch(manejarError);
  }

  function mostrarAvisoPrestamosEnPago(prestamos) {
    var nota = nodo('#notaPrestamosPago');
    var acciones = nodo('#accionesPrestamosPago');

    if (!prestamos.length) {
      nota.hidden = true;
      acciones.hidden = true;
      return;
    }

    var total = prestamos.reduce(function (suma, prestamo) {
      return suma + prestamo.pagoMinimo;
    }, 0);

    nota.textContent = frase(
      prestamos.length === 1
        ? 'También tiene {cantidad} préstamo pendiente. Pago mínimo total: {total}.'
        : 'También tiene {cantidad} préstamos pendientes. Pago mínimo total: {total}.',
      {
        cantidad: prestamos.length,
        total: formatearMoneda(Math.round(total * 100) / 100),
      },
    );
    nota.hidden = false;
    acciones.hidden = false;
  }

  function cargarCatalogo() {
    mostrarCarga('Cargando catálogo...');
    api
      .catalogoServicios()
      .then(function (lista) {
        ocultarCarga();
        estado.proveedores = lista;
        var select = nodo('#proveedorServicio');
        select.innerHTML = '';
        lista.forEach(function (proveedor) {
          var opcion = document.createElement('option');
          opcion.value = proveedor.codigo;
          opcion.textContent = proveedor.nombre;
          select.appendChild(opcion);
        });
        actualizarNotaProveedor();
        api
          .prestamosPendientes()
          .then(function (prestamos) {
            mostrarAvisoPrestamosEnPago(prestamos || []);
          })
          .catch(function () {
            mostrarAvisoPrestamosEnPago([]);
          });

        irA('pago');
      })
      .catch(manejarError);
  }

  function actualizarNotaProveedor() {
    var codigo = nodo('#proveedorServicio').value;
    var proveedor = estado.proveedores.filter(function (item) {
      return item.codigo === codigo;
    })[0];

    if (!proveedor) {
      nodo('#notaProveedor').textContent = '';
      return;
    }

    nodo('#notaProveedor').textContent = frase(
      'Categoría {categoria} · monto entre {minimo} y {maximo} · referencia de {longitud} caracteres.',
      {
        categoria: proveedor.categoria,
        minimo: formatearMoneda(proveedor.montoMinimo),
        maximo: formatearMoneda(proveedor.montoMaximo),
        longitud: proveedor.longitudReferencia,
      },
    );
  }

  function confirmarPago() {
    var codigo = nodo('#proveedorServicio').value;
    var referencia = nodo('#referenciaServicio').value.trim();
    var monto = leerMonto('#montoServicio');

    if (!codigo) {
      mostrarMensaje('Proveedor requerido', 'Seleccione un proveedor del catálogo.', 'Aceptar', function () {
        irA('pago');
      });
      return;
    }

    if (!/^[A-Za-z0-9]{4,20}$/.test(referencia)) {
      mostrarMensaje(
        'Referencia no válida',
        'La referencia debe ser alfanumérica de 4 a 20 caracteres.',
        'Aceptar',
        function () {
          irA('pago');
        },
      );
      return;
    }

    if (monto === null) {
      mostrarMensaje('Monto requerido', 'Capture un monto válido.', 'Aceptar', function () {
        irA('pago');
      });
      return;
    }

    ejecutarOperacion(
      api.pagarServicio(codigo, referencia, monto),
      'Aplicando el pago...',
    ).then(function () {
      nodo('#referenciaServicio').value = '';
      nodo('#montoServicio').value = '';
    });
  }

  function confirmarCambioPin() {
    var actual = nodo('#pinActual').value.trim();
    var nuevo = nodo('#pinNuevo').value.trim();
    var confirmacion = nodo('#pinConfirmacion').value.trim();

    if (!/^\d{4,6}$/.test(actual) || !/^\d{4,6}$/.test(nuevo)) {
      mostrarMensaje('PIN no válido', 'Ambos PIN deben tener entre 4 y 6 dígitos.', 'Aceptar', function () {
        irA('cambio-pin');
      });
      return;
    }

    if (nuevo !== confirmacion) {
      mostrarMensaje('PIN no coincide', 'La confirmación no coincide con el nuevo PIN.', 'Aceptar', function () {
        irA('cambio-pin');
      });
      return;
    }

    mostrarCarga('Actualizando PIN...');
    api
      .cambiarPin(actual, nuevo)
      .then(function (resultado) {
        ocultarCarga();
        nodo('#pinActual').value = '';
        nodo('#pinNuevo').value = '';
        nodo('#pinConfirmacion').value = '';
        mostrarMensaje('PIN actualizado', resultado.mensaje, 'Menú principal', function () {
          irA('menu');
        });
      })
      .catch(function (error) {
        manejarError(error, function () {
          irA('cambio-pin');
        });
      });
  }

  function consultarTarjeta() {
    mostrarCarga('Consultando su tarjeta...');
    api
      .consultarTarjeta()
      .then(function (tarjeta) {
        ocultarCarga();
        nodo('#tarjetaNumero').textContent = tarjeta.numeroTarjeta;
        nodo('#tarjetaEstado').textContent =
          tarjeta.estado + (tarjeta.motivoBloqueo ? ' (' + tarjeta.motivoBloqueo + ')' : '');
        nodo('#tarjetaIntentos').textContent = tarjeta.intentosFallidos;
        irA('tarjeta-gestion');
      })
      .catch(manejarError);
  }

  function confirmarBloqueo() {
    if (!window.confirm(t('¿Confirma el bloqueo de su tarjeta? La sesión se cerrará.'))) {
      return;
    }

    mostrarCarga('Bloqueando tarjeta...');
    api
      .bloquearTarjeta()
      .then(function () {
        ocultarCarga();
        detenerInactividad();
        api.limpiarSesion();
        mostrarMensaje(
          'Tarjeta bloqueada',
          'Su tarjeta quedó bloqueada. Puede desbloquearla desde la app móvil o el portal web.',
          'Retirar tarjeta',
          reiniciarFlujo,
        );
      })
      .catch(function (error) {
        manejarError(error, function () {
          irA('tarjeta-gestion');
        });
      });
  }

  function cerrarSesion() {
    mostrarCarga('Finalizando sesión...');
    detenerInactividad();
    api.logout().then(function () {
      ocultarCarga();
      mostrarMensaje(
        'Gracias por su preferencia',
        'Retire su tarjeta. La sesión finalizó correctamente.',
        'Aceptar',
        reiniciarFlujo,
      );
    });
  }

  function construirMontosRapidos(contenedorId, montos, campoId) {
    var contenedor = nodo(contenedorId);
    contenedor.innerHTML = '';
    (montos || []).forEach(function (monto) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'monto';
      boton.textContent = formatearMoneda(monto);
      boton.addEventListener('click', function () {
        nodo(campoId).value = monto;
      });
      contenedor.appendChild(boton);
    });
  }

  function verificarConexion() {
    var indicador = nodo('#indicadorConexion');
    var texto = nodo('#textoConexion');

    nodo('#avisoApi').textContent = 'API: ' + api.obtenerBaseUrl();

    indicador.className = 'indicador indicador--desconocido';
    texto.textContent = t('Verificando enlace...');

    return api
      .estadoServicio()
      .then(function (salud) {
        var conectada = salud && salud.database === 'connected';
        indicador.className =
          'indicador ' + (conectada ? 'indicador--ok' : 'indicador--aviso');
        texto.textContent = conectada
          ? t('En línea')
          : t('En línea · sin base de datos');
        nodo('#notaConexion').textContent = conectada
          ? ''
          : t('La API responde pero no tiene enlace con la base de datos.');
        return true;
      })
      .catch(function () {
        indicador.className = 'indicador indicador--error';
        texto.textContent = t('Sin enlace');
        nodo('#notaConexion').textContent = frase(
          'No hay comunicación con la API en {url}. Verifique que el backend esté en ejecución.',
          { url: api.obtenerBaseUrl() },
        );
        return false;
      });
  }

  function configurarApi() {
    var actual = api.obtenerBaseUrl();
    var porDefecto = api.obtenerBaseUrlPorDefecto();
    var nueva = window.prompt(
      frase(
        'Dirección base de la API bancaria.\nDeje el campo vacío para volver a la dirección por defecto ({porDefecto}).',
        { porDefecto: porDefecto },
      ),
      actual,
    );

    if (nueva === null) {
      return;
    }

    if (!nueva.trim()) {
      api.restablecerBaseUrl();
    } else {
      api.definirBaseUrl(nueva.trim());
    }

    verificarConexion();
  }

  function abrirPrestamos() {
    mostrarCarga('Consultando sus condiciones...');
    api
      .condicionesPrestamo()
      .then(function (condiciones) {
        ocultarCarga();
        estado.prestamo = { condiciones: condiciones, monto: null, plazo: null };

        nodo('#prestamoLimite').textContent = formatearMoneda(condiciones.montoMaximo);
        nodo('#prestamoPerfil').textContent = condiciones.tieneTarjetaCredito
          ? condiciones.nombrePerfil
          : t('Sin tarjeta de crédito');
        nodo('#prestamoSaldo').textContent = formatearMoneda(condiciones.saldoDisponible);
        nodo('#prestamoMinimo').textContent = formatearMoneda(condiciones.montoMinimo);
        nodo('#prestamoTasa').textContent = condiciones.tasaAnual + ' %';

        var boton = nodo('#botonIrMontoPrestamo');
        if (condiciones.elegible) {
          nodo('#prestamoNota').textContent = condiciones.tieneTarjetaCredito
            ? t(
                'Su nivel de tarjeta de crédito aumenta el límite y reduce la tasa aplicada.',
              )
            : t('Su límite corresponde al perfil sin tarjeta de crédito.');
          boton.disabled = false;
        } else {
          nodo('#prestamoNota').textContent = condiciones.motivos.join(' ');
          boton.disabled = true;
        }

        irA('prestamo');
      })
      .catch(manejarError);
  }

  function irAMontoPrestamo() {
    if (!estado.prestamo || !estado.prestamo.condiciones) {
      abrirPrestamos();
      return;
    }

    var condiciones = estado.prestamo.condiciones;
    if (!condiciones.elegible) {
      return;
    }

    nodo('#prestamoRangoTexto').textContent = frase(
      'Seleccione un monto entre {minimo} y {maximo}.',
      {
        minimo: formatearMoneda(condiciones.montoMinimo),
        maximo: formatearMoneda(condiciones.montoMaximo),
      },
    );

    var campo = nodo('#montoPrestamo');
    campo.min = condiciones.montoMinimo;
    campo.max = condiciones.montoMaximo;

    construirMontosRapidos(
      '#montosPrestamo',
      condiciones.montosSugeridos,
      '#montoPrestamo',
    );

    var selector = nodo('#plazoPrestamo');
    selector.innerHTML = '';
    condiciones.plazosDisponibles.forEach(function (plazo) {
      var opcion = document.createElement('option');
      opcion.value = plazo;
      opcion.textContent = plazo + ' meses';
      if (plazo === condiciones.plazoPorDefecto) {
        opcion.selected = true;
      }
      selector.appendChild(opcion);
    });

    irA('prestamo-monto');
  }

  function revisarPrestamo() {
    var condiciones = estado.prestamo && estado.prestamo.condiciones;
    if (!condiciones) {
      abrirPrestamos();
      return;
    }

    var monto = leerMonto('#montoPrestamo');
    if (monto === null) {
      mostrarMensaje('Monto no válido', 'Escriba la cantidad que desea solicitar.', 'Corregir', function () {
        irA('prestamo-monto');
      });
      return;
    }

    if (monto < condiciones.montoMinimo) {
      mostrarMensaje(
        'Monto por debajo del mínimo',
        frase('El préstamo mínimo es de {monto}.', {
          monto: formatearMoneda(condiciones.montoMinimo),
        }),
        'Corregir',
        function () {
          irA('prestamo-monto');
        },
      );
      return;
    }

    if (monto > condiciones.montoMaximo) {
      mostrarMensaje(
        'Monto por encima del límite',
        frase('Puede solicitar como máximo {monto}.', {
          monto: formatearMoneda(condiciones.montoMaximo),
        }),
        'Corregir',
        function () {
          irA('prestamo-monto');
        },
      );
      return;
    }

    var plazo = Number(nodo('#plazoPrestamo').value);

    mostrarCarga('Calculando condiciones...');
    api
      .simularPrestamo(monto, plazo)
      .then(function (simulacion) {
        ocultarCarga();
        estado.prestamo.monto = monto;
        estado.prestamo.plazo = plazo;

        nodo('#resumenPrestamoMonto').textContent = formatearMoneda(simulacion.monto);
        nodo('#resumenPrestamoLimite').textContent = formatearMoneda(condiciones.montoMaximo);
        nodo('#resumenPrestamoPlazo').textContent = simulacion.plazoMeses + ' meses';
        nodo('#resumenPrestamoTasa').textContent = simulacion.tasaAnual + ' %';
        nodo('#resumenPrestamoPago').textContent = formatearMoneda(simulacion.pagoMensual);
        nodo('#resumenPrestamoTotal').textContent = formatearMoneda(simulacion.totalAPagar);

        irA('prestamo-resumen');
      })
      .catch(function (error) {
        manejarError(error, function () {
          irA('prestamo-monto');
        });
      });
  }

  function confirmarPrestamo() {
    var datos = estado.prestamo;
    if (!datos || !datos.monto) {
      abrirPrestamos();
      return;
    }

    mostrarCarga('Enviando su solicitud...');
    api
      .solicitarPrestamo(datos.monto, datos.plazo)
      .then(function (resultado) {
        ocultarCarga();
        nodo('#montoPrestamo').value = '';
        mostrarMensaje(
          'Préstamo aprobado',
          frase(
            '{mensaje} Folio {folio}. Pago mensual de {mensual}. Saldo disponible: {saldo}.',
            {
              mensaje: resultado.mensaje,
              folio: resultado.prestamo.folio,
              mensual: formatearMoneda(resultado.prestamo.pagoMensual),
              saldo: formatearMoneda(resultado.saldoResultante),
            },
          ),
          'Menú',
          function () {
            irA('menu');
          },
        );
      })
      .catch(function (error) {
        manejarError(error, function () {
          irA('prestamo-monto');
        });
      });
  }

  function verPrestamosVigentes() {
    mostrarCarga('Consultando sus préstamos...');
    api
      .prestamosPendientes()
      .then(function (prestamos) {
        ocultarCarga();
        estado.prestamosVigentes = prestamos || [];

        var lista = nodo('#listaPrestamosVigentes');
        var texto = nodo('#prestamosVigentesTexto');

        if (!estado.prestamosVigentes.length) {
          texto.textContent = t('No tiene préstamos pendientes de pago.');
          lista.innerHTML = '';
          irA('prestamos-vigentes');
          return;
        }

        texto.textContent = frase(
          estado.prestamosVigentes.length === 1
            ? 'Tiene {cantidad} préstamo vigente. Seleccione uno para ver el detalle o pagar.'
            : 'Tiene {cantidad} préstamos vigentes. Seleccione uno para ver el detalle o pagar.',
          { cantidad: estado.prestamosVigentes.length },
        );

        lista.innerHTML = '';
        estado.prestamosVigentes.forEach(function (prestamo) {
          var boton = document.createElement('button');
          boton.type = 'button';
          boton.className = 'movimiento movimiento--accion';
          boton.innerHTML =
            '<span><strong>' +
            prestamo.folio +
            '</strong><span class="movimiento__detalle">' +
            frase('Vence el {fecha} · quedan {pagos} pagos', {
              fecha: formatearFecha(prestamo.proximoPagoEn),
              pagos: prestamo.pagosRestantes,
            }) +
            '</span></span>' +
            '<span class="movimiento__monto movimiento__monto--cargo">' +
            formatearMoneda(prestamo.montoLiquidacion) +
            '</span>';
          boton.addEventListener('click', function () {
            verDetallePrestamo(prestamo.id);
          });
          lista.appendChild(boton);
        });

        irA('prestamos-vigentes');
      })
      .catch(manejarError);
  }

  function verDetallePrestamo(prestamoId) {
    mostrarCarga('Consultando el préstamo...');
    api
      .detallePrestamo(prestamoId)
      .then(function (prestamo) {
        ocultarCarga();
        estado.prestamoSeleccionado = prestamo;

        nodo('#detallePendiente').textContent = formatearMoneda(prestamo.montoLiquidacion);
        nodo('#detalleFolio').textContent = prestamo.folio;
        nodo('#detalleEstado').textContent = prestamo.estado;
        nodo('#detalleMonto').textContent = formatearMoneda(prestamo.monto);
        nodo('#detalleTotal').textContent = formatearMoneda(prestamo.totalAPagar);
        nodo('#detallePlazo').textContent = frase('{meses} meses', {
          meses: prestamo.plazoMeses,
        });
        nodo('#detallePagos').textContent = frase(
          '{hechos} de {plazo} · restan {restantes}',
          {
            hechos: prestamo.pagosRealizados,
            plazo: prestamo.plazoMeses,
            restantes: prestamo.pagosRestantes,
          },
        );
        nodo('#detalleTasa').textContent = prestamo.tasaAnual + ' %';
        nodo('#detalleMensual').textContent = formatearMoneda(prestamo.pagoMensual);
        nodo('#detalleMinimo').textContent = formatearMoneda(prestamo.pagoMinimo);
        nodo('#detalleLiquidar').textContent = formatearMoneda(prestamo.montoLiquidacion);
        nodo('#detalleProximo').textContent = prestamo.proximoPagoEn
          ? formatearFecha(prestamo.proximoPagoEn)
          : '—';

        nodo('#botonIrPagoPrestamo').disabled = prestamo.estado !== 'APROBADO';

        irA('prestamo-detalle');
      })
      .catch(manejarError);
  }

  function irAPagoPrestamo() {
    var prestamo = estado.prestamoSeleccionado;
    if (!prestamo) {
      verPrestamosVigentes();
      return;
    }

    nodo('#pagoPrestamoTexto').textContent = frase(
      'Préstamo {folio}. Pago mínimo {minimo} · liquidar {liquidacion}.',
      {
        folio: prestamo.folio,
        minimo: formatearMoneda(prestamo.pagoMinimo),
        liquidacion: formatearMoneda(prestamo.montoLiquidacion),
      },
    );

    var campo = nodo('#montoPagoPrestamo');
    campo.min = prestamo.pagoMinimo;
    campo.max = prestamo.montoLiquidacion;
    campo.value = prestamo.pagoMinimo;

    var contenedor = nodo('#montosPagoPrestamo');
    contenedor.innerHTML = '';

    [
      { etiqueta: 'Pago mínimo', valor: prestamo.pagoMinimo },
      { etiqueta: 'Liquidar', valor: prestamo.montoLiquidacion },
    ].forEach(function (opcion) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'monto';
      boton.textContent = opcion.etiqueta + ': ' + formatearMoneda(opcion.valor);
      boton.addEventListener('click', function () {
        campo.value = opcion.valor;
      });
      contenedor.appendChild(boton);
    });

    irA('prestamo-pago');
  }

  function confirmarPagoPrestamo() {
    var prestamo = estado.prestamoSeleccionado;
    if (!prestamo) {
      verPrestamosVigentes();
      return;
    }

    var monto = leerMonto('#montoPagoPrestamo');
    if (monto === null) {
      mostrarMensaje('Monto no válido', 'Escriba la cantidad que desea pagar.', 'Corregir', function () {
        irA('prestamo-pago');
      });
      return;
    }

    if (monto < prestamo.pagoMinimo) {
      mostrarMensaje(
        'Monto insuficiente',
        frase('El pago mínimo de este préstamo es de {monto}.', {
          monto: formatearMoneda(prestamo.pagoMinimo),
        }),
        'Corregir',
        function () {
          irA('prestamo-pago');
        },
      );
      return;
    }

    if (monto > prestamo.montoLiquidacion) {
      mostrarMensaje(
        'Monto excesivo',
        frase('Este préstamo se liquida con {monto}.', {
          monto: formatearMoneda(prestamo.montoLiquidacion),
        }),
        'Corregir',
        function () {
          irA('prestamo-pago');
        },
      );
      return;
    }

    mostrarCarga('Aplicando su pago...');
    api
      .pagarPrestamo(prestamo.id, monto)
      .then(function (resultado) {
        ocultarCarga();
        estado.prestamoSeleccionado = null;
        nodo('#montoPagoPrestamo').value = '';
        mostrarMensaje(
          resultado.prestamo.estado === 'LIQUIDADO' ? 'Préstamo liquidado' : 'Pago aplicado',
          frase(
            '{mensaje} Saldo pendiente: {pendiente}. Saldo de su cuenta: {saldo}.',
            {
              mensaje: resultado.mensaje,
              pendiente: formatearMoneda(resultado.prestamo.montoLiquidacion),
              saldo: formatearMoneda(resultado.saldoCuenta),
            },
          ),
          'Mis préstamos',
          function () {
            verPrestamosVigentes();
          },
        );
      })
      .catch(function (error) {
        manejarError(error, function () {
          irA('prestamo-pago');
        });
      });
  }

  var acciones = {
    'insertar-tarjeta': function () {
      estado.numeroTarjeta = '';
      pintarEntradaTarjeta();
      irA('tarjeta');
    },
    'confirmar-tarjeta': confirmarTarjeta,
    'confirmar-pin': confirmarPin,
    'cancelar-sesion': reiniciarFlujo,
    'volver-menu': function () {
      irA('menu');
    },
    'cerrar-sesion': cerrarSesion,
    'confirmar-retiro': confirmarRetiro,
    'confirmar-deposito': confirmarDeposito,
    'confirmar-transferencia': confirmarTransferencia,
    'confirmar-pago': confirmarPago,
    'confirmar-cambio-pin': confirmarCambioPin,
    'confirmar-bloqueo': confirmarBloqueo,
    'ir-monto-prestamo': irAMontoPrestamo,
    'revisar-prestamo': revisarPrestamo,
    'confirmar-prestamo': confirmarPrestamo,
    'ver-prestamos-vigentes': verPrestamosVigentes,
    'ir-pago-prestamo': irAPagoPrestamo,
    'confirmar-pago-prestamo': confirmarPagoPrestamo,
    'imprimir-comprobante': function () {
      window.print();
    },
  };

  var destinos = {
    saldo: consultarSaldo,
    movimientos: consultarMovimientos,
    pago: cargarCatalogo,
    'tarjeta-gestion': consultarTarjeta,
    prestamo: abrirPrestamos,
    retiro: function () {
      irA('retiro');
    },
    deposito: function () {
      irA('deposito');
    },
    transferencia: function () {
      irA('transferencia');
    },
    'cambio-pin': function () {
      irA('cambio-pin');
    },
  };

  function reaplicarIdioma() {
    if (i18n()) {
      i18n().traducirArbol(document);
    }

    nodo('#textoCarga').textContent = t(estado.textoCarga);

    construirTeclado(nodo('[data-teclado="tarjeta"]'), 'tarjeta');
    construirTeclado(nodo('[data-teclado="pin"]'), 'pin');
    construirMontosRapidos(
      '#montosRetiro',
      config.montosRapidosRetiro,
      '#montoRetiro',
    );
    construirMontosRapidos(
      '#montosDeposito',
      config.montosRapidosDeposito,
      '#montoDeposito',
    );

    if (estado.limites) {
      aplicarLimites(estado.limites);
    }

    if (estado.proveedores.length) {
      actualizarNotaProveedor();
    }

    verificarConexion();
  }

  function inicializar() {
    if (i18n()) {
      i18n().montarSelector(nodo('.cajero__estado'));
    }

    nodo('#textoCarga').textContent = t(estado.textoCarga);

    nodo('#etiquetaBanco').textContent = config.nombreBanco || 'Banco ATM';
    nodo('#etiquetaCajero').textContent = config.identificadorCajero || 'ATM-001';

    document.addEventListener('atmidiomacambiado', reaplicarIdioma);

    construirTeclado(nodo('[data-teclado="tarjeta"]'), 'tarjeta');
    construirTeclado(nodo('[data-teclado="pin"]'), 'pin');
    construirMontosRapidos('#montosRetiro', config.montosRapidosRetiro, '#montoRetiro');
    construirMontosRapidos('#montosDeposito', config.montosRapidosDeposito, '#montoDeposito');

    document.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-accion], [data-ir]');
      if (!boton) {
        return;
      }
      var accion = boton.getAttribute('data-accion');
      var destino = boton.getAttribute('data-ir');

      if (accion && acciones[accion]) {
        acciones[accion]();
      } else if (destino && destinos[destino]) {
        destinos[destino]();
      }
    });

    nodo('#botonConfiguracion').addEventListener('click', configurarApi);
    nodo('#proveedorServicio').addEventListener('change', actualizarNotaProveedor);

    document.addEventListener('keydown', function (evento) {
      if (estado.pantallaActual !== 'tarjeta' && estado.pantallaActual !== 'pin') {
        return;
      }
      var campo = estado.pantallaActual;
      if (/^\d$/.test(evento.key)) {
        manejarTecla(campo, evento.key);
      } else if (evento.key === 'Backspace') {
        manejarTecla(campo, 'Borrar');
      } else if (evento.key === 'Enter') {
        if (campo === 'tarjeta') {
          confirmarTarjeta();
        } else {
          confirmarPin();
        }
      }
    });

    pintarEntradaTarjeta();
    pintarEntradaPin();
    verificarConexion();
    irA('inicio');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
  } else {
    inicializar();
  }
})();
