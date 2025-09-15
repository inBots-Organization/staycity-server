/*
  Warnings:

  - Added the required column `provider` to the `devices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."devices" ADD COLUMN     "provider" VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE INDEX "devices_provider_externalId_idx" ON "public"."devices"("provider", "externalId");
