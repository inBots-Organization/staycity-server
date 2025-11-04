/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `devices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `externalId` to the `presence_logs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."devices_provider_externalId_idx";

-- AlterTable
ALTER TABLE "public"."presence_logs" ADD COLUMN     "externalId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "devices_externalId_key" ON "public"."devices"("externalId");

-- CreateIndex
CREATE INDEX "presence_logs_externalId_idx" ON "public"."presence_logs"("externalId");

-- AddForeignKey
ALTER TABLE "public"."presence_logs" ADD CONSTRAINT "presence_logs_externalId_fkey" FOREIGN KEY ("externalId") REFERENCES "public"."devices"("externalId") ON DELETE RESTRICT ON UPDATE CASCADE;
