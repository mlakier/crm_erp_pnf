CREATE TABLE IF NOT EXISTS "bank_deposits" (
  "id" TEXT NOT NULL,
  "depositNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "depositDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "memo" TEXT,
  "bankAccountId" TEXT NOT NULL,
  "subsidiaryId" TEXT NOT NULL,
  "currencyId" TEXT NOT NULL,
  "offsetAccountId" TEXT,
  "bankFeedTransactionId" TEXT,
  "journalEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_deposits_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_deposits_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bank_deposits_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bank_deposits_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bank_deposits_offsetAccountId_fkey" FOREIGN KEY ("offsetAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_deposits_depositNumber_key" ON "bank_deposits"("depositNumber");
CREATE INDEX IF NOT EXISTS "bank_deposits_bankAccountId_idx" ON "bank_deposits"("bankAccountId");
CREATE INDEX IF NOT EXISTS "bank_deposits_subsidiaryId_idx" ON "bank_deposits"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "bank_deposits_currencyId_idx" ON "bank_deposits"("currencyId");
CREATE INDEX IF NOT EXISTS "bank_deposits_offsetAccountId_idx" ON "bank_deposits"("offsetAccountId");
CREATE INDEX IF NOT EXISTS "bank_deposits_status_idx" ON "bank_deposits"("status");

CREATE TABLE IF NOT EXISTS "bank_transfers" (
  "id" TEXT NOT NULL,
  "transferNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "transferDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "memo" TEXT,
  "fromBankAccountId" TEXT NOT NULL,
  "toBankAccountId" TEXT,
  "subsidiaryId" TEXT NOT NULL,
  "currencyId" TEXT NOT NULL,
  "bankFeedTransactionId" TEXT,
  "journalEntryId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_transfers_fromBankAccountId_fkey" FOREIGN KEY ("fromBankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bank_transfers_toBankAccountId_fkey" FOREIGN KEY ("toBankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "bank_transfers_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bank_transfers_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_transfers_transferNumber_key" ON "bank_transfers"("transferNumber");
CREATE INDEX IF NOT EXISTS "bank_transfers_fromBankAccountId_idx" ON "bank_transfers"("fromBankAccountId");
CREATE INDEX IF NOT EXISTS "bank_transfers_toBankAccountId_idx" ON "bank_transfers"("toBankAccountId");
CREATE INDEX IF NOT EXISTS "bank_transfers_subsidiaryId_idx" ON "bank_transfers"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "bank_transfers_currencyId_idx" ON "bank_transfers"("currencyId");
CREATE INDEX IF NOT EXISTS "bank_transfers_status_idx" ON "bank_transfers"("status");

CREATE TABLE IF NOT EXISTS "bank_checks" (
  "id" TEXT NOT NULL,
  "checkTransactionNumber" TEXT NOT NULL,
  "checkNumber" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'issued',
  "checkDate" TIMESTAMP(3) NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "payeeName" TEXT NOT NULL,
  "memo" TEXT,
  "bankAccountId" TEXT NOT NULL,
  "vendorId" TEXT,
  "subsidiaryId" TEXT NOT NULL,
  "currencyId" TEXT NOT NULL,
  "billPaymentId" TEXT,
  "bankFeedTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_checks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_checks_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bank_checks_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "bank_checks_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bank_checks_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bank_checks_billPaymentId_fkey" FOREIGN KEY ("billPaymentId") REFERENCES "bill_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_checks_checkTransactionNumber_key" ON "bank_checks"("checkTransactionNumber");
CREATE INDEX IF NOT EXISTS "bank_checks_bankAccountId_idx" ON "bank_checks"("bankAccountId");
CREATE INDEX IF NOT EXISTS "bank_checks_vendorId_idx" ON "bank_checks"("vendorId");
CREATE INDEX IF NOT EXISTS "bank_checks_subsidiaryId_idx" ON "bank_checks"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "bank_checks_currencyId_idx" ON "bank_checks"("currencyId");
CREATE INDEX IF NOT EXISTS "bank_checks_billPaymentId_idx" ON "bank_checks"("billPaymentId");
CREATE INDEX IF NOT EXISTS "bank_checks_status_idx" ON "bank_checks"("status");
