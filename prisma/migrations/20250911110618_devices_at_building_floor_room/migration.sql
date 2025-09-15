/*
  Warnings:

  - You are about to drop the `Device` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeviceReading` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DeviceType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Floor` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Property` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyAmenity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PropertyStats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."BuildingStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- AlterEnum
ALTER TYPE "public"."DeviceStatus" ADD VALUE 'MAINTENANCE';

-- DropForeignKey
ALTER TABLE "public"."Device" DROP CONSTRAINT "Device_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Device" DROP CONSTRAINT "Device_roomId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Device" DROP CONSTRAINT "Device_typeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."DeviceReading" DROP CONSTRAINT "DeviceReading_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Floor" DROP CONSTRAINT "Floor_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PropertyAmenity" DROP CONSTRAINT "PropertyAmenity_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PropertyStats" DROP CONSTRAINT "PropertyStats_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Room" DROP CONSTRAINT "Room_floorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Room" DROP CONSTRAINT "Room_propertyId_fkey";

-- DropTable
DROP TABLE "public"."Device";

-- DropTable
DROP TABLE "public"."DeviceReading";

-- DropTable
DROP TABLE "public"."DeviceType";

-- DropTable
DROP TABLE "public"."Floor";

-- DropTable
DROP TABLE "public"."Property";

-- DropTable
DROP TABLE "public"."PropertyAmenity";

-- DropTable
DROP TABLE "public"."PropertyStats";

-- DropTable
DROP TABLE "public"."Room";

-- DropEnum
DROP TYPE "public"."DeviceCategory";

-- DropEnum
DROP TYPE "public"."DeviceMetric";

-- DropEnum
DROP TYPE "public"."PropertyStatus";

-- CreateTable
CREATE TABLE "public"."device_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "device_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."properties" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "public"."BuildingStatus" NOT NULL DEFAULT 'ACTIVE',
    "rating" DECIMAL(2,1),
    "monthlySavings" INTEGER NOT NULL DEFAULT 0,
    "energyKwh" DECIMAL(10,1),
    "floorsCount" INTEGER NOT NULL DEFAULT 0,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "country" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."property_stats" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "currentGuests" INTEGER NOT NULL DEFAULT 0,
    "totalCapacity" INTEGER NOT NULL DEFAULT 0,
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "availableRooms" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "property_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."property_amenities" (
    "propertyId" TEXT NOT NULL,
    "amenity" "public"."Amenity" NOT NULL,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("propertyId","amenity")
);

-- CreateTable
CREATE TABLE "public"."floors" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."rooms" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."RoomType" NOT NULL DEFAULT 'ROOM',
    "status" "public"."RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."devices" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "floorId" TEXT,
    "roomId" TEXT,
    "typeId" TEXT,
    "name" TEXT NOT NULL,
    "externalId" VARCHAR(255),
    "status" "public"."DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_types_name_key" ON "public"."device_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "public"."properties"("slug");

-- CreateIndex
CREATE INDEX "properties_city_country_idx" ON "public"."properties"("city", "country");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "public"."properties"("status");

-- CreateIndex
CREATE UNIQUE INDEX "property_stats_propertyId_key" ON "public"."property_stats"("propertyId");

-- CreateIndex
CREATE INDEX "floors_propertyId_idx" ON "public"."floors"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "floors_propertyId_level_key" ON "public"."floors"("propertyId", "level");

-- CreateIndex
CREATE INDEX "rooms_propertyId_idx" ON "public"."rooms"("propertyId");

-- CreateIndex
CREATE INDEX "rooms_floorId_idx" ON "public"."rooms"("floorId");

-- CreateIndex
CREATE INDEX "devices_propertyId_idx" ON "public"."devices"("propertyId");

-- CreateIndex
CREATE INDEX "devices_floorId_idx" ON "public"."devices"("floorId");

-- CreateIndex
CREATE INDEX "devices_roomId_idx" ON "public"."devices"("roomId");

-- AddForeignKey
ALTER TABLE "public"."property_stats" ADD CONSTRAINT "property_stats_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."property_amenities" ADD CONSTRAINT "property_amenities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."floors" ADD CONSTRAINT "floors_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rooms" ADD CONSTRAINT "rooms_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."rooms" ADD CONSTRAINT "rooms_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "public"."floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "public"."floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."devices" ADD CONSTRAINT "devices_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "public"."device_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
