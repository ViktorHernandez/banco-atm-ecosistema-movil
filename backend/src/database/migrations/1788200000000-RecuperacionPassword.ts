import { MigrationInterface, QueryRunner } from 'typeorm';

export class RecuperacionPassword1788200000000 implements MigrationInterface {
  name = 'RecuperacionPassword1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "recuperacionHash" varchar(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "recuperacionExpira" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "recuperacionSolicitadaEn" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "idioma" varchar(5) NOT NULL DEFAULT 'es'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "idioma"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "recuperacionSolicitadaEn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "recuperacionExpira"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "recuperacionHash"`,
    );
  }
}
