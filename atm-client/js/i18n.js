(function () {
  'use strict';

  var CLAVE = 'atm.idioma';
  var POR_DEFECTO = 'es';

  var IDIOMAS = [
    { codigo: 'es', region: 'es-MX', moneda: 'MXN', bandera: 'ES', nombre: 'Español' },
    { codigo: 'en', region: 'en-US', moneda: 'MXN', bandera: 'EN', nombre: 'English' },
  ];

  var DICCIONARIO = {
    en: {
      'Banco ATM': 'Banco ATM',
      'Cajero automático': 'Automated teller machine',
      'Cajero Automático - Banco ATM': 'ATM - Banco ATM',
      'Configurar API': 'Configure API',
      'Verificando enlace...': 'Checking link...',
      'En línea': 'Online',
      'Sin enlace': 'No link',
      BD: 'DB',
      conectada: 'connected',
      'no disponible': 'unavailable',

      Bienvenido: 'Welcome',
      'Inserte su tarjeta para comenzar. Este cajero opera contra la API bancaria común del ecosistema.':
        'Insert your card to begin. This ATM runs against the shared banking API of the ecosystem.',
      'Insertar tarjeta': 'Insert card',

      'Número de tarjeta': 'Card number',
      'Capture los 16 dígitos de su tarjeta.': 'Enter the 16 digits of your card.',
      Cancelar: 'Cancel',
      Continuar: 'Continue',
      Corregir: 'Correct',
      Volver: 'Back',
      Aceptar: 'Accept',
      Cambiar: 'Change',
      Imprimir: 'Print',
      Menú: 'Menu',
      Aviso: 'Notice',

      'Ingrese su PIN': 'Enter your PIN',
      'Menú principal': 'Main menu',
      'Consultar saldo': 'Check balance',
      'Retiro de efectivo': 'Cash withdrawal',
      Depósito: 'Deposit',
      'Depósito de efectivo': 'Cash deposit',
      Transferencia: 'Transfer',
      Movimientos: 'Transactions',
      'Últimos movimientos': 'Latest transactions',
      'Pago de servicios': 'Bill payments',
      'Cambiar PIN': 'Change PIN',
      'Cambio de PIN': 'PIN change',
      'Mi tarjeta': 'My card',
      'Mis préstamos': 'My loans',
      Préstamos: 'Loans',
      'Finalizar y retirar tarjeta': 'Finish and take card',

      'Saldo disponible': 'Available balance',
      Cuenta: 'Account',
      Saldo: 'Balance',
      Monto: 'Amount',
      Estado: 'Status',
      Folio: 'Reference',
      Número: 'Number',
      'Intentos fallidos': 'Failed attempts',
      Comprobante: 'Receipt',

      'Seleccione un monto o capture otra cantidad.':
        'Select an amount or enter a different one.',
      'Coloque los billetes en la ranura.': 'Place the banknotes in the slot.',
      'Otro monto': 'Other amount',
      'Otra cantidad': 'Other amount',
      Retirar: 'Withdraw',
      Depositar: 'Deposit',

      'Transferencias entre cuentas de este banco.':
        'Transfers between accounts of this bank.',
      'Cuenta destino': 'Destination account',
      'Concepto (opcional)': 'Note (optional)',
      Transferir: 'Transfer',

      Proveedor: 'Provider',
      Referencia: 'Reference',
      Pagar: 'Pay',

      'PIN actual': 'Current PIN',
      'PIN nuevo': 'New PIN',
      'Confirmar PIN nuevo': 'Confirm new PIN',

      'Bloquear tarjeta': 'Block card',
      'El bloqueo finaliza su sesión de inmediato. El desbloqueo se realiza desde la app móvil o el portal web.':
        'Blocking ends your session immediately. Unblocking is done from the mobile app or the web portal.',

      'Solicitar préstamo': 'Apply for a loan',
      'Pagar préstamo': 'Pay a loan',
      'Pagar un préstamo': 'Pay a loan',
      'Detalle del préstamo': 'Loan details',
      'Monto del préstamo': 'Loan amount',
      'Monto solicitado': 'Requested amount',
      'Monto original': 'Original amount',
      'Monto mínimo': 'Minimum amount',
      'Puede solicitar hasta': 'You can request up to',
      'Saldo considerado': 'Balance considered',
      'Perfil aplicado': 'Profile applied',
      'Tasa anual': 'Annual rate',
      Plazo: 'Term',
      'Pago mensual': 'Monthly payment',
      'Pago mínimo': 'Minimum payment',
      'Pagos realizados': 'Payments made',
      'Próximo pago': 'Next payment',
      'Falta por pagar': 'Outstanding',
      'Para liquidar hoy': 'To settle today',
      'Total a pagar': 'Total to pay',
      'Total proyectado': 'Projected total',
      'Límite disponible': 'Available limit',
      'Confirme su solicitud': 'Confirm your request',
      'Confirmar solicitud': 'Confirm request',
      'Confirmar pago': 'Confirm payment',
      'El monto se depositará en su cuenta al confirmar. El primer pago vence a los 30 días.':
        'The amount will be deposited into your account upon confirmation. The first payment is due in 30 days.',
      'Liquidar hoy evita los intereses de los pagos que faltan.':
        'Settling today avoids the interest on the remaining payments.',

      'Procesando operación...': 'Processing operation...',
      'Validando su tarjeta...': 'Validating your card...',
      'Consultando saldo...': 'Checking balance...',
      'Dispensando efectivo...': 'Dispensing cash...',
      'Validando billetes...': 'Validating banknotes...',
      'Enviando transferencia...': 'Sending transfer...',
      'Recuperando movimientos...': 'Retrieving transactions...',
      'Cargando catálogo...': 'Loading catalog...',
      'Aplicando el pago...': 'Applying the payment...',
      'Actualizando PIN...': 'Updating PIN...',
      'Consultando su tarjeta...': 'Checking your card...',
      'Bloqueando tarjeta...': 'Blocking card...',
      'Finalizando sesión...': 'Ending session...',
      'Consultando sus préstamos...': 'Checking your loans...',
      'Enviando su solicitud...': 'Sending your request...',
      'Aplicando el pago del préstamo...': 'Applying the loan payment...',

      'Tarjeta no válida': 'Invalid card',
      'El número de tarjeta debe tener entre 13 y 19 dígitos.':
        'The card number must be between 13 and 19 digits.',
      'PIN no válido': 'Invalid PIN',
      'El PIN debe tener entre 4 y 6 dígitos.':
        'The PIN must be between 4 and 6 digits.',
      'PIN no coincide': 'PIN does not match',
      'La confirmación no coincide con el nuevo PIN.':
        'The confirmation does not match the new PIN.',
      'Ambos PIN deben tener entre 4 y 6 dígitos.':
        'Both PINs must be between 4 and 6 digits.',
      'PIN actualizado': 'PIN updated',
      Reintentar: 'Retry',
      'PIN incorrecto': 'Incorrect PIN',
      'Tarjeta bloqueada': 'Card blocked',
      'Retirar tarjeta': 'Take card',
      'Sesión finalizada': 'Session ended',
      'Sesión cerrada': 'Session closed',
      'No se pudo completar': 'Could not be completed',
      'Monto requerido': 'Amount required',
      'Seleccione o capture un monto válido.': 'Select or enter a valid amount.',
      'Capture un monto válido.': 'Enter a valid amount.',
      'Cuenta no válida': 'Invalid account',
      'Capture una cuenta destino de 6 a 30 dígitos.':
        'Enter a destination account of 6 to 30 digits.',
      'Proveedor requerido': 'Provider required',
      'Seleccione un proveedor del catálogo.': 'Select a provider from the catalog.',
      'Referencia no válida': 'Invalid reference',
      'La referencia debe ser alfanumérica de 4 a 20 caracteres.':
        'The reference must be alphanumeric, 4 to 20 characters.',
      'Ocurrió un error inesperado.': 'An unexpected error occurred.',
      'Su sesión expiró. Retire su tarjeta e inténtelo de nuevo.':
        'Your session expired. Take your card and try again.',
      'Acuda a su sucursal o utilice la app móvil para gestionar su tarjeta.':
        'Visit your branch or use the mobile app to manage your card.',
      'Su tarjeta quedó bloqueada. Puede desbloquearla desde la app móvil o el portal web.':
        'Your card has been blocked. You can unblock it from the mobile app or the web portal.',
      'Gracias por su preferencia': 'Thank you',
      'Retire su tarjeta. La sesión finalizó correctamente.':
        'Take your card. The session ended correctly.',
      'Se cerró la sesión por inactividad. Retire su tarjeta.':
        'The session was closed due to inactivity. Take your card.',
      'No hay movimientos registrados.': 'No transactions recorded.',
      'No tiene préstamos pendientes.': 'You have no outstanding loans.',
      '¿Confirma el bloqueo de su tarjeta? La sesión se cerrará.':
        'Do you confirm blocking your card? The session will close.',
      'Dirección base de la API bancaria.': 'Base address of the banking API.',
      'No fue posible contactar al servidor bancario. Verifique la URL de la API y que el backend esté en ejecución.':
        'The banking server could not be reached. Check the API URL and that the backend is running.',
      'Cambiar idioma': 'Change language',
      'Pantalla:': 'Screen:',
      'Sesión activa': 'Session active',
      'cierre automático en': 'automatic close in',
      s: 's',
      'Sesión de': 'Session of',
      fallida: 'failed',

      RETIRO: 'WITHDRAWAL',
      DEPOSITO: 'DEPOSIT',
      TRANSFERENCIA: 'TRANSFER',
      PAGO_SERVICIO: 'BILL PAYMENT',
      PRESTAMO: 'LOAN',
      PAGO_PRESTAMO: 'LOAN PAYMENT',
      EXITOSA: 'SUCCESSFUL',
      FALLIDA: 'FAILED',
      PENDIENTE: 'PENDING',
      ACTIVA: 'ACTIVE',
      BLOQUEADA: 'BLOCKED',
      INACTIVA: 'INACTIVE',
      ATM: 'ATM',
      WEB: 'WEB',
      APP: 'APP',
      CLIENTE: 'CLIENT',
      INTENTOS_FALLIDOS: 'FAILED_ATTEMPTS',
      ADMINISTRADOR: 'ADMINISTRATOR',

      'COMPROBANTE DE OPERACION': 'OPERATION RECEIPT',
      'CONSERVE ESTE COMPROBANTE': 'KEEP THIS RECEIPT',
      'Documento simulado - proyecto academico':
        'Simulated document - academic project',
      Cajero: 'ATM',
      Fecha: 'Date',
      Operacion: 'Operation',
      Canal: 'Channel',
      'Cuenta cargo': 'Debit account',
      'Cuenta abono': 'Credit account',
      'Saldo final': 'Final balance',
      Concepto: 'Note',

      'En línea · sin base de datos': 'Online · no database',
      'La API responde pero no tiene enlace con la base de datos.':
        'The API responds but has no link to the database.',
      'No hay comunicación con la API en {url}. Verifique que el backend esté en ejecución.':
        'There is no communication with the API at {url}. Check that the backend is running.',
      'Montos entre {minimo} y {maximo}, en múltiplos de {denominacion}.':
        'Amounts between {minimo} and {maximo}, in multiples of {denominacion}.',
      'Sesión de {titular} · Cuenta {cuenta}':
        'Session of {titular} · Account {cuenta}',
      'Categoría {categoria} · monto entre {minimo} y {maximo} · referencia de {longitud} caracteres.':
        'Category {categoria} · amount between {minimo} and {maximo} · reference of {longitud} characters.',
      'Sesión activa · cierre automático en {segundos} s':
        'Session active · automatic close in {segundos} s',
      'Consulta realizada el {fecha}': 'Checked on {fecha}',
      'También tiene {cantidad} préstamo pendiente. Pago mínimo total: {total}.':
        'You also have {cantidad} outstanding loan. Total minimum payment: {total}.',
      'También tiene {cantidad} préstamos pendientes. Pago mínimo total: {total}.':
        'You also have {cantidad} outstanding loans. Total minimum payment: {total}.',
      'Tiene {cantidad} préstamo vigente. Seleccione uno para ver el detalle o pagar.':
        'You have {cantidad} active loan. Select one to see the details or pay.',
      'Tiene {cantidad} préstamos vigentes. Seleccione uno para ver el detalle o pagar.':
        'You have {cantidad} active loans. Select one to see the details or pay.',
      'Seleccione un monto entre {minimo} y {maximo}.':
        'Select an amount between {minimo} and {maximo}.',
      'El préstamo mínimo es de {monto}.': 'The minimum loan is {monto}.',
      'Préstamo {folio}. Pago mínimo {minimo} · liquidar {liquidacion}.':
        'Loan {folio}. Minimum payment {minimo} · settle {liquidacion}.',
      'Sin tarjeta de crédito': 'No credit card',
      'Su nivel de tarjeta de crédito aumenta el límite y reduce la tasa aplicada.':
        'Your credit card tier increases the limit and lowers the rate applied.',
      'Su límite corresponde al perfil sin tarjeta de crédito.':
        'Your limit corresponds to the profile without a credit card.',
      'No tiene préstamos pendientes de pago.':
        'You have no outstanding loan payments.',
      'Monto no válido': 'Invalid amount',
      'Monto por debajo del mínimo': 'Amount below the minimum',
      'Escriba la cantidad que desea solicitar.':
        'Enter the amount you want to request.',
      'Consultando sus condiciones...': 'Checking your conditions...',
      'Menú principal': 'Main menu',
      'Ir al contenido principal': 'Skip to main content',

      'Aplicando su pago...': 'Applying your payment...',
      'Calculando condiciones...': 'Calculating terms...',
      'Consultando el préstamo...': 'Checking the loan...',
      'Consultando sus condiciones...': 'Checking your terms...',
      'Puede solicitar como máximo {monto}.':
        'You can request a maximum of {monto}.',
      'El pago mínimo de este préstamo es de {monto}.':
        'The minimum payment for this loan is {monto}.',
      'Este préstamo se liquida con {monto}.':
        'This loan is settled with {monto}.',
      'Vence el {fecha} · quedan {pagos} pagos':
        'Due on {fecha} · {pagos} payments left',
      '{meses} meses': '{meses} months',
      '{hechos} de {plazo} · restan {restantes}':
        '{hechos} of {plazo} · {restantes} left',
      '{mensaje} Folio {folio}. Pago mensual de {mensual}. Saldo disponible: {saldo}.':
        '{mensaje} Reference {folio}. Monthly payment of {mensual}. Available balance: {saldo}.',
      '{mensaje} Saldo pendiente: {pendiente}. Saldo de su cuenta: {saldo}.':
        '{mensaje} Outstanding balance: {pendiente}. Your account balance: {saldo}.',
      'Dirección base de la API bancaria.\nDeje el campo vacío para volver a la dirección por defecto ({porDefecto}).':
        'Base address of the banking API.\nLeave the field empty to return to the default address ({porDefecto}).',
      'Monto por encima del límite': 'Amount above the limit',
      'Monto por debajo del mínimo': 'Amount below the minimum',
      'Monto insuficiente': 'Insufficient amount',
      'Monto excesivo': 'Excessive amount',
      'Monto no válido': 'Invalid amount',
      'Préstamo aprobado': 'Loan approved',
      'Préstamo liquidado': 'Loan settled',
      'Pago aplicado': 'Payment applied',
      'No tiene préstamos pendientes de pago.':
        'You have no outstanding loan payments.',
      'Escriba la cantidad que desea solicitar.':
        'Enter the amount you wish to request.',
      'Escriba la cantidad que desea pagar.':
        'Enter the amount you wish to pay.',
      'Sin tarjeta de crédito': 'No credit card',
      'En línea · sin base de datos': 'Online · no database',
      'Consulta realizada el {fecha}': 'Checked on {fecha}',
      'Montos entre {minimo} y {maximo}, en múltiplos de {denominacion}.':
        'Amounts between {minimo} and {maximo}, in multiples of {denominacion}.',
      'Seleccione un monto entre {minimo} y {maximo}.':
        'Select an amount between {minimo} and {maximo}.',
      'El préstamo mínimo es de {monto}.': 'The minimum loan is {monto}.',
      'Préstamo {folio}. Pago mínimo {minimo} · liquidar {liquidacion}.':
        'Loan {folio}. Minimum payment {minimo} · settle {liquidacion}.',
      'También tiene {cantidad} préstamo pendiente. Pago mínimo total: {total}.':
        'You also have {cantidad} outstanding loan. Total minimum payment: {total}.',
      'También tiene {cantidad} préstamos pendientes. Pago mínimo total: {total}.':
        'You also have {cantidad} outstanding loans. Total minimum payment: {total}.',
      'Sesión activa · cierre automático en {segundos} s':
        'Session active · automatic close in {segundos} s',
      'Ir al contenido principal': 'Skip to main content',
      API: 'API',
      Borrar: 'Delete',
      Limpiar: 'Clear',
      'Teclado numérico': 'Numeric keypad',
      'Escriba el número de su tarjeta': 'Enter your card number',
      'Escriba su PIN': 'Enter your PIN',
    },
  };

  var estado = { codigo: POR_DEFECTO };

  function definicion(codigo) {
    return (
      IDIOMAS.filter(function (item) {
        return item.codigo === codigo;
      })[0] || IDIOMAS[0]
    );
  }

  function leerGuardado() {
    try {
      return window.localStorage.getItem(CLAVE);
    } catch (error) {
      return null;
    }
  }

  function guardar(codigo) {
    try {
      window.localStorage.setItem(CLAVE, codigo);
    } catch (error) {
      return;
    }
  }

  function detectar() {
    var guardado = leerGuardado();
    if (guardado && definicion(guardado).codigo === guardado) {
      return guardado;
    }

    var idiomas = window.navigator.languages || [window.navigator.language || ''];
    for (var i = 0; i < idiomas.length; i += 1) {
      var base = String(idiomas[i]).toLowerCase().split('-')[0];
      if (
        IDIOMAS.filter(function (item) {
          return item.codigo === base;
        }).length
      ) {
        return base;
      }
    }

    return POR_DEFECTO;
  }

  function t(texto) {
    if (texto === null || texto === undefined) {
      return '';
    }
    if (estado.codigo === POR_DEFECTO) {
      return String(texto);
    }
    var limpio = String(texto).trim().replace(/\s+/g, ' ');
    var tabla = DICCIONARIO[estado.codigo] || {};
    return tabla[limpio] !== undefined ? tabla[limpio] : String(texto);
  }

  function frase(plantilla, parametros) {
    var valores = parametros || {};
    return Object.keys(valores).reduce(function (acumulado, nombre) {
      return acumulado.split('{' + nombre + '}').join(String(valores[nombre]));
    }, t(plantilla));
  }

  function region() {
    return definicion(estado.codigo).region;
  }

  function moneda(valor) {
    var numero = Number(valor);
    if (isNaN(numero)) {
      return '—';
    }
    return numero.toLocaleString(region(), {
      style: 'currency',
      currency: definicion(estado.codigo).moneda,
      minimumFractionDigits: 2,
    });
  }

  function fechaHora(valor) {
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

  function fecha(valor) {
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

  function traducirArbol(raiz) {
    var destino = raiz || document;

    var textuales = destino.querySelectorAll('[data-i18n]');
    for (var i = 0; i < textuales.length; i += 1) {
      textuales[i].textContent = t(textuales[i].getAttribute('data-i18n'));
    }

    var atributos = ['aria-label', 'title', 'placeholder'];
    atributos.forEach(function (atributo) {
      var elementos = destino.querySelectorAll('[data-i18n-' + atributo + ']');
      for (var j = 0; j < elementos.length; j += 1) {
        elementos[j].setAttribute(
          atributo,
          t(elementos[j].getAttribute('data-i18n-' + atributo)),
        );
      }
    });
  }

  function aplicar(codigo, opciones) {
    var ajustes = opciones || {};
    estado.codigo = definicion(codigo).codigo;

    document.documentElement.setAttribute('lang', estado.codigo);

    if (ajustes.guardar !== false) {
      guardar(estado.codigo);
    }

    if (document.body) {
      traducirArbol(document);
      actualizarSelector();
    }

    if (document.title) {
      document.title = t('Cajero Automático - Banco ATM');
    }

    document.dispatchEvent(
      new CustomEvent('atmidiomacambiado', { detail: { idioma: estado.codigo } }),
    );
  }

  function actualizarSelector() {
    var botones = document.querySelectorAll('[data-idioma-opcion]');
    for (var i = 0; i < botones.length; i += 1) {
      var activo = botones[i].getAttribute('data-idioma-opcion') === estado.codigo;
      botones[i].setAttribute('aria-pressed', activo ? 'true' : 'false');
      botones[i].classList.toggle('activa', activo);
    }
  }

  function montarSelector(destino) {
    if (!destino || destino.querySelector('[data-selector-idioma]')) {
      return;
    }

    var grupo = document.createElement('div');
    grupo.className = 'selector-idioma';
    grupo.setAttribute('data-selector-idioma', 'true');
    grupo.setAttribute('role', 'group');
    grupo.setAttribute('data-i18n-aria-label', 'Cambiar idioma');
    grupo.setAttribute('aria-label', t('Cambiar idioma'));

    IDIOMAS.forEach(function (idioma) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'selector-idioma__opcion';
      boton.setAttribute('data-idioma-opcion', idioma.codigo);
      boton.setAttribute('lang', idioma.codigo);
      boton.setAttribute('aria-label', idioma.nombre);
      boton.textContent = idioma.bandera;
      boton.addEventListener('click', function () {
        if (estado.codigo === idioma.codigo) {
          return;
        }
        aplicar(idioma.codigo);
      });
      grupo.appendChild(boton);
    });

    destino.insertBefore(grupo, destino.firstChild);
    actualizarSelector();
  }

  window.AtmI18n = {
    t: t,
    frase: frase,
    moneda: moneda,
    fecha: fecha,
    fechaHora: fechaHora,
    region: region,
    actual: function () {
      return estado.codigo;
    },
    aplicar: aplicar,
    detectar: detectar,
    traducirArbol: traducirArbol,
    montarSelector: montarSelector,
  };

  aplicar(detectar(), { guardar: false });
})();
