CREATE TABLE "price_books" (
  "id" TEXT NOT NULL,
  "priceBookId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "bookType" TEXT,
  "subsidiaryId" TEXT,
  "includeChildren" BOOLEAN NOT NULL DEFAULT false,
  "currencyId" TEXT,
  "defaultPriceLevelId" TEXT,
  "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
  "approvalWorkflow" TEXT,
  "allowManualOverride" BOOLEAN NOT NULL DEFAULT true,
  "effectiveStartDate" TIMESTAMP(3),
  "effectiveEndDate" TIMESTAMP(3),
  "inactive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "price_books_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "price_books_priceBookId_key" ON "price_books"("priceBookId");
CREATE INDEX "price_books_subsidiaryId_idx" ON "price_books"("subsidiaryId");
CREATE INDEX "price_books_currencyId_idx" ON "price_books"("currencyId");
CREATE INDEX "price_books_defaultPriceLevelId_idx" ON "price_books"("defaultPriceLevelId");
CREATE INDEX "price_books_bookType_idx" ON "price_books"("bookType");
CREATE INDEX "price_books_inactive_idx" ON "price_books"("inactive");

ALTER TABLE "price_books"
ADD CONSTRAINT "price_books_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "price_books_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "price_books_defaultPriceLevelId_fkey" FOREIGN KEY ("defaultPriceLevelId") REFERENCES "price_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
