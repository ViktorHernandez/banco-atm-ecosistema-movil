window.PORTAL_CONFIG = {
  apiBaseUrl: (function () {
    var esLocal =
      ['localhost', '127.0.0.1'].indexOf(window.location.hostname) !== -1;
    return esLocal
      ? 'http://localhost:3000'
      : 'https://banco-atm-api-movil.onrender.com';
  })(),

  atmUrl: (function () {
    var esLocal =
      ['localhost', '127.0.0.1'].indexOf(window.location.hostname) !== -1;
    return esLocal
      ? 'http://localhost:5500/'
      : 'https://banco-atm-cajero-movil.onrender.com/';
  })(),

  nombreBanco: 'Banco ATM',
  nombreCorto: 'BA',
  canal: 'WEB',
  minutosInactividad: 10,
  movimientosResumen: 5,
  movimientosPorConsulta: 50,
  notificacionesResumen: 4,
  telefonoAtencion: '56 2972 7628',
  ladaAtencion: '52',
  correoAtencion: 'atencion@bancoatm.test',

  motivosContacto: [
    {
      clave: 'general',
      titulo: 'Información general',
      texto: 'Horarios, sucursales, requisitos y dudas sobre el banco.',
      extension: '1',
    },
    {
      clave: 'tarjetas',
      titulo: 'Tarjetas',
      texto: 'Bloqueo, reposición, solicitud de crédito y aclaraciones de cargos.',
      extension: '2',
    },
    {
      clave: 'cuentas',
      titulo: 'Cuentas y saldo',
      texto: 'Apertura, estados de cuenta, saldo y movimientos.',
      extension: '3',
    },
    {
      clave: 'transferencias',
      titulo: 'Transferencias y pagos',
      texto: 'Envíos entre cuentas, pago de servicios y comprobantes.',
      extension: '4',
    },
    {
      clave: 'otro',
      titulo: 'Otro tema',
      texto: 'Cualquier asunto que no encaje en las opciones anteriores.',
      extension: '0',
    },
  ],
};
