-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('super_admin', 'admin', 'manager', 'user');

-- CreateEnum
CREATE TYPE "public"."Permission" AS ENUM ('users_create', 'users_read', 'users_update', 'users_delete', 'users_manage', 'properties_create', 'properties_read', 'properties_update', 'properties_delete', 'properties_manage', 'bookings_create', 'bookings_read', 'bookings_update', 'bookings_delete', 'bookings_manage', 'reports_view', 'system_manage', 'admin_panel');

-- CreateEnum
CREATE TYPE "public"."PropertyStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."RoomType" AS ENUM ('ROOM', 'SUITE');

-- CreateEnum
CREATE TYPE "public"."RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "public"."DeviceCategory" AS ENUM ('CLIMATE', 'LIGHTING', 'SECURITY', 'ENTERTAINMENT', 'ENVIRONMENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DeviceMetric" AS ENUM ('TEMPERATURE', 'HUMIDITY', 'ENERGY_KWH', 'AQI', 'BATTERY_PCT', 'MOTION', 'LOCK_STATE', 'LIGHT_LEVEL', 'GENERIC_NUMBER', 'GENERIC_TEXT');

-- CreateEnum
CREATE TYPE "public"."Amenity" AS ENUM ('WIFI', 'PARKING', 'RESTAURANT', 'SPA', 'GYM', 'POOL', 'BAR', 'LAUNDRY');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "public"."RoleName" NOT NULL DEFAULT 'user',
    "image" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."roles" (
    "id" TEXT NOT NULL,
    "name" "public"."RoleName" NOT NULL,
    "permissions" "public"."Permission"[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "public"."PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
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

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PropertyStats" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "currentGuests" INTEGER NOT NULL DEFAULT 0,
    "totalCapacity" INTEGER NOT NULL DEFAULT 0,
    "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "availableRooms" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PropertyAmenity" (
    "propertyId" TEXT NOT NULL,
    "amenity" "public"."Amenity" NOT NULL,

    CONSTRAINT "PropertyAmenity_pkey" PRIMARY KEY ("propertyId","amenity")
);

-- CreateTable
CREATE TABLE "public"."Floor" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Room" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."RoomType" NOT NULL DEFAULT 'ROOM',
    "status" "public"."RoomStatus" NOT NULL DEFAULT 'AVAILABLE',
    "capacity" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeviceType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" "public"."DeviceCategory" NOT NULL,

    CONSTRAINT "DeviceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Device" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "roomId" TEXT,
    "typeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "public"."DeviceStatus" NOT NULL DEFAULT 'ONLINE',
    "batteryPct" INTEGER,
    "lastSeenAt" TIMESTAMP(3),
    "state" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeviceReading" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "metric" "public"."DeviceMetric" NOT NULL,
    "valueNum" DECIMAL(14,4),
    "valueText" TEXT,
    "unit" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "public"."roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "public"."Property"("slug");

-- CreateIndex
CREATE INDEX "Property_city_country_idx" ON "public"."Property"("city", "country");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "public"."Property"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyStats_propertyId_key" ON "public"."PropertyStats"("propertyId");

-- CreateIndex
CREATE INDEX "Floor_propertyId_idx" ON "public"."Floor"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_propertyId_level_key" ON "public"."Floor"("propertyId", "level");

-- CreateIndex
CREATE INDEX "Room_propertyId_idx" ON "public"."Room"("propertyId");

-- CreateIndex
CREATE INDEX "Room_floorId_idx" ON "public"."Room"("floorId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceType_key_key" ON "public"."DeviceType"("key");

-- CreateIndex
CREATE INDEX "Device_propertyId_status_idx" ON "public"."Device"("propertyId", "status");

-- CreateIndex
CREATE INDEX "Device_roomId_idx" ON "public"."Device"("roomId");

-- CreateIndex
CREATE INDEX "Device_typeId_idx" ON "public"."Device"("typeId");

-- CreateIndex
CREATE INDEX "DeviceReading_deviceId_metric_recordedAt_idx" ON "public"."DeviceReading"("deviceId", "metric", "recordedAt");

-- AddForeignKey
ALTER TABLE "public"."PropertyStats" ADD CONSTRAINT "PropertyStats_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Floor" ADD CONSTRAINT "Floor_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "public"."Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Device" ADD CONSTRAINT "Device_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Device" ADD CONSTRAINT "Device_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Device" ADD CONSTRAINT "Device_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "public"."DeviceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeviceReading" ADD CONSTRAINT "DeviceReading_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
