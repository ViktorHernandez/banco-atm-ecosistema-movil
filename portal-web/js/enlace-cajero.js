(function () {
  'use strict';

  function aplicar() {
    var config = window.PORTAL_CONFIG || {};

    if (!config.atmUrl) {
      return;
    }

    var enlaces = document.querySelectorAll(
      '#enlaceCajero, #enlaceCajeroPie, #enlaceCajeroApp',
    );

    for (var i = 0; i < enlaces.length; i += 1) {
      enlaces[i].href = config.atmUrl;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicar);
  } else {
    aplicar();
  }
})();
