-- CreateEnum
CREATE TYPE "public"."DeviseType" AS ENUM ('POWER', 'ENVIRONMENT', 'MOTION', 'SWITCH', 'DOOR');

-- AlterTable
ALTER TABLE "public"."devices" ADD COLUMN     "deviceType" "public"."DeviseType" NOT NULL DEFAULT 'POWER';
