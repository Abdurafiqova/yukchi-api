-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VehicleType" ADD VALUE 'VAN';
ALTER TYPE "VehicleType" ADD VALUE 'ISOTHERMAL';
ALTER TYPE "VehicleType" ADD VALUE 'CONTAINER';
ALTER TYPE "VehicleType" ADD VALUE 'CAR_CARRIER';
ALTER TYPE "VehicleType" ADD VALUE 'CRANE';

-- DropIndex
DROP INDEX "cargos_dropoff_point_gist";

-- DropIndex
DROP INDEX "cargos_pickup_point_gist";
