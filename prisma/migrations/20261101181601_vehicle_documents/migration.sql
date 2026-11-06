-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('TECH_PASSPORT', 'INSURANCE', 'TECH_INSPECTION', 'PERMIT');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "type" "VehicleDocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "file_path" TEXT NOT NULL,
    "file_mime" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_documents_status_created_at_idx" ON "vehicle_documents"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_documents_vehicle_id_type_key" ON "vehicle_documents"("vehicle_id", "type");

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
