ALTER TABLE "items"
ADD COLUMN "incomeAccountId" TEXT,
ADD COLUMN "deferredRevenueAccountId" TEXT,
ADD COLUMN "inventoryAccountId" TEXT,
ADD COLUMN "cogsExpenseAccountId" TEXT,
ADD COLUMN "deferredCostAccountId" TEXT,
ADD COLUMN "directRevenuePosting" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "items"
ADD CONSTRAINT "items_incomeAccountId_fkey"
FOREIGN KEY ("incomeAccountId") REFERENCES "chart_of_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "items"
ADD CONSTRAINT "items_deferredRevenueAccountId_fkey"
FOREIGN KEY ("deferredRevenueAccountId") REFERENCES "chart_of_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "items"
ADD CONSTRAINT "items_inventoryAccountId_fkey"
FOREIGN KEY ("inventoryAccountId") REFERENCES "chart_of_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "items"
ADD CONSTRAINT "items_cogsExpenseAccountId_fkey"
FOREIGN KEY ("cogsExpenseAccountId") REFERENCES "chart_of_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "items"
ADD CONSTRAINT "items_deferredCostAccountId_fkey"
FOREIGN KEY ("deferredCostAccountId") REFERENCES "chart_of_accounts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "items_incomeAccountId_idx" ON "items"("incomeAccountId");
CREATE INDEX "items_deferredRevenueAccountId_idx" ON "items"("deferredRevenueAccountId");
CREATE INDEX "items_inventoryAccountId_idx" ON "items"("inventoryAccountId");
CREATE INDEX "items_cogsExpenseAccountId_idx" ON "items"("cogsExpenseAccountId");
CREATE INDEX "items_deferredCostAccountId_idx" ON "items"("deferredCostAccountId");
