import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApartadosYDispositivos1788300000000 implements MigrationInterface {
  name = 'ApartadosYDispositivos1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."transacciones_tipo_enum" ADD VALUE IF NOT EXISTS 'APARTADO_ABONO'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."transacciones_tipo_enum" ADD VALUE IF NOT EXISTS 'APARTADO_RETIRO'`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "apartados" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(60) NOT NULL,
        "monto" numeric(14,2) NOT NULL DEFAULT '0',
        "metaMonto" numeric(14,2),
        "icono" character varying(30) NOT NULL DEFAULT 'ahorro',
        "activo" boolean NOT NULL DEFAULT true,
        "cuenta_id" uuid,
        "creadoEn" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "actualizadoEn" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_apartados_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "apartados" DROP CONSTRAINT IF EXISTS "FK_apartados_cuenta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "apartados" ADD CONSTRAINT "FK_apartados_cuenta"
       FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_apartados_cuenta" ON "apartados" ("cuenta_id")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "dispositivos_push" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying(255) NOT NULL,
        "plataforma" character varying(20) NOT NULL DEFAULT 'android',
        "idioma" character varying(5) NOT NULL DEFAULT 'es',
        "modelo" character varying(80),
        "activo" boolean NOT NULL DEFAULT true,
        "usuario_id" uuid,
        "cuenta_id" uuid,
        "creadoEn" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "actualizadoEn" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_dispositivos_push_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_dispositivos_push_token" UNIQUE ("token")
      )`,
    );

    await queryRunner.query(
      `ALTER TABLE "dispositivos_push" DROP CONSTRAINT IF EXISTS "FK_dispositivos_push_usuario"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispositivos_push" ADD CONSTRAINT "FK_dispositivos_push_usuario"
       FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "dispositivos_push" DROP CONSTRAINT IF EXISTS "FK_dispositivos_push_cuenta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "dispositivos_push" ADD CONSTRAINT "FK_dispositivos_push_cuenta"
       FOREIGN KEY ("cuenta_id") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_dispositivos_push_cuenta" ON "dispositivos_push" ("cuenta_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "dispositivos_push"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "apartados"`);
  }
}
