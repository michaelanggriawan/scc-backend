import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1786515689042 implements MigrationInterface {
    name = 'InitSchema1786515689042'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payment_proofs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inquiryId" uuid NOT NULL, "fileUrl" character varying NOT NULL, "fileName" character varying NOT NULL DEFAULT '', "fileSize" integer NOT NULL DEFAULT '0', "mimeType" character varying NOT NULL DEFAULT '', "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_fdea03d16d4d7450e41c94e1622" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payment_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "inquiryId" uuid NOT NULL, "expiresAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5b176ff8200166713c53d6c3ada" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ae28e08aca9172ee5b822bf83b" ON "payment_links" ("token") `);
        await queryRunner.query(`CREATE TABLE "inquiries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ref" character varying NOT NULL, "customerName" character varying NOT NULL DEFAULT '', "customerEmail" character varying NOT NULL DEFAULT '', "customerPhone" character varying NOT NULL DEFAULT '', "customerId" uuid, "roomId" uuid, "addonIds" text, "date" character varying NOT NULL DEFAULT '', "time" character varying NOT NULL DEFAULT '', "duration" character varying NOT NULL DEFAULT '', "category" character varying NOT NULL DEFAULT '', "notes" text NOT NULL DEFAULT '', "status" character varying NOT NULL DEFAULT 'New Inquiry', "agreedPrice" bigint, "paymentDueDate" character varying, "adminNotes" text NOT NULL DEFAULT '', "rejectionReason" text NOT NULL DEFAULT '', "rejectionCount" integer NOT NULL DEFAULT '0', "cancelledBy" character varying, "cancelReason" text NOT NULL DEFAULT '', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ceacaa439988b25eb9459e694d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dbb76b2ecaaeec4b15ccec8027" ON "inquiries" ("ref") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "fullName" character varying NOT NULL DEFAULT '', "phone" character varying NOT NULL DEFAULT '', "company" character varying NOT NULL DEFAULT '', "role" character varying NOT NULL DEFAULT 'customer', "passwordChangedAt" TIMESTAMP, "resetToken" character varying, "resetTokenExpiresAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL DEFAULT '', "capacity" character varying NOT NULL DEFAULT '', "area" character varying NOT NULL DEFAULT '', "status" character varying NOT NULL DEFAULT 'Active', "description" text NOT NULL DEFAULT '', "facilities" text, "specs" text, "photos" text, "floorPlans" text, "specPdfUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0368a2d7c215f2d0458a54933f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "addons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL DEFAULT '', "description" text NOT NULL DEFAULT '', "status" character varying NOT NULL DEFAULT 'Active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cd49fb3dc0558f02cb6fe6cc138" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "settings" ("key" character varying NOT NULL, "value" text, "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c8639b7626fa94ba8265628f214" PRIMARY KEY ("key"))`);
        await queryRunner.query(`ALTER TABLE "payment_proofs" ADD CONSTRAINT "FK_efcff8ec8b5a028b0c4ecbe2d4c" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payment_links" ADD CONSTRAINT "FK_07d5eb59ffaebd458450bb5f779" FOREIGN KEY ("inquiryId") REFERENCES "inquiries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inquiries" ADD CONSTRAINT "FK_0a47d2adb25c4495b139c6dd654" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inquiries" DROP CONSTRAINT "FK_0a47d2adb25c4495b139c6dd654"`);
        await queryRunner.query(`ALTER TABLE "payment_links" DROP CONSTRAINT "FK_07d5eb59ffaebd458450bb5f779"`);
        await queryRunner.query(`ALTER TABLE "payment_proofs" DROP CONSTRAINT "FK_efcff8ec8b5a028b0c4ecbe2d4c"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP TABLE "addons"`);
        await queryRunner.query(`DROP TABLE "rooms"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dbb76b2ecaaeec4b15ccec8027"`);
        await queryRunner.query(`DROP TABLE "inquiries"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae28e08aca9172ee5b822bf83b"`);
        await queryRunner.query(`DROP TABLE "payment_links"`);
        await queryRunner.query(`DROP TABLE "payment_proofs"`);
    }

}
