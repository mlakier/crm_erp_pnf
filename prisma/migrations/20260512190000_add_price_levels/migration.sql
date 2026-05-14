CREATE TABLE "price_levels" (
  "id" TEXT NOT NULL,
  "priceLevelId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "levelType" TEXT,
  "subsidiaryId" TEXT,
  "includeChildren" BOOLEAN NOT NULL DEFAULT false,
  "defaultDiscountPct" DECIMAL(9,4),
  "minimumMarginPct" DECIMAL(9,4),
  "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
  "approvalWorkflow" TEXT,
  "allowManualOverride" BOOLEAN NOT NULL DEFAULT true,
  "effectiveStartDate" TIMESTAMP(3),
  "effectiveEndDate" TIMESTAMP(3),
  "inactive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "price_levels_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "price_levels_priceLevelId_key" ON "price_levels"("priceLevelId");
CREATE INDEX "price_levels_subsidiaryId_idx" ON "price_levels"("subsidiaryId");
CREATE INDEX "price_levels_levelType_idx" ON "price_levels"("levelType");
CREATE INDEX "price_levels_inactive_idx" ON "price_levels"("inactive");

ALTER TABLE "price_levels"
ADD CONSTRAINT "price_levels_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
