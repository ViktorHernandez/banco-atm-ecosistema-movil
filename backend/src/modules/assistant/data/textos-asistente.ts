export type IdiomaAsistente = 'es' | 'en';

export const IDIOMAS_ASISTENTE: IdiomaAsistente[] = ['es', 'en'];

export const LOCALE_POR_IDIOMA: Record<IdiomaAsistente, string> = {
  es: 'es-MX',
  en: 'en-US',
};

export type Parametros = Record<string, string | number>;

type Entrada = Record<IdiomaAsistente, string>;

export const TEXTOS: Record<string, Entrada> = {
  'accion.cuentas': { es: 'Ver mis cuentas', en: 'View my accounts' },
  'accion.movimientos': { es: 'Ir a Movimientos', en: 'Go to Transactions' },
  'accion.prestamos': { es: 'Ir a Préstamos', en: 'Go to Loans' },
  'accion.prestamos.solicitar': {
    es: 'Solicitar un préstamo',
    en: 'Apply for a loan',
  },
  'accion.prestamos.pagar': {
    es: 'Pagar desde Préstamos',
    en: 'Pay from Loans',
  },
  'accion.pagos.prestamo': {
    es: 'Pagar desde Pago de servicios',
    en: 'Pay from Bill payments',
  },
  'accion.tarjetas': { es: 'Ir a Mis tarjetas', en: 'Go to My cards' },
  'accion.tarjetas.catalogo': { es: 'Ver el catálogo', en: 'View the catalog' },
  'accion.tarjetas.administrar': {
    es: 'Administrar mis tarjetas',
    en: 'Manage my cards',
  },
  'accion.transferencias': { es: 'Ir a Transferencias', en: 'Go to Transfers' },
  'accion.pagos': { es: 'Ir a Pago de servicios', en: 'Go to Bill payments' },
  'accion.perfil': { es: 'Ir a Mi perfil', en: 'Go to My profile' },
  'accion.avisos': { es: 'Ir a Avisos', en: 'Go to Alerts' },
  'accion.seguridad': { es: 'Consejos de seguridad', en: 'Security advice' },
  'accion.contacto': { es: 'Atención a clientes', en: 'Customer service' },
  'accion.admin.usuarios': { es: 'Ir a Usuarios', en: 'Go to Users' },
  'accion.admin.auditoria': { es: 'Ir a Auditoría', en: 'Go to Audit log' },
  'accion.admin.reportes': { es: 'Ir a Reportes', en: 'Go to Reports' },
  'accion.acceder': { es: 'Iniciar sesión', en: 'Sign in' },

  'sugerencia.saldo': { es: '¿Cuál es mi saldo?', en: 'What is my balance?' },
  'sugerencia.prestamos': {
    es: '¿Tengo préstamos pendientes?',
    en: 'Do I have any outstanding loans?',
  },
  'sugerencia.transferir': {
    es: '¿Cómo transfiero dinero?',
    en: 'How do I transfer money?',
  },
  'sugerencia.movimientos': {
    es: '¿Dónde veo mis movimientos?',
    en: 'Where can I see my transactions?',
  },
  'sugerencia.tarjetas': {
    es: '¿Qué tarjetas ofrece el banco?',
    en: 'What cards does the bank offer?',
  },
  'sugerencia.admin.alta': {
    es: '¿Cómo doy de alta un cliente?',
    en: 'How do I register a client?',
  },
  'sugerencia.admin.auditoria': {
    es: '¿Dónde veo la auditoría?',
    en: 'Where can I see the audit log?',
  },
  'sugerencia.admin.reporte': {
    es: '¿Cómo genero un reporte?',
    en: 'How do I generate a report?',
  },
  'sugerencia.publico.cuenta': {
    es: '¿Cómo abro una cuenta?',
    en: 'How do I open an account?',
  },
  'sugerencia.publico.seguridad': {
    es: '¿Es seguro el banco en línea?',
    en: 'Is online banking safe?',
  },
  'sugerencia.publico.atm': {
    es: '¿Qué puedo hacer en el cajero?',
    en: 'What can I do at the ATM?',
  },

  'fuera_alcance.admin': {
    es: 'Esa consulta corresponde a la banca de un cliente. Su sesión es administrativa, así que no tiene una cuenta personal asociada. Desde el panel puede consultar la información de los clientes en la sección Usuarios.',
    en: 'That query belongs to client banking. Your session is administrative, so it has no personal account attached. You can review client information in the Users section of the panel.',
  },
  'fuera_alcance.cliente': {
    es: 'Esa sección es administrativa y su sesión no tiene acceso a ella. Si necesita ese trámite, comuníquese con atención a clientes.',
    en: 'That section is administrative and your session cannot access it. If you need that procedure, please contact customer service.',
  },
  'fuera_alcance.publico': {
    es: 'Para responder eso necesito que inicie sesión, porque depende de la información de su cuenta. Aquí puedo explicarle cómo funciona el banco, los servicios, las tarjetas, las transferencias y la seguridad.',
    en: 'To answer that I need you to sign in, because it depends on your account information. Here I can explain how the bank works, its services, cards, transfers and security.',
  },
  desconocida: {
    es: 'No tengo información sobre eso. Puedo ayudarle con saldo, movimientos, transferencias, pagos de servicios, tarjetas, préstamos, avisos y seguridad. Si su consulta es de otro tipo, atención a clientes puede atenderle.',
    en: 'I have no information about that. I can help you with balance, transactions, transfers, bill payments, cards, loans, alerts and security. For anything else, customer service can assist you.',
  },
  'desconocida.publica': {
    es: 'No tengo información sobre eso. Puedo explicarle los servicios del banco, cómo abrir una cuenta, las tarjetas, las transferencias, el cajero automático y la seguridad. Para consultas sobre su cuenta, inicie sesión.',
    en: 'I have no information about that. I can explain the bank services, how to open an account, cards, transfers, the ATM and security. For questions about your account, please sign in.',
  },
  requiere_cuenta: {
    es: 'Para responder eso necesito una cuenta bancaria asociada a su sesión, y esta no la tiene. Si cree que es un error, comuníquese con atención a clientes.',
    en: 'To answer that I need a bank account attached to your session, and this one has none. If you believe this is a mistake, please contact customer service.',
  },
  requiere_sesion: {
    es: 'Esa información es privada y solo puedo consultarla cuando usted ha iniciado sesión. Entre a su banca en línea y vuelva a preguntármelo.',
    en: 'That information is private and I can only look it up once you have signed in. Sign in to your online banking and ask me again.',
  },
  error_consulta: {
    es: 'No pude consultar ese dato en este momento. Vuelva a intentarlo en unos segundos o revísela directamente en el portal.',
    en: 'I could not look that up right now. Try again in a few seconds or check it directly in the portal.',
  },

  'saludo.con_nombre': {
    es: 'Hola {nombre}. Soy el asistente de Banco ATM. Puedo consultar su saldo, sus préstamos y sus tarjetas, y explicarle cómo hacer cualquier operación del portal. ¿Qué necesita?',
    en: 'Hello {nombre}. I am the Banco ATM assistant. I can check your balance, your loans and your cards, and explain how to carry out any operation in the portal. What do you need?',
  },
  'saludo.sin_nombre': {
    es: 'Hola. Soy el asistente de Banco ATM. Puedo consultar su saldo, sus préstamos y sus tarjetas, y explicarle cómo hacer cualquier operación del portal. ¿Qué necesita?',
    en: 'Hello. I am the Banco ATM assistant. I can check your balance, your loans and your cards, and explain how to carry out any operation in the portal. What do you need?',
  },
  'saludo.publico': {
    es: 'Hola. Soy el asistente de Banco ATM. Puedo explicarle los servicios del banco, cómo abrir una cuenta, las tarjetas, las transferencias, el cajero y la seguridad. Para consultar su saldo o sus movimientos necesita iniciar sesión.',
    en: 'Hello. I am the Banco ATM assistant. I can explain the bank services, how to open an account, cards, transfers, the ATM and security. To check your balance or transactions you need to sign in.',
  },
  despedida: {
    es: 'Con gusto. Aquí estaré si necesita algo más.',
    en: 'My pleasure. I will be here if you need anything else.',
  },
  'capacidades.admin': {
    es: 'Puedo orientarle sobre el panel administrativo: alta y edición de clientes, cambio de perfil, estado de tarjetas, reportes de operaciones y auditoría. No consulto cuentas personales desde una sesión administrativa.',
    en: 'I can guide you through the administrative panel: creating and editing clients, changing profiles, card status, operation reports and the audit log. I do not query personal accounts from an administrative session.',
  },
  'capacidades.cliente': {
    es: 'Puedo consultar información real de su cuenta (saldo, movimientos, tarjetas, préstamos y avisos) y explicarle cómo transferir, pagar servicios, solicitar una tarjeta o un préstamo, cambiar su PIN o su contraseña, y qué hacer si pierde su tarjeta. No realizo operaciones: para eso le indico la sección correspondiente.',
    en: 'I can look up real information from your account (balance, transactions, cards, loans and alerts) and explain how to transfer, pay bills, apply for a card or a loan, change your PIN or your password, and what to do if you lose your card. I do not carry out operations: for that I point you to the right section.',
  },
  'capacidades.publico': {
    es: 'Sin iniciar sesión puedo explicarle los servicios del banco, cómo abrir una cuenta, los niveles de tarjeta, cómo funcionan las transferencias y los pagos, qué puede hacer en el cajero, y darle consejos de seguridad. Los datos de su cuenta solo puedo consultarlos si inicia sesión.',
    en: 'Without signing in I can explain the bank services, how to open an account, the card tiers, how transfers and payments work, what you can do at the ATM, and give you security advice. I can only look up your account data once you sign in.',
  },

  saldo: {
    es: 'Su saldo disponible es de {monto} en la cuenta {cuenta}. Es el dato registrado en este momento por el banco.',
    en: 'Your available balance is {monto} in account {cuenta}. This is the figure recorded by the bank right now.',
  },
  'movimientos.vacio': {
    es: 'Su cuenta todavía no registra movimientos. En cuanto realice su primera operación aparecerá en la sección Movimientos, donde puede filtrar por fecha y por tipo.',
    en: 'Your account has no transactions yet. As soon as you carry out your first operation it will appear in the Transactions section, where you can filter by date and type.',
  },
  'movimientos.detalle': {
    es: 'Sus últimos movimientos son: {resumen}. En la sección Movimientos puede filtrarlos por fecha y por tipo de operación, y descargarlos.',
    en: 'Your latest transactions are: {resumen}. In the Transactions section you can filter them by date and operation type, and download them.',
  },
  'movimientos.linea': {
    es: '{fecha}: {tipo} de {monto}',
    en: '{fecha}: {tipo} of {monto}',
  },

  'prestamos.sin_pendientes': {
    es: 'No tiene préstamos pendientes de pago. Si desea solicitar uno, en la sección Préstamos verá el límite que le corresponde según su saldo y su nivel de tarjeta.',
    en: 'You have no outstanding loans. If you want to apply for one, the Loans section shows the limit available to you based on your balance and card tier.',
  },
  'prestamos.detalle': {
    es: 'Tiene {cantidad} {palabra}. {detalle}. Puede pagar desde Préstamos o desde Pago de servicios.',
    en: 'You have {cantidad} {palabra}. {detalle}. You can pay from Loans or from Bill payments.',
  },
  'prestamos.palabra.singular': {
    es: 'préstamo vigente',
    en: 'active loan',
  },
  'prestamos.palabra.plural': {
    es: 'préstamos vigentes',
    en: 'active loans',
  },
  'prestamos.linea': {
    es: '{folio}: le faltan {liquidacion}, con pago mínimo de {minimo} el {fecha} ({hechos} de {plazo} pagos hechos)',
    en: '{folio}: {liquidacion} remaining, with a minimum payment of {minimo} due on {fecha} ({hechos} of {plazo} payments made)',
  },
  'prestamos.no_elegible': {
    es: 'Por ahora no puede solicitar un préstamo. {motivos}',
    en: 'You cannot apply for a loan right now. {motivos}',
  },
  'prestamos.condiciones': {
    es: 'Puede solicitar entre {minimo} y {maximo}, con una tasa anual del {tasa} %. Su límite se calcula con su saldo de {saldo} y su perfil: {perfil}. El monto se deposita en su cuenta al aprobarse.',
    en: 'You can apply for between {minimo} and {maximo}, at an annual rate of {tasa} %. Your limit is calculated from your balance of {saldo} and your profile: {perfil}. The amount is deposited into your account upon approval.',
  },
  'prestamos.pagar.sin_pendientes': {
    es: 'No tiene préstamos pendientes de pago en este momento.',
    en: 'You have no outstanding loan payments at this time.',
  },
  'prestamos.pagar.detalle': {
    es: 'Puede pagar desde la ficha del préstamo en la sección Préstamos, o seleccionar varios a la vez en Pago de servicios. Sus pagos mínimos suman {total}. Puede abonar el mínimo o liquidar el préstamo completo, lo que evita los intereses restantes. Por seguridad, el pago se confirma en el portal y no desde aquí.',
    en: 'You can pay from the loan card in the Loans section, or select several at once in Bill payments. Your minimum payments add up to {total}. You can pay the minimum or settle the loan in full, which avoids the remaining interest. For security, payment is confirmed in the portal and not from here.',
  },

  'tarjetas.sin_tarjetas': {
    es: 'Su cuenta no tiene tarjetas emitidas. Comuníquese con atención a clientes para solicitar una.',
    en: 'Your account has no cards issued. Contact customer service to request one.',
  },
  'tarjetas.detalle': {
    es: 'Tiene {cantidad} {palabra}: {detalle}. Desde Mis tarjetas puede bloquearlas o desbloquearlas.',
    en: 'You have {cantidad} {palabra}: {detalle}. From My cards you can block or unblock them.',
  },
  'tarjetas.palabra.singular': { es: 'tarjeta', en: 'card' },
  'tarjetas.palabra.plural': { es: 'tarjetas', en: 'cards' },
  'tarjetas.linea': {
    es: '{numero} ({tipo}), estado {estado}{credito}',
    en: '{numero} ({tipo}), status {estado}{credito}',
  },
  'tarjetas.tipo.credito': { es: 'crédito {nivel}', en: '{nivel} credit' },
  'tarjetas.tipo.debito': { es: 'débito', en: 'debit' },
  'tarjetas.credito_disponible': {
    es: ', con {monto} disponibles',
    en: ', with {monto} available',
  },
  'tarjetas.estado.ACTIVA': { es: 'activa', en: 'active' },
  'tarjetas.estado.BLOQUEADA': { es: 'bloqueada', en: 'blocked' },
  'tarjetas.estado.INACTIVA': { es: 'inactiva', en: 'inactive' },
  'tarjetas.catalogo': {
    es: 'El banco ofrece cuatro niveles de tarjeta de crédito: {niveles}. {recomendacion} La aprobación depende del saldo real de su cuenta al momento de solicitarla.',
    en: 'The bank offers four credit card tiers: {niveles}. {recomendacion} Approval depends on the actual balance of your account at the time of the request.',
  },
  'tarjetas.catalogo.nivel': {
    es: '{nombre} (saldo mínimo {minimo})',
    en: '{nombre} (minimum balance {minimo})',
  },
  'tarjetas.catalogo.recomendada': {
    es: 'Con su saldo actual le corresponde la {nombre}.',
    en: 'With your current balance you qualify for the {nombre}.',
  },
  'tarjetas.catalogo.sin_recomendacion': {
    es: 'Con su saldo actual todavía no alcanza el mínimo de ninguna, pero puede consultarlas.',
    en: 'With your current balance you do not yet reach the minimum for any of them, but you can review them.',
  },
  'tarjetas.catalogo.publico': {
    es: 'El banco ofrece cuatro niveles de tarjeta de crédito: Clásica, Oro, Platino e Infinite. Cada nivel pide un saldo mínimo distinto y ofrece una línea de crédito y una tasa diferentes. Inicie sesión para ver cuál le corresponde con su saldo actual.',
    en: 'The bank offers four credit card tiers: Clásica, Oro, Platino and Infinite. Each tier requires a different minimum balance and offers a different credit line and rate. Sign in to see which one matches your current balance.',
  },
  'tarjeta.sin_bloqueo': {
    es: 'Ninguna de sus tarjetas está bloqueada. Si perdió una o sospecha de un uso indebido, bloquéela usted mismo desde Mis tarjetas: el bloqueo es inmediato y afecta también al cajero. Podrá desbloquearla después si era una falsa alarma.',
    en: 'None of your cards is blocked. If you lost one or suspect misuse, block it yourself from My cards: the block is immediate and also applies at the ATM. You can unblock it later if it was a false alarm.',
  },
  'tarjeta.bloqueo.linea': { es: '{numero}: {motivo}', en: '{numero}: {motivo}' },
  'tarjeta.motivo.CLIENTE': {
    es: 'la bloqueó usted, así que puede desbloquearla desde el portal',
    en: 'you blocked it, so you can unblock it from the portal',
  },
  'tarjeta.motivo.INTENTOS_FALLIDOS': {
    es: 'se bloqueó por intentos incorrectos de PIN; el desbloqueo lo debe hacer el banco',
    en: 'it was blocked after incorrect PIN attempts; the bank must unblock it',
  },
  'tarjeta.motivo.ADMINISTRADOR': {
    es: 'la bloqueó el banco; el desbloqueo lo debe hacer el banco',
    en: 'the bank blocked it; the bank must unblock it',
  },
  'tarjeta.bloqueo.publico': {
    es: 'Si perdió su tarjeta o sospecha de un uso indebido, inicie sesión y bloquéela desde Mis tarjetas: el bloqueo es inmediato y afecta también al cajero. Si no puede entrar, llame a atención a clientes.',
    en: 'If you lost your card or suspect misuse, sign in and block it from My cards: the block is immediate and also applies at the ATM. If you cannot sign in, call customer service.',
  },

  transferencia: {
    es: 'En Transferencias escriba el número de la cuenta destino, el monto y un concepto opcional. Verá un resumen antes de confirmar y, al aplicarse, se genera un comprobante con folio. La cuenta destino debe ser de este mismo banco y usted recibirá un aviso; el destinatario también.',
    en: 'In Transfers, enter the destination account number, the amount and an optional note. You will see a summary before confirming and, once applied, a receipt with a reference number is generated. The destination account must belong to this same bank and you will receive an alert; so will the recipient.',
  },
  pago_servicios: {
    es: 'En Pago de servicios elija el proveedor del catálogo, escriba la referencia de su recibo y el monto. Cada proveedor define su monto mínimo y máximo. Desde esa misma sección puede pagar también sus préstamos pendientes.',
    en: 'In Bill payments, choose the provider from the catalog, enter your bill reference and the amount. Each provider sets its own minimum and maximum. From that same section you can also pay your outstanding loans.',
  },
  pin: {
    es: 'El PIN se cambia desde el cajero automático: inserte su tarjeta, escriba su PIN actual y elija Cambio de PIN. Debe tener entre 4 y 6 dígitos. Si lo olvidó, comuníquese con atención a clientes. Tras varios intentos incorrectos la tarjeta se bloquea automáticamente por seguridad.',
    en: 'The PIN is changed at the ATM: insert your card, enter your current PIN and choose Change PIN. It must be 4 to 6 digits long. If you forgot it, contact customer service. After several incorrect attempts the card is automatically blocked for security.',
  },
  password: {
    es: 'En Mi perfil puede cambiar su nombre, su correo, su teléfono y su contraseña. Para cambiarla debe escribir la contraseña actual y la nueva dos veces. Cada cambio genera un aviso y, si tiene correo verificado, también un mensaje.',
    en: 'In My profile you can change your name, email, phone number and password. To change it you must enter your current password and the new one twice. Each change generates an alert and, if your email is verified, a message as well.',
  },
  'notificaciones.con_pendientes': {
    es: 'Tiene {noLeidas} {palabra} de {total} en total. Puede verlos en Avisos y marcarlos como leídos.',
    en: 'You have {noLeidas} {palabra} out of {total} in total. You can see them in Alerts and mark them as read.',
  },
  'notificaciones.palabra.singular': {
    es: 'aviso sin leer',
    en: 'unread alert',
  },
  'notificaciones.palabra.plural': {
    es: 'avisos sin leer',
    en: 'unread alerts',
  },
  'notificaciones.sin_pendientes': {
    es: 'No tiene avisos sin leer. En total el banco le ha enviado {total}. Si activa los avisos del navegador, le llegarán en el momento en que ocurra la operación.',
    en: 'You have no unread alerts. In total the bank has sent you {total}. If you enable browser alerts, they will reach you the moment the operation happens.',
  },
  'notificaciones.publico': {
    es: 'El banco le avisa de cada operación de su cuenta desde la sección Avisos, y puede activar además las notificaciones del navegador para recibirlas al momento. Inicie sesión para consultar los suyos.',
    en: 'The bank notifies you of every operation on your account from the Alerts section, and you can also enable browser notifications to receive them instantly. Sign in to review yours.',
  },
  retiro_deposito: {
    es: 'Los retiros y depósitos en efectivo se realizan en el cajero automático con su tarjeta y su PIN. El cajero indica los montos permitidos y entrega comprobante. Desde el portal puede consultar el resultado en Movimientos.',
    en: 'Cash withdrawals and deposits are made at the ATM with your card and PIN. The ATM shows the allowed amounts and issues a receipt. From the portal you can check the result in Transactions.',
  },
  atm: {
    es: 'En el cajero puede consultar saldo, retirar, depositar, transferir, pagar servicios, cambiar su PIN, administrar su tarjeta y consultar o pagar sus préstamos. Necesita su tarjeta y su PIN.',
    en: 'At the ATM you can check your balance, withdraw, deposit, transfer, pay bills, change your PIN, manage your card and review or pay your loans. You need your card and your PIN.',
  },
  seguridad: {
    es: 'Banco ATM nunca le pedirá su contraseña ni su PIN por teléfono, correo o WhatsApp. Si alguien se los pide, es un fraude aunque conozca sus datos. Ante cualquier duda, bloquee su tarjeta desde el portal y cambie su contraseña: ninguna de las dos acciones tiene costo.',
    en: 'Banco ATM will never ask for your password or your PIN by phone, email or WhatsApp. If someone asks for them, it is fraud even if they know your details. When in doubt, block your card from the portal and change your password: neither action has any cost.',
  },
  contacto: {
    es: 'Atención a clientes está disponible las 24 horas en el 56 2972 7628. Desde la página principal puede abrir el canal de contacto, elegir el motivo y enviarnos un mensaje por WhatsApp con el asunto ya preparado.',
    en: 'Customer service is available 24 hours a day at 56 2972 7628. From the home page you can open the contact channel, choose the reason and send us a WhatsApp message with the subject already prepared.',
  },
  idioma: {
    es: 'Puede cambiar el idioma con el selector ES/EN de la barra superior. El portal se traduce al momento, sin recargar, y su elección queda guardada para la próxima visita.',
    en: 'You can change the language with the ES/EN selector in the top bar. The portal is translated instantly, without reloading, and your choice is saved for your next visit.',
  },
  accesibilidad: {
    es: 'En el botón Accesibilidad de la barra superior puede activar alto contraste, aumentar el tamaño del texto, reducir el movimiento, facilitar la lectura, reforzar el foco del teclado y atenuar las distracciones. Sus ajustes quedan guardados en este dispositivo.',
    en: 'In the Accessibility button of the top bar you can enable high contrast, increase text size, reduce motion, ease reading, reinforce keyboard focus and dim distractions. Your settings are saved on this device.',
  },
  cuenta_apertura: {
    es: 'Para abrir una cuenta, use la opción Crear cuenta de la página de acceso: capture su nombre, correo, teléfono y contraseña. Le enviaremos un código de verificación de 6 dígitos al correo y, al confirmarlo, el banco genera automáticamente su cuenta y su tarjeta de débito.',
    en: 'To open an account, use the Create account option on the sign-in page: enter your name, email, phone number and password. We will send a 6-digit verification code to your email and, once you confirm it, the bank automatically creates your account and your debit card.',
  },
  servicios_banco: {
    es: 'Banco ATM ofrece cuentas de depósito, tarjetas de débito y de crédito en cuatro niveles, transferencias entre cuentas del banco, pago de servicios, préstamos personales y operaciones en cajero automático. Todo se opera desde la banca en línea, el cajero o la app móvil.',
    en: 'Banco ATM offers deposit accounts, debit and credit cards in four tiers, transfers between bank accounts, bill payments, personal loans and ATM operations. Everything is handled from online banking, the ATM or the mobile app.',
  },
  admin_usuarios: {
    es: 'En Usuarios puede dar de alta un cliente con su cuenta y tarjeta, editar sus datos, cambiar su perfil entre Cliente y Administrador y eliminar la cuenta de un cliente. No es posible asignar un perfil a un usuario que aún no ha verificado su correo, y todo cambio queda en auditoría.',
    en: 'In Users you can register a client with their account and card, edit their details, switch their profile between Client and Administrator and delete a client account. You cannot assign a profile to a user who has not yet verified their email, and every change is recorded in the audit log.',
  },
  admin_auditoria: {
    es: 'En Auditoría encontrará cada operación registrada con su acción, canal, usuario y fecha. Puede filtrar y descargar la bitácora.',
    en: 'In the Audit log you will find every recorded operation with its action, channel, user and date. You can filter and download the log.',
  },
  admin_reportes: {
    es: 'En Reportes verá el resumen de operaciones del banco por tipo y por canal, con opción de descarga.',
    en: 'In Reports you will see the summary of bank operations by type and channel, with a download option.',
  },
  'tipo.RETIRO': { es: 'retiro', en: 'withdrawal' },
  'tipo.DEPOSITO': { es: 'depósito', en: 'deposit' },
  'tipo.TRANSFERENCIA': { es: 'transferencia', en: 'transfer' },
  'tipo.PAGO_SERVICIO': { es: 'pago de servicio', en: 'bill payment' },
  'tipo.PRESTAMO': { es: 'préstamo', en: 'loan' },
  'tipo.PAGO_PRESTAMO': { es: 'pago de préstamo', en: 'loan payment' },
};

export function normalizarIdioma(valor?: string): IdiomaAsistente {
  const limpio = String(valor ?? '')
    .trim()
    .toLowerCase()
    .split('-')[0];
  return limpio === 'en' ? 'en' : 'es';
}

export function texto(
  clave: string,
  idioma: IdiomaAsistente,
  parametros: Parametros = {},
): string {
  const entrada = TEXTOS[clave];
  if (!entrada) {
    return clave;
  }

  return Object.keys(parametros).reduce(
    (acumulado, nombre) =>
      acumulado.split(`{${nombre}}`).join(String(parametros[nombre])),
    entrada[idioma],
  );
}
