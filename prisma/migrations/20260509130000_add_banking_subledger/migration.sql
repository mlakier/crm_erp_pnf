CREATE TABLE IF NOT EXISTS "bank_connections" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "institutionName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'not_connected',
  "health" TEXT NOT NULL DEFAULT 'not_configured',
  "syncFrequency" TEXT NOT NULL DEFAULT 'daily',
  "lastSyncAt" TIMESTAMP(3),
  "consentExpiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_connections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_connections_connectionId_key" ON "bank_connections"("connectionId");

CREATE TABLE IF NOT EXISTS "bank_accounts" (
  "id" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "accountType" TEXT NOT NULL,
  "maskedAccountNumber" TEXT,
  "statementSource" TEXT NOT NULL DEFAULT 'manual_import',
  "paymentFileFormat" TEXT,
  "checkNumberPrefix" TEXT,
  "nextCheckNumber" INTEGER,
  "reconciliationStartDate" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "subsidiaryId" TEXT NOT NULL,
  "currencyId" TEXT NOT NULL,
  "glAccountId" TEXT NOT NULL,
  "connectionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_accounts_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bank_accounts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bank_accounts_glAccountId_fkey" FOREIGN KEY ("glAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bank_accounts_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_accounts_bankAccountId_key" ON "bank_accounts"("bankAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "bank_accounts_glAccountId_key" ON "bank_accounts"("glAccountId");
CREATE INDEX IF NOT EXISTS "bank_accounts_subsidiaryId_idx" ON "bank_accounts"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "bank_accounts_currencyId_idx" ON "bank_accounts"("currencyId");
CREATE INDEX IF NOT EXISTS "bank_accounts_connectionId_idx" ON "bank_accounts"("connectionId");

CREATE TABLE IF NOT EXISTS "bank_feed_transactions" (
  "id" TEXT NOT NULL,
  "bankTransactionId" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "connectionId" TEXT,
  "externalId" TEXT,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "postedDate" TIMESTAMP(3),
  "description" TEXT NOT NULL,
  "counterparty" TEXT,
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'unmatched',
  "matchedRecordType" TEXT,
  "matchedRecordId" TEXT,
  "matchConfidence" DECIMAL(5,2),
  "suggestedMatchReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_feed_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_feed_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bank_feed_transactions_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "bank_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "bank_feed_transactions_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_feed_transactions_bankTransactionId_key" ON "bank_feed_transactions"("bankTransactionId");
CREATE INDEX IF NOT EXISTS "bank_feed_transactions_bankAccountId_idx" ON "bank_feed_transactions"("bankAccountId");
CREATE INDEX IF NOT EXISTS "bank_feed_transactions_connectionId_idx" ON "bank_feed_transactions"("connectionId");
CREATE INDEX IF NOT EXISTS "bank_feed_transactions_currencyId_idx" ON "bank_feed_transactions"("currencyId");
CREATE INDEX IF NOT EXISTS "bank_feed_transactions_status_idx" ON "bank_feed_transactions"("status");

CREATE TABLE IF NOT EXISTS "bank_statements" (
  "id" TEXT NOT NULL,
  "statementId" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "statementDate" TIMESTAMP(3) NOT NULL,
  "periodStartDate" TIMESTAMP(3) NOT NULL,
  "periodEndDate" TIMESTAMP(3) NOT NULL,
  "openingBalance" DECIMAL(18,2) NOT NULL,
  "closingBalance" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'imported',
  "source" TEXT NOT NULL DEFAULT 'manual_import',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_statements_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_statements_statementId_key" ON "bank_statements"("statementId");
CREATE INDEX IF NOT EXISTS "bank_statements_bankAccountId_idx" ON "bank_statements"("bankAccountId");
CREATE INDEX IF NOT EXISTS "bank_statements_statementDate_idx" ON "bank_statements"("statementDate");

CREATE TABLE IF NOT EXISTS "bank_statement_lines" (
  "id" TEXT NOT NULL,
  "statementLineId" TEXT NOT NULL,
  "statementId" TEXT NOT NULL,
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyId" TEXT NOT NULL,
  "reference" TEXT,
  "matchedRecordType" TEXT,
  "matchedRecordId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'unmatched',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_statement_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_statement_lines_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bank_statement_lines_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_statement_lines_statementLineId_key" ON "bank_statement_lines"("statementLineId");
CREATE INDEX IF NOT EXISTS "bank_statement_lines_statementId_idx" ON "bank_statement_lines"("statementId");
CREATE INDEX IF NOT EXISTS "bank_statement_lines_currencyId_idx" ON "bank_statement_lines"("currencyId");
CREATE INDEX IF NOT EXISTS "bank_statement_lines_status_idx" ON "bank_statement_lines"("status");

CREATE TABLE IF NOT EXISTS "bank_reconciliations" (
  "id" TEXT NOT NULL,
  "reconciliationId" TEXT NOT NULL,
  "bankAccountId" TEXT NOT NULL,
  "subsidiaryId" TEXT NOT NULL,
  "periodEndDate" TIMESTAMP(3) NOT NULL,
  "bankStatementBalance" DECIMAL(18,2) NOT NULL,
  "glBalance" DECIMAL(18,2) NOT NULL,
  "difference" DECIMAL(18,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "aiReviewStatus" TEXT NOT NULL DEFAULT 'not_started',
  "reviewerNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "bank_reconciliations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bank_reconciliations_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "bank_reconciliations_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "bank_reconciliations_reconciliationId_key" ON "bank_reconciliations"("reconciliationId");
CREATE INDEX IF NOT EXISTS "bank_reconciliations_bankAccountId_idx" ON "bank_reconciliations"("bankAccountId");
CREATE INDEX IF NOT EXISTS "bank_reconciliations_subsidiaryId_idx" ON "bank_reconciliations"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "bank_reconciliations_periodEndDate_idx" ON "bank_reconciliations"("periodEndDate");
