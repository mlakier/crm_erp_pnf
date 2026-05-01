CREATE TABLE "customer_refunds" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "amount" DECIMAL(18,2) NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "method" TEXT NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "bankAccountId" TEXT,
  "customerId" TEXT NOT NULL,
  "cashReceiptId" TEXT,
  "userId" TEXT,
  "subsidiaryId" TEXT,
  "currencyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_refunds_number_key" ON "customer_refunds"("number");
CREATE INDEX "customer_refunds_status_idx" ON "customer_refunds"("status");
CREATE INDEX "customer_refunds_customerId_idx" ON "customer_refunds"("customerId");
CREATE INDEX "customer_refunds_cashReceiptId_idx" ON "customer_refunds"("cashReceiptId");
CREATE INDEX "customer_refunds_bankAccountId_idx" ON "customer_refunds"("bankAccountId");
CREATE INDEX "customer_refunds_userId_idx" ON "customer_refunds"("userId");
CREATE INDEX "customer_refunds_subsidiaryId_idx" ON "customer_refunds"("subsidiaryId");
CREATE INDEX "customer_refunds_currencyId_idx" ON "customer_refunds"("currencyId");

ALTER TABLE "customer_refunds"
ADD CONSTRAINT "customer_refunds_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_refunds"
ADD CONSTRAINT "customer_refunds_cashReceiptId_fkey"
FOREIGN KEY ("cashReceiptId") REFERENCES "cash_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_refunds"
ADD CONSTRAINT "customer_refunds_bankAccountId_fkey"
FOREIGN KEY ("bankAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_refunds"
ADD CONSTRAINT "customer_refunds_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_refunds"
ADD CONSTRAINT "customer_refunds_subsidiaryId_fkey"
FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "customer_refunds"
ADD CONSTRAINT "customer_refunds_currencyId_fkey"
FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
