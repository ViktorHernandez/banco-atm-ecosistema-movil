import { MigrationInterface, QueryRunner } from 'typeorm';

export class FechasConZonaHoraria1787300000000 implements MigrationInterface {
  name = 'FechasConZonaHoraria1787300000000';

  private static readonly COLUMNAS: Array<[string, string]> = [
    ['usuarios', 'creadoEn'],
    ['cuentas', 'creadaEn'],
    ['tarjetas', 'emitidaEn'],
    ['transacciones', 'fecha'],
    ['notificaciones', 'creadaEn'],
    ['registros_auditoria', 'fecha'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [tabla, columna] of FechasConZonaHoraria1787300000000.COLUMNAS) {
      await queryRunner.query(
        `ALTER TABLE "${tabla}" ALTER COLUMN "${columna}" TYPE TIMESTAMP WITH TIME ZONE USING "${columna}" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tabla}" ALTER COLUMN "${columna}" SET DEFAULT now()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [tabla, columna] of FechasConZonaHoraria1787300000000.COLUMNAS) {
      await queryRunner.query(
        `ALTER TABLE "${tabla}" ALTER COLUMN "${columna}" TYPE TIMESTAMP WITHOUT TIME ZONE USING "${columna}" AT TIME ZONE 'UTC'`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tabla}" ALTER COLUMN "${columna}" SET DEFAULT now()`,
      );
    }
  }
}
