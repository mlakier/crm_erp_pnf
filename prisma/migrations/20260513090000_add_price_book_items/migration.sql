CREATE TABLE "price_book_items" (
  "id" TEXT NOT NULL,
  "priceBookItemId" TEXT,
  "priceBookId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "unitPrice" DECIMAL(19,4) NOT NULL,
  "currencyId" TEXT,
  "uom" TEXT,
  "minimumQuantity" DECIMAL(18,4),
  "maximumQuantity" DECIMAL(18,4),
  "effectiveStartDate" TIMESTAMP(3),
  "effectiveEndDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "priceSource" TEXT NOT NULL DEFAULT 'manual',
  "marginFloorPct" DECIMAL(9,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "price_book_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "price_book_items_priceBookItemId_key" ON "price_book_items"("priceBookItemId");
CREATE INDEX "price_book_items_priceBookId_idx" ON "price_book_items"("priceBookId");
CREATE INDEX "price_book_items_itemId_idx" ON "price_book_items"("itemId");
CREATE INDEX "price_book_items_currencyId_idx" ON "price_book_items"("currencyId");
CREATE INDEX "price_book_items_status_idx" ON "price_book_items"("status");
CREATE INDEX "price_book_items_priceSource_idx" ON "price_book_items"("priceSource");

ALTER TABLE "price_book_items" ADD CONSTRAINT "price_book_items_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "price_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_book_items" ADD CONSTRAINT "price_book_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_book_items" ADD CONSTRAINT "price_book_items_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
