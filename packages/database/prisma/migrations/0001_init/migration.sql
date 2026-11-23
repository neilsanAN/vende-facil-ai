-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdTone" AS ENUM ('PROFESSIONAL', 'FRIENDLY', 'URGENT', 'ELEGANT');

-- CreateEnum
CREATE TYPE "VideoObjective" AS ENUM ('SELL', 'OFFER', 'PRESENT', 'SOCIAL');

-- CreateEnum
CREATE TYPE "VideoStyle" AS ENUM ('PREMIUM', 'OFFER', 'SHOWCASE', 'ELEGANT', 'SOCIAL', 'MINIMAL');

-- CreateEnum
CREATE TYPE "AspectRatio" AS ENUM ('R9_16', 'R1_1', 'R4_5', 'R16_9');

-- CreateEnum
CREATE TYPE "MotionMode" AS ENUM ('PHOTO', 'GENERATIVE');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('CREATED', 'VALIDATING', 'GENERATING_SCRIPT', 'GENERATING_AUDIO', 'PREPARING_SCENES', 'RENDERING', 'UPLOADING', 'COMPLETED', 'FAILED', 'CANCELLED', 'RETRYING');

-- CreateEnum
CREATE TYPE "TransitionType" AS ENUM ('CUT', 'FADE', 'SLIDE', 'WIPE');

-- CreateEnum
CREATE TYPE "VoiceGender" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "VoiceStyle" AS ENUM ('SOFT', 'INSTITUTIONAL', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "AiKind" AS ENUM ('IMAGE_ANALYSIS', 'TEXT', 'TTS', 'VIDEO', 'ARTWORK');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SocialProvider" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'REQUIRES_AUTH', 'AVAILABLE', 'MANUAL_ONLY', 'ERROR');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED', 'MANUAL_REQUIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PublicationTarget" AS ENUM ('PRODUCT', 'ADVERTISEMENT', 'VIDEO', 'CATALOG');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'CONFIRMED', 'PREPARING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "OrderOrigin" AS ENUM ('STORE', 'WHATSAPP', 'MANUAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

-- CreateEnum
CREATE TYPE "CreditKind" AS ENUM ('ANNOUNCEMENT', 'NARRATION', 'RENDER', 'GENERATIVE_VIDEO');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'DEAD');

-- CreateEnum
CREATE TYPE "EmailTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD', 'INVITE');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClickKind" AS ENUM ('WHATSAPP', 'CATALOG', 'PRODUCT', 'SHARE');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMP(3),
    "termsAcceptedAt" TIMESTAMP(3),
    "privacyAcceptedAt" TIMESTAMP(3),
    "activeOrganizationId" UUID,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "accessExpiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" UUID,
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "purpose" "EmailTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvite" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "whatsapp" TEXT,
    "logoAssetId" UUID,
    "primaryColor" TEXT NOT NULL DEFAULT '#6336F5',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "storeId" UUID NOT NULL,
    "seoTitle" TEXT NOT NULL DEFAULT '',
    "seoDescription" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT,
    "address" TEXT,
    "showPrices" BOOLEAN NOT NULL DEFAULT true,
    "allowOrders" BOOLEAN NOT NULL DEFAULT true,
    "favoriteTemplates" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "StoreSettings_pkey" PRIMARY KEY ("storeId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "categoryId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "promoPriceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "sku" TEXT,
    "stockQuantity" INTEGER,
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "priceCents" INTEGER,
    "stockQuantity" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "mediaAssetId" UUID NOT NULL,
    "alt" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "publicObjectKey" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Advertisement" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hashtags" TEXT[],
    "tone" "AdTone" NOT NULL DEFAULT 'PROFESSIONAL',
    "status" "AdStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvertisementVersion" (
    "id" UUID NOT NULL,
    "advertisementId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hashtags" TEXT[],
    "source" TEXT NOT NULL,
    "aiGenerationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvertisementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artwork" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productId" UUID,
    "template" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "mediaAssetId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProject" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productId" UUID,
    "title" TEXT NOT NULL,
    "objective" "VideoObjective" NOT NULL DEFAULT 'SELL',
    "style" "VideoStyle" NOT NULL DEFAULT 'PREMIUM',
    "durationSec" INTEGER NOT NULL,
    "aspectRatio" "AspectRatio" NOT NULL DEFAULT 'R9_16',
    "motionMode" "MotionMode" NOT NULL DEFAULT 'PHOTO',
    "script" TEXT NOT NULL DEFAULT '',
    "voiceProfileId" UUID,
    "musicTrackId" UUID,
    "narrationVolume" INTEGER NOT NULL DEFAULT 100,
    "musicVolume" INTEGER NOT NULL DEFAULT 25,
    "showPrice" BOOLEAN NOT NULL DEFAULT true,
    "showLogo" BOOLEAN NOT NULL DEFAULT true,
    "cta" TEXT NOT NULL DEFAULT 'Chame no WhatsApp',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoScene" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "mediaAssetId" UUID,
    "transition" "TransitionType" NOT NULL DEFAULT 'FADE',
    "zoom" DOUBLE PRECISION NOT NULL DEFAULT 1.08,
    "panX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "panY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "headline" TEXT NOT NULL DEFAULT '',
    "caption" TEXT NOT NULL DEFAULT '',
    "cta" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "VideoScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoRender" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "status" "PipelineStatus" NOT NULL DEFAULT 'CREATED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "resumeStage" "PipelineStatus",
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "outputAssetId" UUID,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "creditsReserved" INTEGER NOT NULL DEFAULT 0,
    "creditKind" "CreditKind" NOT NULL DEFAULT 'RENDER',
    "idempotencyKey" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoRender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceProfile" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "VoiceGender" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "style" "VoiceStyle" NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VoiceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioGeneration" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "voiceProfileId" UUID NOT NULL,
    "script" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "AiStatus" NOT NULL,
    "mediaAssetId" UUID,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudioGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "kind" "AiKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AiStatus" NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "units" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostCents" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialConnection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "provider" "SocialProvider" NOT NULL,
    "status" "ConnectionStatus" NOT NULL,
    "externalAccountId" TEXT,
    "externalAccountName" TEXT,
    "encryptedCredentials" TEXT,
    "scopes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "channel" "SocialProvider" NOT NULL,
    "status" "PublicationStatus" NOT NULL,
    "targetType" "PublicationTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalUrl" TEXT,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationAttempt" (
    "id" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "origin" "OrderOrigin" NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactInquiry" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTH',
    "limits" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "subscriptionId" UUID,
    "amountCents" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditWallet" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" "CreditKind" NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreView" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductView" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkClick" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "storeId" UUID,
    "productId" UUID,
    "kind" "ClickKind" NOT NULL,
    "visitorHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "idempotencyKey" TEXT,
    "videoRenderId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "userId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID,
    "body" TEXT NOT NULL,
    "staff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicTrack" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "title" TEXT NOT NULL,
    "licenseNote" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "durationMs" INTEGER,
    "mimeType" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_activeOrganizationId_idx" ON "User"("activeOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_accessTokenHash_key" ON "Session"("accessTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailToken_email_purpose_idx" ON "EmailToken"("email", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvite_tokenHash_key" ON "OrganizationInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "OrganizationInvite_organizationId_email_idx" ON "OrganizationInvite"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Store_organizationId_key" ON "Store"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Store_published_idx" ON "Store"("published");

-- CreateIndex
CREATE UNIQUE INDEX "Category_organizationId_slug_key" ON "Category"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Product_organizationId_status_idx" ON "Product"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Product_organizationId_published_idx" ON "Product"("organizationId", "published");

-- CreateIndex
CREATE INDEX "Product_organizationId_createdAt_idx" ON "Product"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_slug_key" ON "Product"("storeId", "slug");

-- CreateIndex
CREATE INDEX "ProductVariant_organizationId_productId_idx" ON "ProductVariant"("organizationId", "productId");

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "ProductImage_organizationId_idx" ON "ProductImage"("organizationId");

-- CreateIndex
CREATE INDEX "MediaAsset_organizationId_status_idx" ON "MediaAsset"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "Advertisement_organizationId_status_idx" ON "Advertisement"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AdvertisementVersion_advertisementId_createdAt_idx" ON "AdvertisementVersion"("advertisementId", "createdAt");

-- CreateIndex
CREATE INDEX "AdvertisementVersion_organizationId_idx" ON "AdvertisementVersion"("organizationId");

-- CreateIndex
CREATE INDEX "Artwork_organizationId_createdAt_idx" ON "Artwork"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoProject_organizationId_createdAt_idx" ON "VideoProject"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoScene_projectId_position_idx" ON "VideoScene"("projectId", "position");

-- CreateIndex
CREATE INDEX "VideoScene_organizationId_idx" ON "VideoScene"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRender_idempotencyKey_key" ON "VideoRender"("idempotencyKey");

-- CreateIndex
CREATE INDEX "VideoRender_organizationId_status_idx" ON "VideoRender"("organizationId", "status");

-- CreateIndex
CREATE INDEX "VideoRender_status_createdAt_idx" ON "VideoRender"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoiceProfile_provider_providerVoiceId_style_key" ON "VoiceProfile"("provider", "providerVoiceId", "style");

-- CreateIndex
CREATE INDEX "AudioGeneration_organizationId_createdAt_idx" ON "AudioGeneration"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGeneration_organizationId_createdAt_idx" ON "AiGeneration"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGeneration_organizationId_kind_idx" ON "AiGeneration"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "SocialConnection_organizationId_provider_key" ON "SocialConnection"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "Publication_organizationId_status_idx" ON "Publication"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Publication_status_scheduledAt_idx" ON "Publication"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Customer_organizationId_phone_idx" ON "Customer"("organizationId", "phone");

-- CreateIndex
CREATE INDEX "Customer_organizationId_email_idx" ON "Customer"("organizationId", "email");

-- CreateIndex
CREATE INDEX "Order_organizationId_status_createdAt_idx" ON "Order"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactInquiry_organizationId_status_idx" ON "ContactInquiry"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_createdAt_idx" ON "Invoice"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_externalId_idx" ON "Invoice"("externalId");

-- CreateIndex
CREATE INDEX "CheckoutSession_organizationId_status_idx" ON "CheckoutSession"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CheckoutSession_externalId_idx" ON "CheckoutSession"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditWallet_organizationId_kind_key" ON "CreditWallet"("organizationId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_idempotencyKey_key" ON "CreditTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CreditTransaction_organizationId_createdAt_idx" ON "CreditTransaction"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "UsageEvent_organizationId_type_createdAt_idx" ON "UsageEvent"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "StoreView_storeId_createdAt_idx" ON "StoreView"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "StoreView_organizationId_createdAt_idx" ON "StoreView"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductView_productId_createdAt_idx" ON "ProductView"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductView_organizationId_createdAt_idx" ON "ProductView"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "LinkClick_organizationId_kind_createdAt_idx" ON "LinkClick"("organizationId", "kind", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_idempotencyKey_key" ON "BackgroundJob"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_videoRenderId_key" ON "BackgroundJob"("videoRenderId");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_runAt_idx" ON "BackgroundJob"("status", "runAt");

-- CreateIndex
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_logoAssetId_fkey" FOREIGN KEY ("logoAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreSettings" ADD CONSTRAINT "StoreSettings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Advertisement" ADD CONSTRAINT "Advertisement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvertisementVersion" ADD CONSTRAINT "AdvertisementVersion_advertisementId_fkey" FOREIGN KEY ("advertisementId") REFERENCES "Advertisement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artwork" ADD CONSTRAINT "Artwork_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_voiceProfileId_fkey" FOREIGN KEY ("voiceProfileId") REFERENCES "VoiceProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_musicTrackId_fkey" FOREIGN KEY ("musicTrackId") REFERENCES "MusicTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRender" ADD CONSTRAINT "VideoRender_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRender" ADD CONSTRAINT "VideoRender_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRender" ADD CONSTRAINT "VideoRender_outputAssetId_fkey" FOREIGN KEY ("outputAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioGeneration" ADD CONSTRAINT "AudioGeneration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioGeneration" ADD CONSTRAINT "AudioGeneration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioGeneration" ADD CONSTRAINT "AudioGeneration_voiceProfileId_fkey" FOREIGN KEY ("voiceProfileId") REFERENCES "VoiceProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioGeneration" ADD CONSTRAINT "AudioGeneration_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialConnection" ADD CONSTRAINT "SocialConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationAttempt" ADD CONSTRAINT "PublicationAttempt_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInquiry" ADD CONSTRAINT "ContactInquiry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactInquiry" ADD CONSTRAINT "ContactInquiry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditWallet" ADD CONSTRAINT "CreditWallet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CreditWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreView" ADD CONSTRAINT "StoreView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreView" ADD CONSTRAINT "StoreView_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductView" ADD CONSTRAINT "ProductView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkClick" ADD CONSTRAINT "LinkClick_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundJob" ADD CONSTRAINT "BackgroundJob_videoRenderId_fkey" FOREIGN KEY ("videoRenderId") REFERENCES "VideoRender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicTrack" ADD CONSTRAINT "MusicTrack_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;


