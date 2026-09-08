import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { Usuario } from '../users/entities/usuario.entity';
import { Cuenta } from '../accounts/entities/cuenta.entity';
import { Transaccion } from '../transactions/entities/transaccion.entity';
import { RolUsuario } from '../users/enums/rol-usuario.enum';

describe('AdminService', () => {
  let servicio: AdminService;

  const usuarioRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };
  const cuentaRepository = { find: jest.fn(), count: jest.fn() };
  const transaccionRepository = { find: jest.fn() };
  const auditService = { registrar: jest.fn() };
  const notificationsService = { registrar: jest.fn() };
  const mailService = { cuentaEliminada: jest.fn(), cambioDePerfil: jest.fn() };
  const consultas: string[] = [];
  const manager = {
    update: jest.fn(),
    query: jest.fn(async (sentencia: string, ...resto: unknown[]) => {
      void resto;
      consultas.push(sentencia.replace(/\s+/g, ' ').trim());
      return [[], 1];
    }),
  };
  const dataSource = {
    transaction: jest.fn(async (fn: (m: unknown) => Promise<unknown>) =>
      fn(manager),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    consultas.length = 0;
    manager.query.mockImplementation(async (sentencia: string) => {
      consultas.push(sentencia.replace(/\s+/g, ' ').trim());
      return [[], 1];
    });

    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepository },
        { provide: getRepositoryToken(Cuenta), useValue: cuentaRepository },
        {
          provide: getRepositoryToken(Transaccion),
          useValue: transaccionRepository,
        },
        { provide: AuditService, useValue: auditService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: MailService, useValue: mailService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    servicio = modulo.get<AdminService>(AdminService);
  });

  describe('listarUsuarios', () => {
    it('solo consulta usuarios activos', async () => {
      usuarioRepository.find.mockResolvedValue([]);
      cuentaRepository.find.mockResolvedValue([]);

      await servicio.listarUsuarios();

      expect(usuarioRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { activo: true } }),
      );
    });

    it('no toma cuentas de usuarios dados de baja', async () => {
      usuarioRepository.find.mockResolvedValue([]);
      cuentaRepository.find.mockResolvedValue([]);

      await servicio.listarUsuarios();

      expect(cuentaRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuario: { activo: true } } }),
      );
    });
  });

  describe('reporteOperaciones', () => {
    beforeEach(() => {
      transaccionRepository.find.mockResolvedValue([]);
      usuarioRepository.count.mockResolvedValue(6);
      cuentaRepository.count.mockResolvedValue(4);
    });

    it('cuenta solo usuarios activos', async () => {
      await servicio.reporteOperaciones();

      expect(usuarioRepository.count).toHaveBeenCalledWith({
        where: { activo: true },
      });
    });

    it('cuenta solo cuentas de usuarios activos', async () => {
      await servicio.reporteOperaciones();

      expect(cuentaRepository.count).toHaveBeenCalledWith({
        where: { usuario: { activo: true } },
      });
    });

    it('devuelve los totales filtrados', async () => {
      const reporte = await servicio.reporteOperaciones();

      expect(reporte.totales.usuarios).toBe(6);
      expect(reporte.totales.cuentas).toBe(4);
    });
  });

  describe('eliminarCliente', () => {
    const cliente = {
      id: 'cliente-1',
      correo: 'cliente@example.test',
      nombreCompleto: 'Cliente Uno',
      rol: RolUsuario.CLIENTE,
      activo: true,
    };

    beforeEach(() => {
      mailService.cuentaEliminada.mockResolvedValue(true);
    });

    it('elimina fisicamente al usuario', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([{ id: 'cuenta-1' }]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      expect(
        consultas.some((c) => /DELETE FROM usuarios/i.test(c)),
      ).toBe(true);
    });

    it('elimina tarjetas, prestamos y avisos de la cuenta', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([{ id: 'cuenta-1' }]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      ['tarjetas', 'prestamos', 'notificaciones', 'cuentas'].forEach(
        (tabla) => {
          expect(
            consultas.some((c) =>
              new RegExp(`DELETE FROM ${tabla}`, 'i').test(c),
            ),
          ).toBe(true);
        },
      );
    });

    it('desvincula las transacciones compartidas en lugar de borrarlas', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([{ id: 'cuenta-1' }]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      expect(
        consultas.some((c) =>
          /UPDATE transacciones SET cuenta_origen_id = NULL/i.test(c),
        ),
      ).toBe(true);
      expect(
        consultas.some((c) =>
          /UPDATE transacciones SET cuenta_destino_id = NULL/i.test(c),
        ),
      ).toBe(true);
    });

    it('conserva la auditoria desvinculando al usuario', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      expect(
        consultas.some((c) =>
          /UPDATE registros_auditoria SET usuario_id = NULL/i.test(c),
        ),
      ).toBe(true);
      expect(
        consultas.some((c) => /DELETE FROM registros_auditoria/i.test(c)),
      ).toBe(false);
    });

    it('avisa al correo original antes de borrar la fila', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([]);

      const orden: string[] = [];
      mailService.cuentaEliminada.mockImplementation(async () => {
        orden.push('correo');
        return true;
      });
      manager.query.mockImplementation(async (sentencia: string) => {
        orden.push('sql');
        consultas.push(sentencia.replace(/\s+/g, ' ').trim());
        return [[], 1];
      });

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      expect(mailService.cuentaEliminada).toHaveBeenCalledWith(
        'cliente@example.test',
        'Cliente Uno',
      );
      expect(orden[0]).toBe('correo');
    });

    it('elimina la cuenta aunque falle el envio del correo', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([]);
      mailService.cuentaEliminada.mockRejectedValue(new Error('sin proveedor'));

      const resultado = await servicio.eliminarCliente('cliente-1', 'admin-1');

      expect(resultado.eliminado).toBe(true);
      expect(resultado.avisoEnviado).toBe(false);
      expect(
        consultas.some((c) => /DELETE FROM usuarios/i.test(c)),
      ).toBe(true);
    });

    it('registra la eliminacion en auditoria', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      expect(auditService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'USUARIO_ELIMINADO' }),
      );
    });

    it('usa nombres de columna reales, no propiedades de la entidad', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([{ id: 'cuenta-1' }]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      const auditoria = consultas.filter((c) =>
        /registros_auditoria/i.test(c),
      );
      expect(auditoria.length).toBeGreaterThan(0);
      auditoria.forEach((sentencia) => {
        expect(sentencia).toContain('usuario_id');
        expect(sentencia).not.toMatch(/SET usuario =/i);
      });
    });

    it('no invoca el constructor de consultas con nombres de columna', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([{ id: 'cuenta-1' }]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      expect(manager.update).not.toHaveBeenCalled();
      expect(manager.query).toHaveBeenCalled();
    });

    it('parametriza los identificadores en lugar de interpolarlos', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([{ id: 'cuenta-1' }]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      consultas.forEach((sentencia) => {
        expect(sentencia).not.toContain('cuenta-1');
        expect(sentencia).not.toContain('cliente-1');
      });
      (manager.query.mock.calls as unknown[][]).forEach((llamada) => {
        if (/\$1/.test(String(llamada[0]))) {
          expect(Array.isArray(llamada[1])).toBe(true);
        }
      });
    });

    it('elimina en el orden que respeta las claves foraneas', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([{ id: 'cuenta-1' }]);

      await servicio.eliminarCliente('cliente-1', 'admin-1');

      const indice = (patron: RegExp) =>
        consultas.findIndex((c) => patron.test(c));

      const tarjetas = indice(/DELETE FROM tarjetas/i);
      const prestamos = indice(/DELETE FROM prestamos/i);
      const cuentas = indice(/DELETE FROM cuentas/i);
      const usuarios = indice(/DELETE FROM usuarios/i);

      expect(tarjetas).toBeLessThan(cuentas);
      expect(prestamos).toBeLessThan(cuentas);
      expect(cuentas).toBeLessThan(usuarios);
    });

    it('devuelve el resumen de lo eliminado', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...cliente });
      cuentaRepository.find.mockResolvedValue([{ id: 'cuenta-1' }]);

      const resultado = await servicio.eliminarCliente('cliente-1', 'admin-1');

      expect(resultado.eliminado).toBe(true);
      expect(resultado.cuentasEliminadas).toBe(1);
      expect(typeof resultado.tarjetasEliminadas).toBe('number');
    });

    it('no permite dar de baja a un administrador', async () => {
      usuarioRepository.findOne.mockResolvedValue({
        ...cliente,
        rol: RolUsuario.ADMINISTRADOR,
      });

      await expect(
        servicio.eliminarCliente('cliente-1', 'admin-1'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
