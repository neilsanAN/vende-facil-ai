-- AlterTable Advertisement
ALTER TABLE "Advertisement" ADD COLUMN IF NOT EXISTS "imageAssetIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
