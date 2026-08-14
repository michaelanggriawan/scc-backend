import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAddonOrder1786541266210 implements MigrationInterface {
    name = 'AddAddonOrder1786541266210'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "addons" ADD "order" integer NOT NULL DEFAULT 0`);
        // Backfill existing rows so the visible order doesn't jump around on
        // deploy: preserve the same sequence the old createdAt-DESC sort produced.
        await queryRunner.query(`
            UPDATE "addons" a
            SET "order" = sub.rn
            FROM (
                SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) - 1 AS rn
                FROM "addons"
            ) sub
            WHERE a.id = sub.id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "addons" DROP COLUMN "order"`);
    }

}
