-- CreateTable
CREATE TABLE "public"."presence_logs" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "presence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presence_logs_propertyId_idx" ON "public"."presence_logs"("propertyId");

-- CreateIndex
CREATE INDEX "presence_logs_floorId_idx" ON "public"."presence_logs"("floorId");

-- CreateIndex
CREATE INDEX "presence_logs_roomId_idx" ON "public"."presence_logs"("roomId");

-- AddForeignKey
ALTER TABLE "public"."presence_logs" ADD CONSTRAINT "presence_logs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "public"."properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."presence_logs" ADD CONSTRAINT "presence_logs_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "public"."floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."presence_logs" ADD CONSTRAINT "presence_logs_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
