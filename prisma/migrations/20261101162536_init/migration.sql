-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CARGO_OWNER', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'PHONE_CHANGE');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('TENT', 'FLATBED', 'REFRIGERATED', 'TIPPER', 'TANKER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('PENDING', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CargoStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CARGO_NEW', 'OFFER_NEW', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'MODERATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ModerationAction" AS ENUM ('APPROVE', 'REJECT', 'BLOCK_USER', 'UNBLOCK_USER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "full_name" VARCHAR(120),
    "role" "UserRole" NOT NULL DEFAULT 'CARGO_OWNER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatar_url" TEXT,
    "company_name" VARCHAR(160),
    "language" VARCHAR(5) NOT NULL DEFAULT 'uz',
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "phone" VARCHAR(20) NOT NULL,
    "code_hash" VARCHAR(128) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "ip" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "user_agent" VARCHAR(255),
    "ip" VARCHAR(64),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "region" VARCHAR(80),
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" UUID NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "cargo_type" VARCHAR(80) NOT NULL,
    "weight_kg" INTEGER NOT NULL,
    "volume_m3" DECIMAL(8,2),
    "vehicle_type" "VehicleType" NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UZS',
    "price_negotiable" BOOLEAN NOT NULL DEFAULT false,
    "status" "CargoStatus" NOT NULL DEFAULT 'DRAFT',
    "pickup_city" VARCHAR(80) NOT NULL,
    "pickup_address" VARCHAR(255),
    "pickup_point" geography(Point,4326),
    "dropoff_city" VARCHAR(80) NOT NULL,
    "dropoff_address" VARCHAR(255),
    "dropoff_point" geography(Point,4326),
    "pickup_date" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "offer_count" INTEGER NOT NULL DEFAULT 0,
    "moderation_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_images" (
    "id" UUID NOT NULL,
    "cargo_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt" VARCHAR(200),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cargo_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plate_number" VARCHAR(20) NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "capacity_kg" INTEGER NOT NULL,
    "body_volume_m3" DECIMAL(8,2),
    "status" "VehicleStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "cargo_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "price" INTEGER NOT NULL,
    "message" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "cargo_id" UUID,
    "author_id" UUID NOT NULL,
    "target_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" TEXT,
    "payload" JSONB,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_logs" (
    "id" UUID NOT NULL,
    "cargo_id" UUID,
    "moderator_id" UUID NOT NULL,
    "action" "ModerationAction" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "otp_codes_phone_created_at_idx" ON "otp_codes"("phone", "created_at");

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "cargos_code_key" ON "cargos"("code");

-- CreateIndex
CREATE INDEX "cargos_status_published_at_idx" ON "cargos"("status", "published_at");

-- CreateIndex
CREATE INDEX "cargos_status_expires_at_idx" ON "cargos"("status", "expires_at");

-- CreateIndex
CREATE INDEX "cargos_owner_id_status_idx" ON "cargos"("owner_id", "status");

-- CreateIndex
CREATE INDEX "cargos_pickup_city_idx" ON "cargos"("pickup_city");

-- CreateIndex
CREATE INDEX "cargos_dropoff_city_idx" ON "cargos"("dropoff_city");

-- CreateIndex
CREATE INDEX "cargos_vehicle_type_idx" ON "cargos"("vehicle_type");

-- CreateIndex
CREATE INDEX "cargos_deleted_at_idx" ON "cargos"("deleted_at");

-- CreateIndex
CREATE INDEX "cargo_images_cargo_id_sort_order_idx" ON "cargo_images"("cargo_id", "sort_order");

-- CreateIndex
CREATE INDEX "vehicles_vehicle_type_status_idx" ON "vehicles"("vehicle_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_user_id_plate_number_key" ON "vehicles"("user_id", "plate_number");

-- CreateIndex
CREATE INDEX "offers_driver_id_status_idx" ON "offers"("driver_id", "status");

-- CreateIndex
CREATE INDEX "offers_cargo_id_status_idx" ON "offers"("cargo_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "offers_cargo_id_driver_id_key" ON "offers"("cargo_id", "driver_id");

-- CreateIndex
CREATE INDEX "reviews_target_id_idx" ON "reviews"("target_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_cargo_id_author_id_key" ON "reviews"("cargo_id", "author_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "moderation_logs_cargo_id_idx" ON "moderation_logs"("cargo_id");

-- CreateIndex
CREATE INDEX "moderation_logs_moderator_id_created_at_idx" ON "moderation_logs"("moderator_id", "created_at");

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_images" ADD CONSTRAINT "cargo_images_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostGIS GiST indexes (geo qidiruv: ST_DWithin / ST_Intersects)
CREATE INDEX "cargos_pickup_point_gist" ON "cargos" USING GIST ("pickup_point");
CREATE INDEX "cargos_dropoff_point_gist" ON "cargos" USING GIST ("dropoff_point");
