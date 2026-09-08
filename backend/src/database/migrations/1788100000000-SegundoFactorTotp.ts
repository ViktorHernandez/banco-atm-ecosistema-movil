import { MigrationInterface, QueryRunner } from 'typeorm';

export class SegundoFactorTotp1788100000000 implements MigrationInterface {
  name = 'SegundoFactorTotp1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "totpSecreto" varchar(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "totpActivo" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "totpActivadoEn" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "totpCodigosRecuperacion" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "totpCodigosRecuperacion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "totpActivadoEn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "totpActivo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuarios" DROP COLUMN IF EXISTS "totpSecreto"`,
    );
  }
}
