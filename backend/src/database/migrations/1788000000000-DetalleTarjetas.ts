import { MigrationInterface, QueryRunner } from 'typeorm';

export class DetalleTarjetas1788000000000 implements MigrationInterface {
  name = 'DetalleTarjetas1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tarjetas" ADD COLUMN IF NOT EXISTS "cvv" varchar(4)`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" ADD COLUMN IF NOT EXISTS "expiraEn" date`,
    );

    await queryRunner.query(
      `UPDATE "tarjetas"
       SET "cvv" = LPAD((FLOOR(RANDOM() * 1000))::int::text, 3, '0')
       WHERE "cvv" IS NULL`,
    );

    await queryRunner.query(
      `UPDATE "tarjetas"
       SET "expiraEn" = (DATE_TRUNC('month', "emitidaEn") + INTERVAL '4 years' - INTERVAL '1 day')::date
       WHERE "expiraEn" IS NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "tarjetas" ALTER COLUMN "cvv" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" ALTER COLUMN "expiraEn" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "expiraEn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tarjetas" DROP COLUMN IF EXISTS "cvv"`,
    );
  }
}
