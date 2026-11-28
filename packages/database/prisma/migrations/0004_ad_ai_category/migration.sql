-- AlterTable
ALTER TABLE "Advertisement" ADD COLUMN IF NOT EXISTS "aiCategory" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Advertisement_organizationId_aiCategory_idx" ON "Advertisement"("organizationId", "aiCategory");
