ALTER TABLE "subsidiaries"
ADD COLUMN "accountingStandard" TEXT,
ADD COLUMN "directOwnershipPercent" DOUBLE PRECISION,
ADD COLUMN "ultimateOwnershipPercent" DOUBLE PRECISION,
ADD COLUMN "ownershipEffectiveFrom" TIMESTAMP(3),
ADD COLUMN "ownershipEffectiveThrough" TIMESTAMP(3),
ADD COLUMN "consolidationEffectiveFrom" TIMESTAMP(3),
ADD COLUMN "consolidationEffectiveThrough" TIMESTAMP(3),
ADD COLUMN "controlIndicator" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "nciRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "eliminationTargetParentId" TEXT,
ADD COLUMN "eliminationScope" TEXT,
ADD COLUMN "eliminationCurrencyBasis" TEXT,
ADD COLUMN "investmentInSubsidiaryAccountId" TEXT,
ADD COLUMN "nciEquityAccountId" TEXT,
ADD COLUMN "nciIncomeStatementAccountId" TEXT,
ADD COLUMN "realizedFxGainAccountId" TEXT,
ADD COLUMN "realizedFxLossAccountId" TEXT,
ADD COLUMN "unrealizedFxGainAccountId" TEXT,
ADD COLUMN "unrealizedFxLossAccountId" TEXT,
ADD COLUMN "allowTransactions" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowBankAccounts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowInventory" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allowPayroll" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "allowProjects" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "subsidiaries_eliminationTargetParentId_idx" ON "subsidiaries"("eliminationTargetParentId");
CREATE INDEX "subsidiaries_investmentInSubsidiaryAccountId_idx" ON "subsidiaries"("investmentInSubsidiaryAccountId");
CREATE INDEX "subsidiaries_nciEquityAccountId_idx" ON "subsidiaries"("nciEquityAccountId");
CREATE INDEX "subsidiaries_nciIncomeStatementAccountId_idx" ON "subsidiaries"("nciIncomeStatementAccountId");
CREATE INDEX "subsidiaries_realizedFxGainAccountId_idx" ON "subsidiaries"("realizedFxGainAccountId");
CREATE INDEX "subsidiaries_realizedFxLossAccountId_idx" ON "subsidiaries"("realizedFxLossAccountId");
CREATE INDEX "subsidiaries_unrealizedFxGainAccountId_idx" ON "subsidiaries"("unrealizedFxGainAccountId");
CREATE INDEX "subsidiaries_unrealizedFxLossAccountId_idx" ON "subsidiaries"("unrealizedFxLossAccountId");

ALTER TABLE "subsidiaries"
ADD CONSTRAINT "subsidiaries_eliminationTargetParentId_fkey" FOREIGN KEY ("eliminationTargetParentId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "subsidiaries_investmentInSubsidiaryAccountId_fkey" FOREIGN KEY ("investmentInSubsidiaryAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "subsidiaries_nciEquityAccountId_fkey" FOREIGN KEY ("nciEquityAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "subsidiaries_nciIncomeStatementAccountId_fkey" FOREIGN KEY ("nciIncomeStatementAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "subsidiaries_realizedFxGainAccountId_fkey" FOREIGN KEY ("realizedFxGainAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "subsidiaries_realizedFxLossAccountId_fkey" FOREIGN KEY ("realizedFxLossAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "subsidiaries_unrealizedFxGainAccountId_fkey" FOREIGN KEY ("unrealizedFxGainAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "subsidiaries_unrealizedFxLossAccountId_fkey" FOREIGN KEY ("unrealizedFxLossAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
