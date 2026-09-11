import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RolUsuario } from '../users/enums/rol-usuario.enum';
import { AuthService } from './auth.service';

describe('AuthService registro y credenciales', () => {
  const construir = (usuario: unknown) => {
    const usuarioRepository = {
      findOne: jest.fn().mockResolvedValue(usuario),
      create: jest.fn().mockImplementation((valor) => valor),
      save: jest.fn().mockImplementation((valor) => Promise.resolve(valor)),
    };
    const tarjetaRepository = { findOne: jest.fn(), save: jest.fn() };
    const cuentaRepository = { findOne: jest.fn().mockResolvedValue(null) };
    const jwtService = { signAsync: jest.fn().mockResolvedValue('token-firmado') };
    const auditService = { registrar: jest.fn().mockResolvedValue(undefined) };
    const notificationsService = { registrar: jest.fn().mockResolvedValue(undefined) };
    const mailService = {
      habilitado: true,
      codigoVerificacion: jest.fn().mockResolvedValue(true),
      avisoInicioSesion: jest.fn().mockResolvedValue(true),
    };
    const totpService = { verificarSegundoFactor: jest.fn().mockResolvedValue(true) };
    const onboardingService = {
      abrirCuentaSiNoExiste: jest.fn().mockResolvedValue({
        creada: false,
        cuenta: { id: 'cuenta-1', numeroCuenta: '2000000001' },
      }),
    };

    const service = new AuthService(
      tarjetaRepository as never,
      usuarioRepository as never,
      cuentaRepository as never,
      jwtService as never,
      auditService as never,
      notificationsService as never,
      mailService as never,
      totpService as never,
      onboardingService as never,
    );

    return { service, usuarioRepository, mailService, auditService };
  };

  const datosRegistro = {
    nombreCompleto: 'Cliente Nuevo',
    correo: 'smmy627@gmail.com',
    telefono: '5512345678',
    password: 'Password123',
  };

  it('no envia codigo cuando el correo ya pertenece a una cuenta verificada', async () => {
    const { service, mailService, usuarioRepository } = construir({
      id: 'usuario-1',
      correo: 'smmy627@gmail.com',
      nombreCompleto: 'John Connor',
      correoVerificado: true,
      activo: true,
    });

    const resultado = await service.registrar(datosRegistro);

    expect(resultado.registrado).toBe(false);
    expect(resultado.estadoCuenta).toBe('ACTIVA');
    expect(resultado.correo).toBe('smmy627@gmail.com');
    expect(mailService.codigoVerificacion).not.toHaveBeenCalled();
    expect(usuarioRepository.save).not.toHaveBeenCalled();
  });

  it('registra el intento duplicado en la auditoria', async () => {
    const { service, auditService } = construir({
      id: 'usuario-1',
      correo: 'smmy627@gmail.com',
      nombreCompleto: 'John Connor',
      correoVerificado: true,
      activo: true,
    });

    await service.registrar(datosRegistro);

    expect(auditService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'REGISTRO_CORREO_DUPLICADO' }),
    );
  });

  it('reenvia el codigo cuando la cuenta existe pero no esta verificada', async () => {
    const { service, mailService, usuarioRepository } = construir({
      id: 'usuario-2',
      correo: 'smmy627@gmail.com',
      nombreCompleto: 'John Connor',
      correoVerificado: false,
      activo: true,
    });

    const resultado = await service.registrar(datosRegistro);

    expect(resultado.registrado).toBe(true);
    expect(resultado.estadoCuenta).toBe('PENDIENTE');
    expect(mailService.codigoVerificacion).toHaveBeenCalled();
    expect(usuarioRepository.save).toHaveBeenCalled();
  });

  it('crea la cuenta y envia el codigo cuando el correo no existe', async () => {
    const { service, mailService, usuarioRepository } = construir(null);

    const resultado = await service.registrar({
      ...datosRegistro,
      correo: 'correo.nuevo@bancoatm.test',
    });

    expect(resultado.registrado).toBe(true);
    expect(resultado.estadoCuenta).toBe('PENDIENTE');
    expect(usuarioRepository.create).toHaveBeenCalled();
    expect(mailService.codigoVerificacion).toHaveBeenCalled();
  });

  it('rechaza el acceso cuando la contrasena no coincide', async () => {
    const passwordHash = await bcrypt.hash('Password123', 4);
    const { service } = construir({
      id: 'usuario-1',
      correo: 'smmy627@gmail.com',
      nombreCompleto: 'John Connor',
      passwordHash,
      correoVerificado: true,
      activo: true,
      rol: RolUsuario.CLIENTE,
      totpActivo: false,
    });

    await expect(
      service.login({ correo: 'smmy627@gmail.com', password: 'OtraClave999' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('emite token cuando la contrasena es correcta', async () => {
    const passwordHash = await bcrypt.hash('Password123', 4);
    const { service } = construir({
      id: 'usuario-1',
      correo: 'smmy627@gmail.com',
      nombreCompleto: 'John Connor',
      passwordHash,
      correoVerificado: true,
      activo: true,
      rol: RolUsuario.CLIENTE,
      totpActivo: false,
    });

    const resultado = await service.login({
      correo: 'smmy627@gmail.com',
      password: 'Password123',
    });

    expect(resultado.accessToken).toBe('token-firmado');
  });
});
