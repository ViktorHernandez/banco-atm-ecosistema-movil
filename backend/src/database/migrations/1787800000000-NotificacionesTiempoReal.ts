import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificacionesTiempoReal1787800000000
  implements MigrationInterface
{
  name = 'NotificacionesTiempoReal1787800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
         CREATE TYPE "public"."notificaciones_categoria_enum" AS ENUM('GENERAL', 'MOVIMIENTO', 'TARJETA', 'PRESTAMO', 'SEGURIDAD', 'PERFIL');
       EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `ALTER TABLE "notificaciones" ADD COLUMN IF NOT EXISTS "categoria" "public"."notificaciones_categoria_enum" NOT NULL DEFAULT 'GENERAL'`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificaciones" ADD COLUMN IF NOT EXISTS "leida" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificaciones" ADD COLUMN IF NOT EXISTS "leidaEn" TIMESTAMP WITH TIME ZONE`,
    );

    await queryRunner.query(
      `UPDATE "notificaciones"
       SET "leida" = true, "leidaEn" = "creadaEn"
       WHERE "creadaEn" < now() - INTERVAL '1 day'`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notificaciones_cuenta_leida"
         ON "notificaciones" ("cuenta_id", "leida")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_notificaciones_cuenta_leida"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificaciones" DROP COLUMN IF EXISTS "leidaEn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificaciones" DROP COLUMN IF EXISTS "leida"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notificaciones" DROP COLUMN IF EXISTS "categoria"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."notificaciones_categoria_enum"`,
    );
  }
}
