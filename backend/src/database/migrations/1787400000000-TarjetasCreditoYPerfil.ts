import { MigrationInterface, QueryRunner } from 'typeorm';

export class TarjetasCreditoYPerfil1787400000000 implements MigrationInterface {
  name = 'TarjetasCreditoYPerfil1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "telefono" character varying(25)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "correoVerificado" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "codigoVerificacion" character varying(12)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "codigoVerificacionExpira" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "public"."tarjetas_tipo_enum" AS ENUM('DEBITO', 'CREDITO');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "public"."tarjetas_nivel_enum" AS ENUM('CLASICA', 'ORO', 'PLATINO', 'INFINITE');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `ALTER TABLE "tarjetas" ADD COLUMN IF NOT EXISTS "tipo" "public"."tarjetas_tipo_enum" NOT NULL DEFAULT 'DEBITO'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" ADD COLUMN IF NOT EXISTS "nivel" "public"."tarjetas_nivel_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" ADD COLUMN IF NOT EXISTS "limiteCredito" numeric(14,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" ADD COLUMN IF NOT EXISTS "creditoUtilizado" numeric(14,2)`,
    );

    await queryRunner.query(
      `ALTER TABLE "tarjetas" DROP CONSTRAINT IF EXISTS "REL_5673fb6ddfcbfda3ba57e48b66"`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_tarjeta_debito_por_cuenta"
         ON "tarjetas" ("cuenta_id") WHERE "tipo" = 'DEBITO'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."UQ_tarjeta_debito_por_cuenta"`,
    );
    await queryRunner.query(
      `DELETE FROM "tarjetas" WHERE "tipo" = 'CREDITO'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" ADD CONSTRAINT "REL_5673fb6ddfcbfda3ba57e48b66" UNIQUE ("cuenta_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "creditoUtilizado"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "limiteCredito"`,
    );
    await queryRunner.query(`ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "nivel"`);
    await queryRunner.query(`ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "tipo"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tarjetas_nivel_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tarjetas_tipo_enum"`);

    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "codigoVerificacionExpira"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "codigoVerificacion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "correoVerificado"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "telefono"`,
    );
  }
}
