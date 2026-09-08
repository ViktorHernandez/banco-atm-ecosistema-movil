import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AssistantService } from './assistant.service';
import { AccountsService } from '../accounts/accounts.service';
import { CardsService } from '../cards/cards.service';
import { LoansService } from '../loans/loans.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RolUsuario } from '../users/enums/rol-usuario.enum';
import { TEXTOS } from './data/textos-asistente';
import { INTENCIONES } from './data/base-conocimiento';

const ACENTOS = /[áéíóúñ¿¡]/i;
const PALABRAS_ES =
  /\b(el|la|los|las|una|para|con|sin|por|que|su|sus|del|desde|puede|tiene|cuenta|saldo|tarjeta|banco|correo)\b/i;

describe('AssistantService', () => {
  let servicio: AssistantService;

  const accounts = {
    saldo: jest.fn(),
    movimientos: jest.fn(),
  };
  const cards = {
    listarPropias: jest.fn(),
    catalogoCredito: jest.fn(),
  };
  const loans = {
    listarPendientes: jest.fn(),
    condiciones: jest.fn(),
  };
  const notifications = {
    resumen: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantService,
        { provide: AccountsService, useValue: accounts },
        { provide: CardsService, useValue: cards },
        { provide: LoansService, useValue: loans },
        { provide: NotificationsService, useValue: notifications },
        {
          provide: ConfigService,
          useValue: { get: () => 'America/Mexico_City' },
        },
      ],
    }).compile();

    servicio = modulo.get<AssistantService>(AssistantService);
  });

  describe('catalogo bilingue', () => {
    it('define cada texto en espanol y en ingles', () => {
      const incompletos = Object.keys(TEXTOS).filter(
        (clave) => !TEXTOS[clave].es || !TEXTOS[clave].en,
      );
      expect(incompletos).toEqual([]);
    });

    it('no deja texto en ingles con residuos en espanol', () => {
      const sospechosos = Object.keys(TEXTOS).filter((clave) => {
        if (clave.startsWith('tarjetas.catalogo')) {
          return false;
        }
        const valor = TEXTOS[clave].en
          .replace(/\{[^}]+\}/g, ' ')
          .replace(/Banco ATM/g, ' ');
        return ACENTOS.test(valor) || PALABRAS_ES.test(valor);
      });
      expect(sospechosos).toEqual([]);
    });

    it('resuelve todas las claves de accion y sugerencia de las intenciones', () => {
      const faltantes: string[] = [];
      INTENCIONES.forEach((intencion) => {
        (intencion.acciones ?? []).forEach((accion) => {
          if (!TEXTOS[accion.clave]) {
            faltantes.push(accion.clave);
          }
        });
        (intencion.sugerencias ?? []).forEach((clave) => {
          if (!TEXTOS[clave]) {
            faltantes.push(clave);
          }
        });
      });
      expect(faltantes).toEqual([]);
    });
  });

  describe('respuestas segun idioma', () => {
    it('responde el saldo en espanol con formato es-MX', async () => {
      accounts.saldo.mockResolvedValue({
        saldo: 1234.5,
        numeroCuenta: '**** 0001',
      });

      const resultado = await servicio.responder(
        { cuentaId: 'cuenta-1', rol: RolUsuario.CLIENTE, idioma: 'es' },
        '¿cuál es mi saldo?',
      );

      expect(resultado.idioma).toBe('es');
      expect(resultado.respuesta).toContain('Su saldo disponible');
      expect(resultado.respuesta).toContain('**** 0001');
    });

    it('responde el saldo completamente en ingles', async () => {
      accounts.saldo.mockResolvedValue({
        saldo: 1234.5,
        numeroCuenta: '**** 0001',
      });

      const resultado = await servicio.responder(
        { cuentaId: 'cuenta-1', rol: RolUsuario.CLIENTE, idioma: 'en' },
        'what is my balance',
      );

      expect(resultado.idioma).toBe('en');
      expect(resultado.respuesta).toContain('Your available balance');
      expect(resultado.respuesta).not.toMatch(ACENTOS);
      expect(resultado.respuesta).toContain('**** 0001');
    });

    it('traduce las etiquetas de las acciones', async () => {
      accounts.saldo.mockResolvedValue({ saldo: 10, numeroCuenta: '1' });

      const espanol = await servicio.responder(
        { cuentaId: 'c', rol: RolUsuario.CLIENTE, idioma: 'es' },
        'saldo',
      );
      const ingles = await servicio.responder(
        { cuentaId: 'c', rol: RolUsuario.CLIENTE, idioma: 'en' },
        'balance',
      );

      expect(espanol.acciones[0].etiqueta).toBe('Ver mis cuentas');
      expect(ingles.acciones[0].etiqueta).toBe('View my accounts');
      expect(ingles.acciones[0].ruta).toBe(espanol.acciones[0].ruta);
    });

    it('conserva los datos reales sin traducirlos', async () => {
      loans.listarPendientes.mockResolvedValue([
        {
          folio: 'PRE-2026-0007',
          montoLiquidacion: 5000,
          pagoMinimo: 500,
          proximoPagoEn: '2026-09-01T00:00:00.000Z',
          pagosRealizados: 2,
          plazoMeses: 12,
        },
      ]);

      const resultado = await servicio.responder(
        { cuentaId: 'c', rol: RolUsuario.CLIENTE, idioma: 'en' },
        'do i have any loans',
      );

      expect(resultado.respuesta).toContain('PRE-2026-0007');
    });

    it('usa el formato de fecha del idioma solicitado', async () => {
      accounts.movimientos.mockResolvedValue([
        {
          fecha: '2026-03-15T12:00:00.000Z',
          tipo: 'TRANSFERENCIA',
          monto: 100,
        },
      ]);

      const espanol = await servicio.responder(
        { cuentaId: 'c', rol: RolUsuario.CLIENTE, idioma: 'es' },
        'movimientos',
      );
      const ingles = await servicio.responder(
        { cuentaId: 'c', rol: RolUsuario.CLIENTE, idioma: 'en' },
        'my transactions',
      );

      expect(espanol.respuesta).toContain('marzo');
      expect(ingles.respuesta).toContain('March');
      expect(ingles.respuesta).toContain('transfer');
    });

    it('toma espanol cuando el idioma es desconocido o falta', async () => {
      const resultado = await servicio.responder(
        { rol: RolUsuario.CLIENTE, idioma: 'fr' },
        'hola',
      );
      expect(resultado.idioma).toBe('es');
    });
  });

  describe('asistente publico', () => {
    it('responde preguntas generales sin sesion', async () => {
      const resultado = await servicio.responder(
        { publico: true, idioma: 'es' },
        '¿cómo abro una cuenta?',
      );

      expect(resultado.intencion).toBe('cuenta_apertura');
      expect(resultado.requiereSesion).toBe(false);
      expect(resultado.respuesta).toContain('Crear cuenta');
    });

    it('responde preguntas generales en ingles sin sesion', async () => {
      const resultado = await servicio.responder(
        { publico: true, idioma: 'en' },
        'is online banking safe',
      );

      expect(resultado.intencion).toBe('seguridad');
      expect(resultado.respuesta).not.toMatch(ACENTOS);
    });

    it('no consulta datos privados y pide iniciar sesion', async () => {
      const resultado = await servicio.responder(
        { publico: true, idioma: 'es' },
        '¿cuál es mi saldo?',
      );

      expect(accounts.saldo).not.toHaveBeenCalled();
      expect(resultado.requiereSesion).toBe(true);
      expect(resultado.acciones[0].ruta).toBe('/login');
    });

    it('no consulta datos privados aunque pregunten por movimientos', async () => {
      const resultado = await servicio.responder(
        { publico: true, idioma: 'en' },
        'my transaction history',
      );

      expect(accounts.movimientos).not.toHaveBeenCalled();
      expect(resultado.requiereSesion).toBe(true);
      expect(resultado.respuesta).not.toMatch(ACENTOS);
    });

    it('nunca alcanza intenciones administrativas', async () => {
      const resultado = await servicio.responder(
        { publico: true, idioma: 'es' },
        'auditoria',
      );

      expect(resultado.intencion).not.toBe('admin_auditoria');
    });
  });

  describe('sesion autenticada', () => {
    it('conserva las capacidades del cliente', async () => {
      const resultado = await servicio.responder(
        { cuentaId: 'c', rol: RolUsuario.CLIENTE, idioma: 'es' },
        'que puedes hacer',
      );

      expect(resultado.respuesta).toContain('saldo, movimientos');
    });

    it('mantiene el alcance administrativo', async () => {
      const resultado = await servicio.responder(
        { rol: RolUsuario.ADMINISTRADOR, idioma: 'en' },
        'audit log',
      );

      expect(resultado.intencion).toBe('admin_auditoria');
      expect(resultado.respuesta).not.toMatch(ACENTOS);
    });

    it('avisa cuando la sesion no tiene cuenta asociada', async () => {
      const resultado = await servicio.responder(
        { rol: RolUsuario.CLIENTE, idioma: 'en' },
        'what is my balance',
      );

      expect(resultado.requiereCuenta).toBe(true);
      expect(accounts.saldo).not.toHaveBeenCalled();
    });

    it('devuelve un error traducido cuando falla la consulta', async () => {
      accounts.saldo.mockRejectedValue(new Error('sin conexion'));

      const resultado = await servicio.responder(
        { cuentaId: 'c', rol: RolUsuario.CLIENTE, idioma: 'en' },
        'my balance',
      );

      expect(resultado.respuesta).toContain('could not look that up');
    });
  });
});
