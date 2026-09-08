import { MigrationInterface, QueryRunner } from 'typeorm';

export class PagosPrestamos1787700000000 implements MigrationInterface {
  name = 'PagosPrestamos1787700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."transacciones_tipo_enum" ADD VALUE IF NOT EXISTS 'PAGO_PRESTAMO'`,
    );

    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD COLUMN IF NOT EXISTS "capitalPendiente" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD COLUMN IF NOT EXISTS "totalPagado" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD COLUMN IF NOT EXISTS "interesesPagados" numeric(14,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD COLUMN IF NOT EXISTS "pagosRealizados" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" ADD COLUMN IF NOT EXISTS "proximoPagoEn" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `UPDATE "prestamos"
       SET "capitalPendiente" = "monto",
           "proximoPagoEn" = "creadoEn" + INTERVAL '30 days'
       WHERE "estado" = 'APROBADO' AND "capitalPendiente" = 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP COLUMN IF EXISTS "proximoPagoEn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP COLUMN IF EXISTS "pagosRealizados"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP COLUMN IF EXISTS "interesesPagados"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP COLUMN IF EXISTS "totalPagado"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP COLUMN IF EXISTS "capitalPendiente"`,
    );
  }
}
