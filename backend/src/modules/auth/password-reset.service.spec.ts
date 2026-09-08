import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PasswordResetService } from './password-reset.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { Usuario } from '../users/entities/usuario.entity';

describe('PasswordResetService', () => {
  let servicio: PasswordResetService;
  let usuario: Record<string, unknown> | null;

  const usuarioRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (valor) => valor),
  };
  const mailService = {
    recuperacionPassword: jest.fn().mockResolvedValue(true),
    cambioDePerfil: jest.fn().mockResolvedValue(true),
  };
  const auditService = { registrar: jest.fn() };

  const codigoEnviado = () =>
    mailService.recuperacionPassword.mock.calls[0][2] as string;

  beforeEach(async () => {
    jest.clearAllMocks();

    usuario = {
      id: 'usuario-1',
      correo: 'cliente@example.test',
      nombreCompleto: 'Cliente Uno',
      passwordHash: 'hash-anterior',
      activo: true,
      correoVerificado: true,
      idioma: 'es',
      recuperacionHash: null,
      recuperacionExpira: null,
      recuperacionSolicitadaEn: null,
    };

    usuarioRepository.findOne.mockImplementation(async () => usuario);

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepository },
        { provide: MailService, useValue: mailService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    servicio = modulo.get<PasswordResetService>(PasswordResetService);
  });

  describe('solicitar', () => {
    it('envia un codigo de seis digitos', async () => {
      await servicio.solicitar('cliente@example.test');

      expect(mailService.recuperacionPassword).toHaveBeenCalled();
      expect(codigoEnviado()).toMatch(/^\d{6}$/);
    });

    it('guarda el codigo hasheado, nunca en texto plano', async () => {
      await servicio.solicitar('cliente@example.test');

      expect(usuario?.recuperacionHash).not.toBe(codigoEnviado());
      expect(String(usuario?.recuperacionHash).startsWith('$2')).toBe(true);
    });

    it('fija una expiracion futura', async () => {
      await servicio.solicitar('cliente@example.test');

      const expira = new Date(usuario?.recuperacionExpira as Date).getTime();
      expect(expira).toBeGreaterThan(Date.now());
    });

    it('no revela si el correo existe', async () => {
      const conCuenta = await servicio.solicitar('cliente@example.test');
      jest.clearAllMocks();
      usuario = null;
      const sinCuenta = await servicio.solicitar('desconocido@example.test');

      expect(sinCuenta).toEqual(conCuenta);
      expect(mailService.recuperacionPassword).not.toHaveBeenCalled();
    });

    it('no envia codigo a una cuenta eliminada', async () => {
      usuario = { ...(usuario as object), activo: false };

      await servicio.solicitar('cliente@example.test');

      expect(mailService.recuperacionPassword).not.toHaveBeenCalled();
    });

    it('no envia codigo si el correo no esta verificado', async () => {
      usuario = { ...(usuario as object), correoVerificado: false };

      await servicio.solicitar('cliente@example.test');

      expect(mailService.recuperacionPassword).not.toHaveBeenCalled();
    });

    it('limita solicitudes seguidas del mismo correo', async () => {
      usuario = {
        ...(usuario as object),
        recuperacionSolicitadaEn: new Date(),
      };

      await servicio.solicitar('cliente@example.test');

      expect(mailService.recuperacionPassword).not.toHaveBeenCalled();
    });

    it('permite una nueva solicitud pasado el intervalo', async () => {
      usuario = {
        ...(usuario as object),
        recuperacionSolicitadaEn: new Date(Date.now() - 5 * 60 * 1000),
      };

      await servicio.solicitar('cliente@example.test');

      expect(mailService.recuperacionPassword).toHaveBeenCalled();
    });

    it('normaliza el correo antes de buscarlo', async () => {
      await servicio.solicitar('  CLIENTE@Example.Test  ');

      expect(usuarioRepository.findOne).toHaveBeenCalledWith({
        where: { correo: 'cliente@example.test' },
      });
    });

    it('usa el idioma solicitado para el correo', async () => {
      await servicio.solicitar('cliente@example.test', 'en');

      expect(mailService.recuperacionPassword.mock.calls[0][4]).toBe('en');
    });

    it('conserva el idioma del usuario si no se envia otro', async () => {
      usuario = { ...(usuario as object), idioma: 'en' };

      await servicio.solicitar('cliente@example.test');

      expect(mailService.recuperacionPassword.mock.calls[0][4]).toBe('en');
    });
  });

  describe('restablecer', () => {
    async function prepararCodigo(codigo = '123456', minutos = 30) {
      usuario = {
        ...(usuario as object),
        recuperacionHash: await bcrypt.hash(codigo, 10),
        recuperacionExpira: new Date(Date.now() + minutos * 60 * 1000),
      };
      return codigo;
    }

    it('cambia la contrasena con un codigo valido', async () => {
      const codigo = await prepararCodigo();

      const resultado = await servicio.restablecer(
        'cliente@example.test',
        codigo,
        'NuevaClave123!',
      );

      expect(resultado.restablecido).toBe(true);
      expect(
        await bcrypt.compare(
          'NuevaClave123!',
          String(usuario?.passwordHash),
        ),
      ).toBe(true);
    });

    it('invalida el codigo despues de usarlo', async () => {
      const codigo = await prepararCodigo();

      await servicio.restablecer('cliente@example.test', codigo, 'Clave12345!');

      expect(usuario?.recuperacionHash).toBeNull();
      expect(usuario?.recuperacionExpira).toBeNull();
    });

    it('impide reutilizar el mismo codigo', async () => {
      const codigo = await prepararCodigo();

      await servicio.restablecer('cliente@example.test', codigo, 'Clave12345!');

      await expect(
        servicio.restablecer('cliente@example.test', codigo, 'Otra12345!'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un codigo expirado', async () => {
      const codigo = await prepararCodigo('123456', -1);

      await expect(
        servicio.restablecer('cliente@example.test', codigo, 'Clave12345!'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('limpia el codigo expirado al detectarlo', async () => {
      const codigo = await prepararCodigo('123456', -1);

      await servicio
        .restablecer('cliente@example.test', codigo, 'Clave12345!')
        .catch(() => undefined);

      expect(usuario?.recuperacionHash).toBeNull();
    });

    it('rechaza un codigo incorrecto', async () => {
      await prepararCodigo('123456');

      await expect(
        servicio.restablecer('cliente@example.test', '999999', 'Clave12345!'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usuario?.passwordHash).toBe('hash-anterior');
    });

    it('rechaza si no hay recuperacion en curso', async () => {
      await expect(
        servicio.restablecer('cliente@example.test', '123456', 'Clave12345!'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza a una cuenta eliminada', async () => {
      await prepararCodigo();
      usuario = { ...(usuario as object), activo: false };

      await expect(
        servicio.restablecer('cliente@example.test', '123456', 'Clave12345!'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('avisa por correo del cambio', async () => {
      const codigo = await prepararCodigo();

      await servicio.restablecer('cliente@example.test', codigo, 'Clave12345!');

      expect(mailService.cambioDePerfil).toHaveBeenCalled();
    });

    it('registra el cambio en auditoria', async () => {
      const codigo = await prepararCodigo();

      await servicio.restablecer('cliente@example.test', codigo, 'Clave12345!');

      expect(auditService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'RECUPERACION_COMPLETADA' }),
      );
    });
  });
});
