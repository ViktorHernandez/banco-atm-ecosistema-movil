import { MigrationInterface, QueryRunner } from 'typeorm';

interface Equivalencia {
  correoAnterior: string;
  correoNuevo: string;
  nombre: string;
  telefono: string;
}

const EQUIVALENCIAS: Equivalencia[] = [
  {
    correoAnterior: 'cliente.a@bancoatm.test',
    correoNuevo: 'mariana.robles@bancoatm.test',
    nombre: 'Mariana Robles Cadena',
    telefono: '55 4821 9037',
  },
  {
    correoAnterior: 'cliente.b@bancoatm.test',
    correoNuevo: 'esteban.quintero@bancoatm.test',
    nombre: 'Esteban Quintero Lara',
    telefono: '55 7390 2648',
  },
  {
    correoAnterior: 'admin@bancoatm.test',
    correoNuevo: 'rodrigo.alcantara@bancoatm.test',
    nombre: 'Rodrigo Alcántara Vega',
    telefono: '55 1204 8856',
  },
];

export class UnificarCuentasDemo1787600000000 implements MigrationInterface {
  name = 'UnificarCuentasDemo1787600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const equivalencia of EQUIVALENCIAS) {
      const anterior = await queryRunner.query(
        `SELECT "id" FROM "usuarios" WHERE "correo" = $1`,
        [equivalencia.correoAnterior],
      );

      if (anterior.length === 0) {
        continue;
      }

      const idAnterior = anterior[0].id;

      const nuevo = await queryRunner.query(
        `SELECT "id" FROM "usuarios" WHERE "correo" = $1`,
        [equivalencia.correoNuevo],
      );

      let superviviente = idAnterior;

      if (nuevo.length > 0 && nuevo[0].id !== idAnterior) {
        const idNuevo = nuevo[0].id;

        const cuentasAnterior = await queryRunner.query(
          `SELECT count(*)::int AS total FROM "cuentas" WHERE "usuario_id" = $1`,
          [idAnterior],
        );
        const cuentasNuevo = await queryRunner.query(
          `SELECT count(*)::int AS total FROM "cuentas" WHERE "usuario_id" = $1`,
          [idNuevo],
        );

        superviviente =
          cuentasNuevo[0].total > cuentasAnterior[0].total ? idNuevo : idAnterior;
        const descartado = superviviente === idAnterior ? idNuevo : idAnterior;

        await queryRunner.query(
          `UPDATE "registros_auditoria" SET "usuario_id" = $1 WHERE "usuario_id" = $2`,
          [superviviente, descartado],
        );

        await queryRunner.query(
          `UPDATE "cuentas" SET "usuario_id" = $1 WHERE "usuario_id" = $2`,
          [superviviente, descartado],
        );

        await queryRunner.query(`DELETE FROM "usuarios" WHERE "id" = $1`, [
          descartado,
        ]);
      }

      await queryRunner.query(
        `UPDATE "usuarios"
         SET "correo" = $1, "nombreCompleto" = $2,
             "telefono" = COALESCE("telefono", $3),
             "correoVerificado" = true
         WHERE "id" = $4`,
        [
          equivalencia.correoNuevo,
          equivalencia.nombre,
          equivalencia.telefono,
          superviviente,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const equivalencia of EQUIVALENCIAS) {
      await queryRunner.query(
        `UPDATE "usuarios" SET "correo" = $1 WHERE "correo" = $2`,
        [equivalencia.correoAnterior, equivalencia.correoNuevo],
      );
    }
  }
}
