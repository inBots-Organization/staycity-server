/*
  Warnings:

  - You are about to drop the column `metricId` on the `Logs` table. All the data in the column will be lost.
  - You are about to drop the column `metricName` on the `Logs` table. All the data in the column will be lost.
  - You are about to drop the column `timeStamp` on the `Logs` table. All the data in the column will be lost.
  - Added the required column `metric` to the `Logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sensor` to the `Logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time` to the `Logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Logs" DROP COLUMN "metricId",
DROP COLUMN "metricName",
DROP COLUMN "timeStamp",
ADD COLUMN     "metric" TEXT NOT NULL,
ADD COLUMN     "sensor" TEXT NOT NULL,
ADD COLUMN     "time" TEXT NOT NULL;
