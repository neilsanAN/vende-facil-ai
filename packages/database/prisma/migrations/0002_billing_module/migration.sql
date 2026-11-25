-- AlterEnum
CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'CHARGED_BACK');

-- AlterTable Plan
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "features" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "badge" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "highlighted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT 'sparkles';

-- AlterTable Subscription
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTH';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);

-- CreateTable PlanPrice
CREATE TABLE IF NOT EXISTS "PlanPrice" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlanPrice_planId_interval_currency_key" ON "PlanPrice"("planId", "interval", "currency");
CREATE INDEX IF NOT EXISTS "PlanPrice_planId_active_idx" ON "PlanPrice"("planId", "active");

-- CreateTable SubscriptionEvent
CREATE TABLE IF NOT EXISTS "SubscriptionEvent" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "fromPlanId" UUID,
    "toPlanId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SubscriptionEvent_organizationId_createdAt_idx" ON "SubscriptionEvent"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "SubscriptionEvent_subscriptionId_createdAt_idx" ON "SubscriptionEvent"("subscriptionId", "createdAt");

-- CreateTable Payment
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "invoiceId" UUID,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_provider_externalId_key" ON "Payment"("provider", "externalId");
CREATE INDEX IF NOT EXISTS "Payment_organizationId_createdAt_idx" ON "Payment"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

-- FKs
DO $$ BEGIN
  ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
