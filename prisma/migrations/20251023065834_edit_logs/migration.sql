-- AddForeignKey
ALTER TABLE "public"."Logs" ADD CONSTRAINT "Logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
