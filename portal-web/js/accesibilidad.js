(function () {
  'use strict';

  var CLAVE = 'portal.accesibilidad';

  var OPCIONES = [
    {
      clave: 'contraste',
      atributo: 'data-contraste',
      etiqueta: 'Alto contraste',
      descripcion:
        'Aumenta la diferencia entre el texto y el fondo. Útil con baja visión o con reflejos en la pantalla.',
      tipo: 'interruptor',
      valorActivo: 'alto',
    },
    {
      clave: 'texto',
      atributo: 'data-texto',
      etiqueta: 'Tamaño del texto',
      descripcion:
        'Amplía el texto y los controles sin romper la disposición de la página.',
      tipo: 'escala',
      valores: [
        { valor: 'normal', etiqueta: 'Normal', ayuda: '100 %' },
        { valor: 'grande', etiqueta: 'Grande', ayuda: '115 %' },
        { valor: 'mayor', etiqueta: 'Mayor', ayuda: '130 %' },
        { valor: 'maximo', etiqueta: 'Máximo', ayuda: '150 %' },
      ],
      porDefecto: 'normal',
    },
    {
      clave: 'movimiento',
      atributo: 'data-movimiento',
      etiqueta: 'Reducir movimiento',
      descripcion:
        'Desactiva animaciones y transiciones. Ayuda con mareo, migraña o dificultad de concentración.',
      tipo: 'interruptor',
      valorActivo: 'reducido',
    },
    {
      clave: 'lectura',
      atributo: 'data-lectura',
      etiqueta: 'Lectura facilitada',
      descripcion:
        'Aumenta el espacio entre letras, palabras y líneas. Pensado para dislexia y fatiga visual.',
      tipo: 'interruptor',
      valorActivo: 'facilitada',
    },
    {
      clave: 'foco',
      atributo: 'data-foco',
      etiqueta: 'Foco reforzado',
      descripcion:
        'Marca con un borde grueso el elemento seleccionado al navegar con el teclado.',
      tipo: 'interruptor',
      valorActivo: 'reforzado',
    },
    {
      clave: 'enfasis',
      atributo: 'data-enfasis',
      etiqueta: 'Menos distracciones',
      descripcion:
        'Atenúa fondos decorativos y degradados para dejar el contenido en primer plano.',
      tipo: 'interruptor',
      valorActivo: 'sobrio',
    },
  ];

  function leer() {
    try {
      var crudo = window.localStorage.getItem(CLAVE);
      return crudo ? JSON.parse(crudo) : {};
    } catch (error) {
      return {};
    }
  }

  function guardar(preferencias) {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(preferencias));
    } catch (error) {
      return;
    }
  }

  var preferencias = leer();

  function prefiereSistema(consulta) {
    try {
      return window.matchMedia && window.matchMedia(consulta).matches;
    } catch (error) {
      return false;
    }
  }

  function aplicar() {
    var raiz = document.documentElement;

    OPCIONES.forEach(function (opcion) {
      var valor = preferencias[opcion.clave];

      if (opcion.tipo === 'escala') {
        raiz.setAttribute(opcion.atributo, valor || opcion.porDefecto);
        return;
      }

      if (valor) {
        raiz.setAttribute(opcion.atributo, opcion.valorActivo);
      } else {
        raiz.removeAttribute(opcion.atributo);
      }
    });
  }

  function definir(clave, valor) {
    preferencias[clave] = valor;
    guardar(preferencias);
    aplicar();
  }

  function activas() {
    return OPCIONES.filter(function (opcion) {
      if (opcion.tipo === 'escala') {
        return (
          preferencias[opcion.clave] &&
          preferencias[opcion.clave] !== opcion.porDefecto
        );
      }
      return Boolean(preferencias[opcion.clave]);
    }).length;
  }

  function iniciarPreferenciasDelSistema() {
    if (preferencias.movimiento === undefined && prefiereSistema('(prefers-reduced-motion: reduce)')) {
      preferencias.movimiento = true;
    }
    if (preferencias.contraste === undefined && prefiereSistema('(prefers-contrast: more)')) {
      preferencias.contraste = true;
    }
    aplicar();
  }

  function construirPanel() {
    var util = window.PortalUtil;

    var contenido = document.createElement('div');
    contenido.className = 'accesibilidad';

    var intro = document.createElement('p');
    intro.className = 'texto-tenue';
    intro.textContent =
      'Estos ajustes se guardan en este dispositivo y se aplican a todo el portal.';
    contenido.appendChild(intro);

    OPCIONES.forEach(function (opcion) {
      var bloque = document.createElement('div');
      bloque.className = 'accesibilidad__opcion';

      if (opcion.tipo === 'escala') {
        var titulo = document.createElement('span');
        titulo.className = 'accesibilidad__etiqueta';
        titulo.id = 'ax-' + opcion.clave;
        titulo.textContent = opcion.etiqueta;

        var ayuda = document.createElement('span');
        ayuda.className = 'accesibilidad__ayuda';
        ayuda.textContent = opcion.descripcion;

        var grupo = document.createElement('div');
        grupo.className = 'accesibilidad__escala';
        grupo.setAttribute('role', 'radiogroup');
        grupo.setAttribute('aria-labelledby', titulo.id);

        opcion.valores.forEach(function (item) {
          var boton = document.createElement('button');
          boton.type = 'button';
          boton.className = 'accesibilidad__paso';
          boton.setAttribute('role', 'radio');
          boton.textContent = item.etiqueta;
          boton.setAttribute(
            'aria-label',
            item.etiqueta + ', ' + item.ayuda,
          );

          function pintar() {
            var elegido =
              (preferencias[opcion.clave] || opcion.porDefecto) === item.valor;
            boton.setAttribute('aria-checked', elegido ? 'true' : 'false');
            boton.classList.toggle('activa', elegido);
          }

          boton.addEventListener('click', function () {
            definir(opcion.clave, item.valor);
            util.nodos('.accesibilidad__paso', grupo).forEach(function (otro) {
              otro.dispatchEvent(new CustomEvent('repintar'));
            });
          });

          boton.addEventListener('repintar', pintar);
          pintar();
          grupo.appendChild(boton);
        });

        bloque.appendChild(titulo);
        bloque.appendChild(ayuda);
        bloque.appendChild(grupo);
        contenido.appendChild(bloque);
        return;
      }

      var id = 'ax-' + opcion.clave;
      var etiqueta = document.createElement('label');
      etiqueta.className = 'accesibilidad__interruptor';
      etiqueta.setAttribute('for', id);

      var casilla = document.createElement('input');
      casilla.type = 'checkbox';
      casilla.id = id;
      casilla.checked = Boolean(preferencias[opcion.clave]);
      casilla.setAttribute('aria-describedby', id + '-ayuda');
      casilla.addEventListener('change', function () {
        definir(opcion.clave, casilla.checked);
      });

      var textos = document.createElement('span');
      var nombre = document.createElement('span');
      nombre.className = 'accesibilidad__etiqueta';
      nombre.textContent = opcion.etiqueta;
      var descripcion = document.createElement('span');
      descripcion.className = 'accesibilidad__ayuda';
      descripcion.id = id + '-ayuda';
      descripcion.textContent = opcion.descripcion;

      textos.appendChild(nombre);
      textos.appendChild(descripcion);
      etiqueta.appendChild(casilla);
      etiqueta.appendChild(textos);
      bloque.appendChild(etiqueta);
      contenido.appendChild(bloque);
    });

    var atajos = document.createElement('div');
    atajos.className = 'accesibilidad__atajos';
    atajos.innerHTML =
      '<span class="accesibilidad__etiqueta">Navegación con teclado</span>' +
      '<ul><li><kbd>Tab</kbd> avanza entre controles</li>' +
      '<li><kbd>Mayús</kbd> + <kbd>Tab</kbd> retrocede</li>' +
      '<li><kbd>Entrar</kbd> o <kbd>Espacio</kbd> activa</li>' +
      '<li><kbd>Esc</kbd> cierra las ventanas emergentes</li></ul>';
    contenido.appendChild(atajos);

    return contenido;
  }

  function abrirPanel() {
    var util = window.PortalUtil;
    util.abrirModal({
      titulo: 'Accesibilidad',
      contenido: construirPanel(),
      botones: [
        {
          texto: 'Restablecer',
          clase: 'boton--secundario',
          cerrar: false,
          accion: function (capa) {
            preferencias = {};
            guardar(preferencias);
            aplicar();
            if (capa.parentNode) {
              capa.parentNode.removeChild(capa);
            }
            util.avisar('Ajustes de accesibilidad restablecidos.', 'exito');
            actualizarBotones();
          },
        },
        { texto: 'Listo', clase: 'boton' },
      ],
    });
  }

  function actualizarBotones() {
    var total = activas();
    var util = window.PortalUtil;
    util.nodos('[data-accesibilidad]').forEach(function (boton) {
      boton.setAttribute(
        'aria-label',
        total > 0
          ? 'Accesibilidad, ' + total + ' ajustes activos'
          : 'Accesibilidad',
      );
      boton.classList.toggle('activa', total > 0);
    });
  }

  function montarBoton(destino) {
    if (!destino || destino.querySelector('[data-accesibilidad]')) {
      return;
    }

    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'boton-accesibilidad';
    boton.setAttribute('data-accesibilidad', 'true');
    boton.setAttribute('aria-label', 'Accesibilidad');
    boton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="4" r="2"/>' +
      '<path d="M3.5 8.5h17M12 6.5v7m0 0l-3.5 8m3.5-8l3.5 8"/></svg>' +
      '<span class="boton-accesibilidad__texto">Accesibilidad</span>';
    boton.addEventListener('click', abrirPanel);
    destino.appendChild(boton);
    actualizarBotones();
  }

  window.PortalAccesibilidad = {
    aplicar: aplicar,
    abrirPanel: abrirPanel,
    montarBoton: montarBoton,
    preferencias: function () {
      return JSON.parse(JSON.stringify(preferencias));
    },
    definir: definir,
    opciones: OPCIONES,
  };

  iniciarPreferenciasDelSistema();

  document.addEventListener('DOMContentLoaded', function () {
    aplicar();
    montarBoton(
      document.querySelector('.superior__acciones') ||
        document.querySelector('.cabecera__interior'),
    );
  });
})();
