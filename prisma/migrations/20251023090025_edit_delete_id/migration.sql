/*
  Warnings:

  - You are about to drop the column `deviceId` on the `Logs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Logs" DROP CONSTRAINT "Logs_deviceId_fkey";

-- AlterTable
ALTER TABLE "public"."Logs" DROP COLUMN "deviceId";
