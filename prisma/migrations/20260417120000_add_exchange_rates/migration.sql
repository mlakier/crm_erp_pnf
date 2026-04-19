CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "rateType" TEXT NOT NULL DEFAULT 'spot',
    "source" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "baseCurrencyId" TEXT NOT NULL,
    "quoteCurrencyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exchange_rates_baseCurrencyId_quoteCurrencyId_effectiveDate_rateType_key"
ON "exchange_rates"("baseCurrencyId", "quoteCurrencyId", "effectiveDate", "rateType");

CREATE INDEX "exchange_rates_effectiveDate_idx" ON "exchange_rates"("effectiveDate");
CREATE INDEX "exchange_rates_baseCurrencyId_quoteCurrencyId_idx" ON "exchange_rates"("baseCurrencyId", "quoteCurrencyId");
CREATE INDEX "exchange_rates_quoteCurrencyId_idx" ON "exchange_rates"("quoteCurrencyId");

ALTER TABLE "exchange_rates"
ADD CONSTRAINT "exchange_rates_baseCurrencyId_fkey"
FOREIGN KEY ("baseCurrencyId") REFERENCES "currencies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exchange_rates"
ADD CONSTRAINT "exchange_rates_quoteCurrencyId_fkey"
FOREIGN KEY ("quoteCurrencyId") REFERENCES "currencies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
