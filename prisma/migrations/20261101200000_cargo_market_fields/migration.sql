ALTER TABLE "cargos"
  ADD COLUMN "payment_method" VARCHAR(16) NOT NULL DEFAULT 'CASH',
  ADD COLUMN "advance_amount" INTEGER,
  ADD COLUMN "trucks_needed" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "is_additional_load" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ready_to_load" BOOLEAN NOT NULL DEFAULT true;
