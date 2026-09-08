import { MigrationInterface, QueryRunner } from 'typeorm';

export class Prestamos1787500000000 implements MigrationInterface {
  name = 'Prestamos1787500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."transacciones_tipo_enum" ADD VALUE IF NOT EXISTS 'PRESTAMO'`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "public"."prestamos_estado_enum" AS ENUM('APROBADO', 'RECHAZADO', 'LIQUIDADO');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "public"."prestamos_canal_enum" AS ENUM('ATM', 'APP', 'WEB');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "public"."prestamos_nivelreferencia_enum" AS ENUM('CLASICA', 'ORO', 'PLATINO', 'INFINITE');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "prestamos" (
         "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
         "monto" numeric(14,2) NOT NULL,
         "plazoMeses" integer NOT NULL,
         "tasaAnual" numeric(5,2) NOT NULL,
         "pagoMensual" numeric(14,2) NOT NULL,
         "totalAPagar" numeric(14,2) NOT NULL,
         "estado" "public"."prestamos_estado_enum" NOT NULL,
         "nivelReferencia" "public"."prestamos_nivelreferencia_enum",
         "limiteAlSolicitar" numeric(14,2) NOT NULL,
         "canal" "public"."prestamos_canal_enum" NOT NULL,
         "motivoRechazo" character varying,
         "creadoEn" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
         "cuenta_id" uuid,
         CONSTRAINT "PK_prestamos_id" PRIMARY KEY ("id")
       )`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
         ALTER TABLE "prestamos"
           ADD CONSTRAINT "FK_prestamos_cuenta"
           FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id")
           ON DELETE NO ACTION ON UPDATE NO ACTION;
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_prestamos_cuenta" ON "prestamos" ("cuenta_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_prestamos_cuenta"`);
    await queryRunner.query(
      `ALTER TABLE "prestamos" DROP CONSTRAINT IF EXISTS "FK_prestamos_cuenta"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "prestamos"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."prestamos_nivelreferencia_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."prestamos_canal_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."prestamos_estado_enum"`);
  }
}
