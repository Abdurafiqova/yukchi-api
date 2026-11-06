-- CreateIndex
CREATE INDEX "cargos_pickup_point_idx" ON "cargos" USING GIST ("pickup_point");

-- CreateIndex
CREATE INDEX "cargos_dropoff_point_idx" ON "cargos" USING GIST ("dropoff_point");
