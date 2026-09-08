import { config } from 'dotenv';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/typeorm.datasource';
import { Usuario } from '../../modules/users/entities/usuario.entity';
import { RolUsuario } from '../../modules/users/enums/rol-usuario.enum';
import { Cuenta } from '../../modules/accounts/entities/cuenta.entity';
import { Tarjeta } from '../../modules/cards/entities/tarjeta.entity';
import { EstadoTarjeta } from '../../modules/cards/enums/estado-tarjeta.enum';
import { TipoTarjeta } from '../../modules/cards/enums/tipo-tarjeta.enum';
import { calcularVigencia, generarCvv } from '../../common/utils/tarjeta.util';

config();

interface DatosCliente {
  nombreCompleto: string;
  correo: string;
  telefono: string;
  password: string;
  numeroCuenta: string;
  saldo: number;
  numeroTarjeta: string;
  pin: string;
  cuentaDePrueba: boolean;
}

const CLIENTES: DatosCliente[] = [
  {
    nombreCompleto: 'Mariana Robles Cadena',
    correo: 'mariana.robles@bancoatm.test',
    telefono: '55 4821 9037',
    password: 'Cliente123!',
    numeroCuenta: '1000000001',
    saldo: 5000,
    numeroTarjeta: '4000000000000001',
    pin: '1234',
    cuentaDePrueba: true,
  },
  {
    nombreCompleto: 'Esteban Quintero Lara',
    correo: 'esteban.quintero@bancoatm.test',
    telefono: '55 7390 2648',
    password: 'Cliente123!',
    numeroCuenta: '1000000002',
    saldo: 3000,
    numeroTarjeta: '4000000000000002',
    pin: '5678',
    cuentaDePrueba: true,
  },
  {
    nombreCompleto: 'Viktor Hernandez',
    correo: 'viktorrhv24@gmail.com',
    telefono: '56 2972 7628',
    password: 'Viktor123!',
    numeroCuenta: '1000000004',
    saldo: 60000,
    numeroTarjeta: '4000000000000004',
    pin: '2468',
    cuentaDePrueba: false,
  },
];

const ADMINISTRADOR = {
  nombreCompleto: 'Rodrigo Alcántara Vega',
  correo: 'rodrigo.alcantara@bancoatm.test',
  telefono: '55 1204 8856',
  password: 'Admin123!',
};

async function seed() {
  await AppDataSource.initialize();

  const usuarioRepository = AppDataSource.getRepository(Usuario);
  const cuentaRepository = AppDataSource.getRepository(Cuenta);
  const tarjetaRepository = AppDataSource.getRepository(Tarjeta);

  let administrador = await usuarioRepository.findOne({
    where: { correo: ADMINISTRADOR.correo },
  });

  if (!administrador) {
    administrador = usuarioRepository.create({
      nombreCompleto: ADMINISTRADOR.nombreCompleto,
      correo: ADMINISTRADOR.correo,
      telefono: ADMINISTRADOR.telefono,
      passwordHash: await bcrypt.hash(ADMINISTRADOR.password, 10),
      rol: RolUsuario.ADMINISTRADOR,
      correoVerificado: true,
    });
    await usuarioRepository.save(administrador);
    console.log(`  + administrador ${ADMINISTRADOR.correo}`);
  } else {
    administrador.nombreCompleto = ADMINISTRADOR.nombreCompleto;
    administrador.telefono = ADMINISTRADOR.telefono;
    administrador.rol = RolUsuario.ADMINISTRADOR;
    administrador.correoVerificado = true;
    administrador.passwordHash = await bcrypt.hash(ADMINISTRADOR.password, 10);
    await usuarioRepository.save(administrador);
    console.log(`  = administrador ${ADMINISTRADOR.correo} (datos reafirmados)`);
  }

  for (const datos of CLIENTES) {
    let usuario = await usuarioRepository.findOne({
      where: { correo: datos.correo },
    });

    if (!usuario) {
      usuario = usuarioRepository.create({
        nombreCompleto: datos.nombreCompleto,
        correo: datos.correo,
        telefono: datos.telefono,
        passwordHash: await bcrypt.hash(datos.password, 10),
        rol: RolUsuario.CLIENTE,
        correoVerificado: true,
      });
      await usuarioRepository.save(usuario);
      console.log(`  + cliente ${datos.correo}`);
    } else {
      usuario.nombreCompleto = datos.nombreCompleto;
      usuario.telefono = datos.telefono;
      usuario.correoVerificado = true;
      usuario.passwordHash = await bcrypt.hash(datos.password, 10);
      await usuarioRepository.save(usuario);
      console.log(`  = cliente ${datos.correo} (datos reafirmados)`);
    }

    let cuenta = await cuentaRepository.findOne({
      where: { numeroCuenta: datos.numeroCuenta },
      relations: { usuario: true },
    });

    if (!cuenta) {
      cuenta = cuentaRepository.create({
        numeroCuenta: datos.numeroCuenta,
        saldo: datos.saldo,
        usuario,
      });
      await cuentaRepository.save(cuenta);
      console.log(`      cuenta ${datos.numeroCuenta} creada`);
    } else if (!cuenta.usuario || cuenta.usuario.id !== usuario.id) {
      cuenta.usuario = usuario;
      await cuentaRepository.save(cuenta);
      console.log(`      cuenta ${datos.numeroCuenta} reasignada a ${datos.correo}`);
    }

    const tarjeta = await tarjetaRepository.findOne({
      where: { numeroTarjeta: datos.numeroTarjeta },
      relations: { cuenta: true },
    });

    if (!tarjeta) {
      await tarjetaRepository.save(
        tarjetaRepository.create({
          numeroTarjeta: datos.numeroTarjeta,
          pinHash: await bcrypt.hash(datos.pin, 10),
          cvv: generarCvv(),
          expiraEn: calcularVigencia(),
          estado: EstadoTarjeta.ACTIVA,
          intentosFallidos: 0,
          tipo: TipoTarjeta.DEBITO,
          cuenta,
        }),
      );
      console.log(`      tarjeta ${datos.numeroTarjeta} emitida`);
    } else if (!tarjeta.cuenta || tarjeta.cuenta.id !== cuenta.id) {
      tarjeta.cuenta = cuenta;
      await tarjetaRepository.save(tarjeta);
      console.log(`      tarjeta ${datos.numeroTarjeta} reasignada`);
    }
  }

  console.log('\nSeed completado.');
  console.log('\nCuentas publicadas en el portal como "Cuentas de prueba":');
  CLIENTES.filter((cliente) => cliente.cuentaDePrueba).forEach((cliente) => {
    console.log(`  - ${cliente.nombreCompleto} · ${cliente.correo} · ${cliente.password}`);
  });
  console.log(`  - ${ADMINISTRADOR.nombreCompleto} · ${ADMINISTRADOR.correo} · ${ADMINISTRADOR.password}`);
  console.log('\nCuenta reservada para probar el envio de correo (no publicada):');
  CLIENTES.filter((cliente) => !cliente.cuentaDePrueba).forEach((cliente) => {
    console.log(`  - ${cliente.nombreCompleto} · ${cliente.correo} · ${cliente.password}`);
  });

  await AppDataSource.destroy();
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
