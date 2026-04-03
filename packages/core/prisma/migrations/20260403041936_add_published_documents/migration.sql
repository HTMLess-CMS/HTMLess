-- CreateTable
CREATE TABLE "published_documents" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "contentTypeKey" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "etag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "published_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "published_documents_entryId_key" ON "published_documents"("entryId");

-- CreateIndex
CREATE INDEX "published_documents_spaceId_contentTypeKey_idx" ON "published_documents"("spaceId", "contentTypeKey");

-- CreateIndex
CREATE INDEX "published_documents_spaceId_slug_idx" ON "published_documents"("spaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "published_documents_spaceId_contentTypeKey_slug_key" ON "published_documents"("spaceId", "contentTypeKey", "slug");

-- AddForeignKey
ALTER TABLE "published_documents" ADD CONSTRAINT "published_documents_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
