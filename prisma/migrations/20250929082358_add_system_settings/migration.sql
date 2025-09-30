/*
  Warnings:

  - You are about to drop the column `typeId` on the `devices` table. All the data in the column will be lost.
  - You are about to drop the `device_types` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."devices" DROP CONSTRAINT "devices_typeId_fkey";

-- AlterTable
ALTER TABLE "public"."devices" DROP COLUMN "typeId";

-- DropTable
DROP TABLE "public"."device_types";

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "lowMaxKw" INTEGER NOT NULL,
    "mediumMaxKw" INTEGER NOT NULL,
    "highMaxKw" INTEGER NOT NULL,
    "showEnergy" BOOLEAN NOT NULL DEFAULT true,
    "showCO2" BOOLEAN NOT NULL DEFAULT true,
    "showTemperature" BOOLEAN NOT NULL DEFAULT true,
    "co2WarningPpm" INTEGER NOT NULL,
    "co2CriticalPpm" INTEGER NOT NULL,
    "co2DebounceSec" INTEGER NOT NULL,
    "tempUnit" TEXT NOT NULL DEFAULT 'Celsius',
    "tempHighWarning" INTEGER NOT NULL,
    "tempHighCritical" INTEGER NOT NULL,
    "tempLowWarning" INTEGER NOT NULL,
    "tempLowCritical" INTEGER NOT NULL,
    "tempDebounceSec" INTEGER NOT NULL,
    "entryConfirmedSec" INTEGER NOT NULL,
    "absenceTimeMin" INTEGER NOT NULL,
    "doorOnlyTimeoutMin" INTEGER NOT NULL,
    "sensorBatteryTimeoutH" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
