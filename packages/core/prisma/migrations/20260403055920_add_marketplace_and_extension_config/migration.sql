-- CreateTable
CREATE TABLE "extension_configs" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "extensionKey" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extension_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "extensionKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "author" TEXT NOT NULL,
    "authorEmail" TEXT,
    "repository" TEXT,
    "homepage" TEXT,
    "iconUrl" TEXT,
    "screenshotUrls" JSONB,
    "category" TEXT NOT NULL,
    "tags" JSONB,
    "pricing" TEXT NOT NULL DEFAULT 'free',
    "priceMonthly" INTEGER,
    "license" TEXT NOT NULL DEFAULT 'MIT',
    "version" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reviews" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "extension_configs_spaceId_extensionKey_configKey_key" ON "extension_configs"("spaceId", "extensionKey", "configKey");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listings_extensionKey_key" ON "marketplace_listings"("extensionKey");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_reviews_listingId_userId_key" ON "marketplace_reviews"("listingId", "userId");

-- AddForeignKey
ALTER TABLE "extension_configs" ADD CONSTRAINT "extension_configs_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reviews" ADD CONSTRAINT "marketplace_reviews_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
