import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { TotpService } from './totp.service';
import { AuditService } from '../audit/audit.service';
import { Usuario } from '../users/entities/usuario.entity';
import { generarCodigo } from '../../common/utils/totp.util';

describe('TotpService', () => {
  let servicio: TotpService;
  let usuario: Record<string, unknown>;

  const usuarioRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (valor) => valor),
  };
  const auditService = { registrar: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    usuario = {
      id: 'usuario-1',
      correo: 'cliente@example.test',
      passwordHash: await bcrypt.hash('Cliente123!', 10),
      totpSecreto: null,
      totpActivo: false,
      totpActivadoEn: null,
      totpCodigosRecuperacion: null,
    };

    usuarioRepository.findOne.mockImplementation(async () => usuario);

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        TotpService,
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepository },
        { provide: AuditService, useValue: auditService },
        {
          provide: ConfigService,
          useValue: {
            get: (clave: string) =>
              clave === 'TOTP_ENCRYPTION_KEY' ? 'clave-de-pruebas' : undefined,
          },
        },
      ],
    }).compile();

    servicio = modulo.get<TotpService>(TotpService);
  });

  describe('iniciar', () => {
    it('devuelve secreto, uri y codigo QR', async () => {
      const resultado = await servicio.iniciar('usuario-1');

      expect(resultado.secreto).toMatch(/^[A-Z2-7]{32}$/);
      expect(resultado.uri.startsWith('otpauth://totp/')).toBe(true);
      expect(resultado.qr.startsWith('data:image/png;base64,')).toBe(true);
    });

    it('guarda el secreto cifrado, nunca en claro', async () => {
      const resultado = await servicio.iniciar('usuario-1');

      expect(usuario.totpSecreto).not.toBe(resultado.secreto);
      expect(String(usuario.totpSecreto).split('.')).toHaveLength(3);
    });

    it('no activa el segundo factor todavia', async () => {
      await servicio.iniciar('usuario-1');
      expect(usuario.totpActivo).toBe(false);
    });

    it('rechaza reconfigurar si ya esta activo y el secreto es legible', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      await servicio.confirmar('usuario-1', generarCodigo(secreto));

      await expect(servicio.iniciar('usuario-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('falla si el usuario no existe', async () => {
      usuarioRepository.findOne.mockResolvedValue(null);

      await expect(servicio.iniciar('inexistente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('confirmar', () => {
    it('activa el segundo factor con un codigo valido', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      const resultado = await servicio.confirmar(
        'usuario-1',
        generarCodigo(secreto),
      );

      expect(resultado.activo).toBe(true);
      expect(usuario.totpActivo).toBe(true);
      expect(usuario.totpActivadoEn).toBeInstanceOf(Date);
    });

    it('entrega ocho codigos de recuperacion una sola vez', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      const resultado = await servicio.confirmar(
        'usuario-1',
        generarCodigo(secreto),
      );

      expect(resultado.codigosRecuperacion).toHaveLength(8);
      resultado.codigosRecuperacion.forEach((codigo) => {
        expect(codigo).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
      });
    });

    it('almacena los codigos de recuperacion hasheados', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      const resultado = await servicio.confirmar(
        'usuario-1',
        generarCodigo(secreto),
      );

      const guardados = JSON.parse(
        String(usuario.totpCodigosRecuperacion),
      ) as string[];

      expect(guardados).toHaveLength(8);
      guardados.forEach((hash) => {
        expect(resultado.codigosRecuperacion).not.toContain(hash);
        expect(hash.startsWith('$2')).toBe(true);
      });
    });

    it('rechaza un codigo incorrecto', async () => {
      await servicio.iniciar('usuario-1');

      await expect(
        servicio.confirmar('usuario-1', '000000'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usuario.totpActivo).toBe(false);
    });

    it('exige haber iniciado la configuracion', async () => {
      await expect(
        servicio.confirmar('usuario-1', '123456'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('registra la activacion en auditoria', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      await servicio.confirmar('usuario-1', generarCodigo(secreto));

      expect(auditService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'TOTP_ACTIVADO' }),
      );
    });
  });

  describe('verificarSegundoFactor', () => {
    it('deja pasar cuando el usuario no tiene segundo factor', async () => {
      const valido = await servicio.verificarSegundoFactor(
        usuario as never,
        '',
      );
      expect(valido).toBe(true);
    });

    it('acepta un codigo valido de la aplicacion', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      await servicio.confirmar('usuario-1', generarCodigo(secreto));

      const valido = await servicio.verificarSegundoFactor(
        usuario as never,
        generarCodigo(secreto),
      );
      expect(valido).toBe(true);
    });

    it('rechaza un codigo incorrecto', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      await servicio.confirmar('usuario-1', generarCodigo(secreto));

      expect(
        await servicio.verificarSegundoFactor(usuario as never, '000000'),
      ).toBe(false);
    });

    it('rechaza cuando no se envia codigo', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      await servicio.confirmar('usuario-1', generarCodigo(secreto));

      expect(await servicio.verificarSegundoFactor(usuario as never, '')).toBe(
        false,
      );
    });

    it('acepta un codigo de recuperacion', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      const { codigosRecuperacion } = await servicio.confirmar(
        'usuario-1',
        generarCodigo(secreto),
      );

      expect(
        await servicio.verificarSegundoFactor(
          usuario as never,
          codigosRecuperacion[0],
        ),
      ).toBe(true);
    });

    it('consume el codigo de recuperacion una sola vez', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      const { codigosRecuperacion } = await servicio.confirmar(
        'usuario-1',
        generarCodigo(secreto),
      );

      await servicio.verificarSegundoFactor(
        usuario as never,
        codigosRecuperacion[0],
      );

      expect(
        await servicio.verificarSegundoFactor(
          usuario as never,
          codigosRecuperacion[0],
        ),
      ).toBe(false);

      const restantes = JSON.parse(
        String(usuario.totpCodigosRecuperacion),
      ) as string[];
      expect(restantes).toHaveLength(7);
    });
  });

  describe('secreto cifrado con otra clave', () => {
    async function servicioConClave(clave: string): Promise<TotpService> {
      const modulo: TestingModule = await Test.createTestingModule({
        providers: [
          TotpService,
          { provide: getRepositoryToken(Usuario), useValue: usuarioRepository },
          { provide: AuditService, useValue: auditService },
          {
            provide: ConfigService,
            useValue: {
              get: (nombre: string) =>
                nombre === 'TOTP_ENCRYPTION_KEY' ? clave : undefined,
            },
          },
        ],
      }).compile();

      return modulo.get<TotpService>(TotpService);
    }

    async function vincularYRotar() {
      const original = await servicioConClave('clave-original');
      const { secreto } = await original.iniciar('usuario-1');
      const { codigosRecuperacion } = await original.confirmar(
        'usuario-1',
        generarCodigo(secreto),
      );
      return { secreto, codigosRecuperacion };
    }

    it('no lanza una excepcion sin controlar al verificar', async () => {
      const { secreto } = await vincularYRotar();
      const rotado = await servicioConClave('clave-distinta');

      await expect(
        rotado.verificarSegundoFactor(usuario as never, generarCodigo(secreto)),
      ).resolves.toBe(false);
    });

    it('sigue aceptando un codigo de recuperacion', async () => {
      const { codigosRecuperacion } = await vincularYRotar();
      const rotado = await servicioConClave('clave-distinta');

      await expect(
        rotado.verificarSegundoFactor(
          usuario as never,
          codigosRecuperacion[0],
        ),
      ).resolves.toBe(true);
    });

    it('informa que hace falta volver a vincular', async () => {
      await vincularYRotar();
      const rotado = await servicioConClave('clave-distinta');

      const estado = await rotado.estado('usuario-1');
      expect(estado.activo).toBe(true);
      expect(estado.requiereRevinculacion).toBe(true);
    });

    it('no marca revinculacion cuando la clave es la correcta', async () => {
      await vincularYRotar();
      const mismo = await servicioConClave('clave-original');

      const estado = await mismo.estado('usuario-1');
      expect(estado.requiereRevinculacion).toBe(false);
    });

    it('permite reconfigurar sin quedar bloqueado', async () => {
      await vincularYRotar();
      const rotado = await servicioConClave('clave-distinta');

      const nuevo = await rotado.iniciar('usuario-1');
      expect(nuevo.secreto).toMatch(/^[A-Z2-7]{32}$/);

      const confirmado = await rotado.confirmar(
        'usuario-1',
        generarCodigo(nuevo.secreto),
      );
      expect(confirmado.activo).toBe(true);
    });

    it('rechaza confirmar con un secreto pendiente ilegible', async () => {
      const original = await servicioConClave('clave-original');
      await original.iniciar('usuario-1');

      const rotado = await servicioConClave('clave-distinta');

      await expect(
        rotado.confirmar('usuario-1', '123456'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('desactivar', () => {
    beforeEach(async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      await servicio.confirmar('usuario-1', generarCodigo(secreto));
    });

    it('borra el secreto y los codigos al desactivar', async () => {
      await servicio.desactivar('usuario-1', 'Cliente123!');

      expect(usuario.totpActivo).toBe(false);
      expect(usuario.totpSecreto).toBeNull();
      expect(usuario.totpCodigosRecuperacion).toBeNull();
    });

    it('exige la contrasena correcta', async () => {
      await expect(
        servicio.desactivar('usuario-1', 'incorrecta'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usuario.totpActivo).toBe(true);
    });
  });

  describe('estado', () => {
    it('informa que no hay segundo factor al inicio', async () => {
      const estado = await servicio.estado('usuario-1');

      expect(estado.activo).toBe(false);
      expect(estado.configuracionPendiente).toBe(false);
    });

    it('detecta una configuracion iniciada sin confirmar', async () => {
      await servicio.iniciar('usuario-1');
      const estado = await servicio.estado('usuario-1');

      expect(estado.configuracionPendiente).toBe(true);
    });

    it('nunca expone el secreto', async () => {
      await servicio.iniciar('usuario-1');
      const estado = await servicio.estado('usuario-1');

      expect(JSON.stringify(estado)).not.toContain('totpSecreto');
      expect(Object.keys(estado)).not.toContain('secreto');
    });

    it('informa cuantos codigos de recuperacion quedan', async () => {
      const { secreto } = await servicio.iniciar('usuario-1');
      await servicio.confirmar('usuario-1', generarCodigo(secreto));

      const estado = await servicio.estado('usuario-1');
      expect(estado.codigosDisponibles).toBe(8);
    });
  });
});
