# Portal web bancario

Canal web del ecosistema Banco ATM. Corresponde al **Equipo 3 — Portal web** y
consume la misma API bancaria que el cajero automático, sin lógica de negocio
propia.

## Ejecución

```bash
npm start
```

Queda en `http://localhost:5501`. El puerto se puede cambiar con la variable
`PORTAL_PORT`. El backend debe estar corriendo y su `CORS_ORIGIN` debe incluir
`http://localhost:5501`.

## Tecnología

HTML, CSS y JavaScript sin framework ni etapa de compilación, igual que el
cajero. Esto mantiene la decisión de arquitectura ya documentada, permite
desplegarlo como sitio estático y evita que el portal introduzca dependencias que
el resto del proyecto no tiene.

## Estructura

```
index.html            Sitio público e inicio de sesión
portal.html           Portal privado (cliente y administrador)
config.js             URL de la API, identidad del banco y tiempos de sesión
css/base.css          Tokens de diseño y componentes compartidos
css/publico.css       Estilos del sitio público
css/portal.css        Estilos del portal privado
js/api.js             Cliente HTTP de la API bancaria y manejo de la sesión
js/util.js            Formato de importes y fechas, avisos, modales, CSV
js/publico.js         Comportamiento del inicio de sesión
js/portal.js          Sesión, navegación por rol y enrutado por hash
js/vistas-cliente.js  Vistas del perfil Cliente
js/vistas-admin.js    Vistas del perfil Administrador
```

## Trazabilidad con el Product Backlog

| Vista                | Historia            | Requisito      | Endpoints                                                              |
| -------------------- | ------------------- | -------------- | ---------------------------------------------------------------------- |
| Acceso al portal     | HU-PW-01 / HU-PW-05 | RF-01 / RF-15  | `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`                |
| Resumen y cuentas    | HU-PW-02            | RF-02          | `GET /accounts`, `GET /accounts/me`, `GET /accounts/me/saldo`          |
| Movimientos          | HU-PW-02            | RF-03          | `GET /accounts/me/movimientos`, `GET /transactions/:id/comprobante`    |
| Transferencias       | HU-PW-03            | RF-04          | `GET /transactions/limites`, `POST /transactions/transferencia`        |
| Pago de servicios    | HU-BE-05            | RF-05          | `GET /services/catalogo`, `POST /transactions/pago-servicio`           |
| Mi tarjeta           | HU-PW-04            | RF-06 / RF-07  | `GET /cards/me`, `POST /cards/me/bloquear`, `POST /cards/me/desbloquear` |
| Avisos               | HU-BE-07            | RF-08          | `GET /notifications/me`                                                |
| Usuarios (admin)     | HU-PW-06            | RF-16          | `GET/POST/PATCH /admin/usuarios`                                        |
| Tarjetas (admin)     | HU-PW-08            | RF-18          | `GET /admin/tarjetas`, `PATCH /admin/tarjetas/:id/estado`              |
| Reportes (admin)     | HU-PW-07            | RF-17          | `GET /admin/reportes/operaciones`                                      |
| Auditoría (admin)    | HU-BE-08            | RF-19          | `GET /admin/auditoria`                                                  |

El pago de servicios y los avisos no tienen una HU-PW propia en el backlog: se
apoyan en HU-BE-05 y HU-BE-07, que el backend ya expone para todos los canales,
igual que se hizo al ampliar la épica del ATM.

## Separación entre Cliente y Administrador

El rol viaja dentro del token que emite el backend. El portal construye el menú
lateral a partir de ese rol y, si alguien escribe a mano una ruta que no le
corresponde, lo devuelve a su sección inicial. La restricción real la aplica el
backend con su guard de roles: las rutas `/admin/**` responden 403 a cualquier
sesión que no sea de administrador, así que ocultar el menú es comodidad de uso,
no el control de acceso.

## Sesión

El token de acceso vive en `sessionStorage`, se descarta al cerrar la pestaña y
la barra superior muestra el tiempo real que le queda, leído del propio token.
La sesión termina de tres formas: al vencer el token, tras el periodo de
inactividad definido en `config.js`, o cuando la API responde 401.
