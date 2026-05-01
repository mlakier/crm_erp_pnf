-- AlterTable
ALTER TABLE "customer_refunds" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "isOpenItemRelevant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reversalReasonCode" TEXT,
ADD COLUMN     "reversesJournalEntryId" TEXT;

-- AlterTable
ALTER TABLE "journal_entry_line_items" ADD COLUMN     "activityTypeCode" TEXT,
ADD COLUMN     "reconciliationGroupKey" TEXT,
ADD COLUMN     "reconciliationInstanceId" TEXT,
ADD COLUMN     "reversesJournalEntryLineItemId" TEXT;

-- CreateTable
CREATE TABLE "activity_type_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "defaultRollForwardGroup" TEXT,
    "isSystemDefined" BOOLEAN NOT NULL DEFAULT true,
    "isOpenItemRelevant" BOOLEAN NOT NULL DEFAULT false,
    "isClearingRelevant" BOOLEAN NOT NULL DEFAULT false,
    "isFxRelevant" BOOLEAN NOT NULL DEFAULT false,
    "isIntercompanyRelevant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_type_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_headers" (
    "id" TEXT NOT NULL,
    "runNumber" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "triggerType" TEXT NOT NULL DEFAULT 'manual',
    "scopeType" TEXT,
    "scopeJson" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "asOfDate" TIMESTAMP(3),
    "accountingPeriodId" TEXT,
    "subsidiaryScope" TEXT,
    "message" TEXT,
    "summaryJson" TEXT,
    "requestedById" TEXT,
    "startedById" TEXT,
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "run_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_items" (
    "id" TEXT NOT NULL,
    "runHeaderId" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceRecordType" TEXT,
    "sourceRecordId" TEXT,
    "sourceLineId" TEXT,
    "targetRecordType" TEXT,
    "targetRecordId" TEXT,
    "targetLineId" TEXT,
    "message" TEXT,
    "requestPayloadJson" TEXT,
    "resultPayloadJson" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "run_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_output_links" (
    "id" TEXT NOT NULL,
    "runHeaderId" TEXT NOT NULL,
    "runItemId" TEXT,
    "outputType" TEXT NOT NULL,
    "outputRecordType" TEXT,
    "outputRecordId" TEXT,
    "outputLineId" TEXT,
    "glHeaderId" TEXT,
    "glLineId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "run_output_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_exceptions" (
    "id" TEXT NOT NULL,
    "runHeaderId" TEXT NOT NULL,
    "runItemId" TEXT,
    "severity" TEXT NOT NULL,
    "exceptionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sourceRecordType" TEXT,
    "sourceRecordId" TEXT,
    "message" TEXT NOT NULL,
    "detailsJson" TEXT,
    "assignedToId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "run_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_items" (
    "id" TEXT NOT NULL,
    "openItemNumber" TEXT NOT NULL,
    "openItemType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "subsidiaryId" TEXT,
    "transactionCurrencyId" TEXT,
    "localCurrencyId" TEXT,
    "functionalCurrencyId" TEXT,
    "sourceTransactionType" TEXT,
    "sourceTransactionId" TEXT,
    "sourceTransactionLineId" TEXT,
    "sourceNumber" TEXT,
    "counterpartyType" TEXT,
    "counterpartyId" TEXT,
    "documentDate" TIMESTAMP(3),
    "postingDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "originalTransactionAmount" DECIMAL(18,2) NOT NULL,
    "originalLocalAmount" DECIMAL(18,2),
    "originalFunctionalAmount" DECIMAL(18,2),
    "openItemEligible" BOOLEAN NOT NULL DEFAULT true,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_item_entries" (
    "id" TEXT NOT NULL,
    "openItemId" TEXT NOT NULL,
    "entryNumber" INTEGER NOT NULL,
    "entryType" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "postingDate" TIMESTAMP(3),
    "accountingPeriodId" TEXT,
    "transactionAmount" DECIMAL(18,2) NOT NULL,
    "localAmount" DECIMAL(18,2),
    "functionalAmount" DECIMAL(18,2),
    "sourceTransactionType" TEXT,
    "sourceTransactionId" TEXT,
    "sourceTransactionLineId" TEXT,
    "sourceApplicationId" TEXT,
    "sourceGlLineId" TEXT,
    "sourceRunId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "open_item_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "open_item_applications" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "applicationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fromOpenItemId" TEXT NOT NULL,
    "toOpenItemId" TEXT,
    "settlementTransactionType" TEXT,
    "settlementTransactionId" TEXT,
    "applicationDate" TIMESTAMP(3) NOT NULL,
    "postingDate" TIMESTAMP(3),
    "transactionAmount" DECIMAL(18,2) NOT NULL,
    "localAmount" DECIMAL(18,2),
    "functionalAmount" DECIMAL(18,2),
    "exchangeRateContextId" TEXT,
    "reversesApplicationId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "open_item_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearing_document_headers" (
    "id" TEXT NOT NULL,
    "clearingNumber" TEXT NOT NULL,
    "clearingType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "subsidiaryId" TEXT,
    "transactionCurrencyId" TEXT,
    "localCurrencyId" TEXT,
    "functionalCurrencyId" TEXT,
    "clearingDate" TIMESTAMP(3) NOT NULL,
    "postingDate" TIMESTAMP(3),
    "accountingPeriodId" TEXT,
    "sourceTransactionType" TEXT,
    "sourceTransactionId" TEXT,
    "sourceRunId" TEXT,
    "counterpartyType" TEXT,
    "counterpartyId" TEXT,
    "transactionAmount" DECIMAL(18,2) NOT NULL,
    "localAmount" DECIMAL(18,2),
    "functionalAmount" DECIMAL(18,2),
    "realizedFxLocalAmount" DECIMAL(18,2),
    "realizedFxFunctionalAmount" DECIMAL(18,2),
    "memo" TEXT,
    "reversesClearingDocumentId" TEXT,
    "reversedByClearingDocumentId" TEXT,
    "autoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "automationSource" TEXT,
    "exceptionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "postedById" TEXT,
    "reversedById" TEXT,

    CONSTRAINT "clearing_document_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearing_document_lines" (
    "id" TEXT NOT NULL,
    "clearingDocumentId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "lineRole" TEXT NOT NULL,
    "fromOpenItemId" TEXT,
    "toOpenItemId" TEXT,
    "sourceTransactionType" TEXT,
    "sourceTransactionId" TEXT,
    "sourceTransactionLineId" TEXT,
    "settlementTransactionType" TEXT,
    "settlementTransactionId" TEXT,
    "settlementTransactionLineId" TEXT,
    "originalExchangeRateContextId" TEXT,
    "settlementExchangeRateContextId" TEXT,
    "transactionAmount" DECIMAL(18,2) NOT NULL,
    "localAmount" DECIMAL(18,2),
    "functionalAmount" DECIMAL(18,2),
    "realizedFxLocalAmount" DECIMAL(18,2),
    "realizedFxFunctionalAmount" DECIMAL(18,2),
    "openItemApplicationId" TEXT,
    "sourceGlLineId" TEXT,
    "settlementGlLineId" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clearing_document_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_type_definitions_code_key" ON "activity_type_definitions"("code");

-- CreateIndex
CREATE INDEX "activity_type_definitions_category_idx" ON "activity_type_definitions"("category");

-- CreateIndex
CREATE INDEX "activity_type_definitions_status_idx" ON "activity_type_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "run_headers_runNumber_key" ON "run_headers"("runNumber");

-- CreateIndex
CREATE INDEX "run_headers_runType_idx" ON "run_headers"("runType");

-- CreateIndex
CREATE INDEX "run_headers_status_idx" ON "run_headers"("status");

-- CreateIndex
CREATE INDEX "run_headers_accountingPeriodId_idx" ON "run_headers"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "run_headers_requestedAt_idx" ON "run_headers"("requestedAt");

-- CreateIndex
CREATE INDEX "run_items_status_idx" ON "run_items"("status");

-- CreateIndex
CREATE INDEX "run_items_sourceRecordType_sourceRecordId_idx" ON "run_items"("sourceRecordType", "sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "run_items_runHeaderId_itemNumber_key" ON "run_items"("runHeaderId", "itemNumber");

-- CreateIndex
CREATE INDEX "run_output_links_runItemId_idx" ON "run_output_links"("runItemId");

-- CreateIndex
CREATE INDEX "run_output_links_outputRecordType_outputRecordId_idx" ON "run_output_links"("outputRecordType", "outputRecordId");

-- CreateIndex
CREATE INDEX "run_output_links_glHeaderId_idx" ON "run_output_links"("glHeaderId");

-- CreateIndex
CREATE INDEX "run_exceptions_runItemId_idx" ON "run_exceptions"("runItemId");

-- CreateIndex
CREATE INDEX "run_exceptions_status_idx" ON "run_exceptions"("status");

-- CreateIndex
CREATE INDEX "run_exceptions_assignedToId_idx" ON "run_exceptions"("assignedToId");

-- CreateIndex
CREATE INDEX "run_exceptions_sourceRecordType_sourceRecordId_idx" ON "run_exceptions"("sourceRecordType", "sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "open_items_openItemNumber_key" ON "open_items"("openItemNumber");

-- CreateIndex
CREATE INDEX "open_items_status_idx" ON "open_items"("status");

-- CreateIndex
CREATE INDEX "open_items_isOpen_idx" ON "open_items"("isOpen");

-- CreateIndex
CREATE INDEX "open_items_openItemType_idx" ON "open_items"("openItemType");

-- CreateIndex
CREATE INDEX "open_items_subsidiaryId_idx" ON "open_items"("subsidiaryId");

-- CreateIndex
CREATE INDEX "open_items_sourceTransactionType_sourceTransactionId_idx" ON "open_items"("sourceTransactionType", "sourceTransactionId");

-- CreateIndex
CREATE INDEX "open_items_counterpartyType_counterpartyId_idx" ON "open_items"("counterpartyType", "counterpartyId");

-- CreateIndex
CREATE INDEX "open_items_subsidiaryId_isOpen_postingDate_idx" ON "open_items"("subsidiaryId", "isOpen", "postingDate");

-- CreateIndex
CREATE INDEX "open_items_counterpartyType_counterpartyId_isOpen_idx" ON "open_items"("counterpartyType", "counterpartyId", "isOpen");

-- CreateIndex
CREATE INDEX "open_item_entries_entryType_idx" ON "open_item_entries"("entryType");

-- CreateIndex
CREATE INDEX "open_item_entries_postingDate_idx" ON "open_item_entries"("postingDate");

-- CreateIndex
CREATE INDEX "open_item_entries_sourceApplicationId_idx" ON "open_item_entries"("sourceApplicationId");

-- CreateIndex
CREATE INDEX "open_item_entries_sourceTransactionType_sourceTransactionId_idx" ON "open_item_entries"("sourceTransactionType", "sourceTransactionId");

-- CreateIndex
CREATE INDEX "open_item_entries_sourceGlLineId_idx" ON "open_item_entries"("sourceGlLineId");

-- CreateIndex
CREATE INDEX "open_item_entries_openItemId_effectiveDate_idx" ON "open_item_entries"("openItemId", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "open_item_entries_openItemId_entryNumber_key" ON "open_item_entries"("openItemId", "entryNumber");

-- CreateIndex
CREATE UNIQUE INDEX "open_item_applications_applicationNumber_key" ON "open_item_applications"("applicationNumber");

-- CreateIndex
CREATE INDEX "open_item_applications_fromOpenItemId_idx" ON "open_item_applications"("fromOpenItemId");

-- CreateIndex
CREATE INDEX "open_item_applications_toOpenItemId_idx" ON "open_item_applications"("toOpenItemId");

-- CreateIndex
CREATE INDEX "open_item_applications_applicationDate_idx" ON "open_item_applications"("applicationDate");

-- CreateIndex
CREATE INDEX "open_item_applications_postingDate_idx" ON "open_item_applications"("postingDate");

-- CreateIndex
CREATE INDEX "open_item_applications_settlementTransactionType_settlement_idx" ON "open_item_applications"("settlementTransactionType", "settlementTransactionId");

-- CreateIndex
CREATE INDEX "open_item_applications_reversesApplicationId_idx" ON "open_item_applications"("reversesApplicationId");

-- CreateIndex
CREATE INDEX "open_item_applications_fromOpenItemId_applicationDate_idx" ON "open_item_applications"("fromOpenItemId", "applicationDate");

-- CreateIndex
CREATE INDEX "open_item_applications_toOpenItemId_applicationDate_idx" ON "open_item_applications"("toOpenItemId", "applicationDate");

-- CreateIndex
CREATE UNIQUE INDEX "clearing_document_headers_clearingNumber_key" ON "clearing_document_headers"("clearingNumber");

-- CreateIndex
CREATE INDEX "clearing_document_headers_status_idx" ON "clearing_document_headers"("status");

-- CreateIndex
CREATE INDEX "clearing_document_headers_clearingType_idx" ON "clearing_document_headers"("clearingType");

-- CreateIndex
CREATE INDEX "clearing_document_headers_clearingDate_idx" ON "clearing_document_headers"("clearingDate");

-- CreateIndex
CREATE INDEX "clearing_document_headers_sourceTransactionType_sourceTrans_idx" ON "clearing_document_headers"("sourceTransactionType", "sourceTransactionId");

-- CreateIndex
CREATE INDEX "clearing_document_headers_sourceRunId_idx" ON "clearing_document_headers"("sourceRunId");

-- CreateIndex
CREATE INDEX "clearing_document_headers_counterpartyType_counterpartyId_idx" ON "clearing_document_headers"("counterpartyType", "counterpartyId");

-- CreateIndex
CREATE INDEX "clearing_document_headers_autoGenerated_idx" ON "clearing_document_headers"("autoGenerated");

-- CreateIndex
CREATE INDEX "clearing_document_headers_exceptionStatus_idx" ON "clearing_document_headers"("exceptionStatus");

-- CreateIndex
CREATE INDEX "clearing_document_lines_fromOpenItemId_idx" ON "clearing_document_lines"("fromOpenItemId");

-- CreateIndex
CREATE INDEX "clearing_document_lines_toOpenItemId_idx" ON "clearing_document_lines"("toOpenItemId");

-- CreateIndex
CREATE INDEX "clearing_document_lines_openItemApplicationId_idx" ON "clearing_document_lines"("openItemApplicationId");

-- CreateIndex
CREATE INDEX "clearing_document_lines_sourceTransactionType_sourceTransac_idx" ON "clearing_document_lines"("sourceTransactionType", "sourceTransactionId");

-- CreateIndex
CREATE INDEX "clearing_document_lines_settlementTransactionType_settlemen_idx" ON "clearing_document_lines"("settlementTransactionType", "settlementTransactionId");

-- CreateIndex
CREATE INDEX "clearing_document_lines_sourceGlLineId_idx" ON "clearing_document_lines"("sourceGlLineId");

-- CreateIndex
CREATE INDEX "clearing_document_lines_settlementGlLineId_idx" ON "clearing_document_lines"("settlementGlLineId");

-- CreateIndex
CREATE UNIQUE INDEX "clearing_document_lines_clearingDocumentId_lineNumber_key" ON "clearing_document_lines"("clearingDocumentId", "lineNumber");

-- CreateIndex
CREATE INDEX "journal_entries_reversesJournalEntryId_idx" ON "journal_entries"("reversesJournalEntryId");

-- CreateIndex
CREATE INDEX "journal_entries_isOpenItemRelevant_idx" ON "journal_entries"("isOpenItemRelevant");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_activityTypeCode_idx" ON "journal_entry_line_items"("activityTypeCode");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_reversesJournalEntryLineItemId_idx" ON "journal_entry_line_items"("reversesJournalEntryLineItemId");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_reconciliationGroupKey_idx" ON "journal_entry_line_items"("reconciliationGroupKey");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_reconciliationInstanceId_idx" ON "journal_entry_line_items"("reconciliationInstanceId");

-- AddForeignKey
ALTER TABLE "run_headers" ADD CONSTRAINT "run_headers_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_items" ADD CONSTRAINT "run_items_runHeaderId_fkey" FOREIGN KEY ("runHeaderId") REFERENCES "run_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_output_links" ADD CONSTRAINT "run_output_links_runHeaderId_fkey" FOREIGN KEY ("runHeaderId") REFERENCES "run_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_output_links" ADD CONSTRAINT "run_output_links_runItemId_fkey" FOREIGN KEY ("runItemId") REFERENCES "run_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_exceptions" ADD CONSTRAINT "run_exceptions_runHeaderId_fkey" FOREIGN KEY ("runHeaderId") REFERENCES "run_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_exceptions" ADD CONSTRAINT "run_exceptions_runItemId_fkey" FOREIGN KEY ("runItemId") REFERENCES "run_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_item_entries" ADD CONSTRAINT "open_item_entries_openItemId_fkey" FOREIGN KEY ("openItemId") REFERENCES "open_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_item_entries" ADD CONSTRAINT "open_item_entries_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_item_applications" ADD CONSTRAINT "open_item_applications_fromOpenItemId_fkey" FOREIGN KEY ("fromOpenItemId") REFERENCES "open_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_item_applications" ADD CONSTRAINT "open_item_applications_toOpenItemId_fkey" FOREIGN KEY ("toOpenItemId") REFERENCES "open_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearing_document_headers" ADD CONSTRAINT "clearing_document_headers_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearing_document_lines" ADD CONSTRAINT "clearing_document_lines_clearingDocumentId_fkey" FOREIGN KEY ("clearingDocumentId") REFERENCES "clearing_document_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearing_document_lines" ADD CONSTRAINT "clearing_document_lines_fromOpenItemId_fkey" FOREIGN KEY ("fromOpenItemId") REFERENCES "open_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearing_document_lines" ADD CONSTRAINT "clearing_document_lines_toOpenItemId_fkey" FOREIGN KEY ("toOpenItemId") REFERENCES "open_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearing_document_lines" ADD CONSTRAINT "clearing_document_lines_openItemApplicationId_fkey" FOREIGN KEY ("openItemApplicationId") REFERENCES "open_item_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
