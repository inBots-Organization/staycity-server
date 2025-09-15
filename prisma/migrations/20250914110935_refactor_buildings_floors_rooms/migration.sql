-- AlterTable
ALTER TABLE "public"."properties" ADD COLUMN     "address" TEXT,
ADD COLUMN     "noOfRooms" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."rooms" ADD COLUMN     "deviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
