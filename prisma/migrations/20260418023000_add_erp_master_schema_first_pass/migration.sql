-- AlterTable
ALTER TABLE "accounting_periods" ADD COLUMN     "apLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "arLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "entityId" TEXT,
ADD COLUMN     "inventoryLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open';

-- AlterTable
ALTER TABLE "bill_line_items" ADD COLUMN     "allocatedAmount" DOUBLE PRECISION,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "performanceObligationCode" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "revRecTemplateId" TEXT,
ADD COLUMN     "serviceEndDate" TIMESTAMP(3),
ADD COLUMN     "serviceStartDate" TIMESTAMP(3),
ADD COLUMN     "standaloneSellingPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "chart_of_accounts" ADD COLUMN     "allowsManualPosting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cashFlowCategory" TEXT,
ADD COLUMN     "closeToAccountId" TEXT,
ADD COLUMN     "financialStatementGroup" TEXT,
ADD COLUMN     "financialStatementSection" TEXT,
ADD COLUMN     "isControlAccount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPosting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "normalBalance" TEXT,
ADD COLUMN     "parentAccountId" TEXT,
ADD COLUMN     "requiresSubledgerType" TEXT;

-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "costCenterCode" TEXT,
ADD COLUMN     "departmentType" TEXT,
ADD COLUMN     "parentDepartmentId" TEXT,
ADD COLUMN     "segmentReportingGroup" TEXT,
ADD COLUMN     "sharedServicesFlag" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "approverEmployeeId" TEXT,
ADD COLUMN     "billableFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "billingRate" DOUBLE PRECISION,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "expenseApproverEmployeeId" TEXT,
ADD COLUMN     "laborCostRate" DOUBLE PRECISION,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN     "allocatedAmount" DOUBLE PRECISION,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "performanceObligationCode" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "revRecTemplateId" TEXT,
ADD COLUMN     "serviceEndDate" TIMESTAMP(3),
ADD COLUMN     "serviceStartDate" TIMESTAMP(3),
ADD COLUMN     "standaloneSellingPrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "averageCost" DOUBLE PRECISION,
ADD COLUMN     "billingType" TEXT,
ADD COLUMN     "defaultRevRecTemplateId" TEXT,
ADD COLUMN     "defaultTermMonths" INTEGER,
ADD COLUMN     "isDistinctPerformanceObligation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recognitionMethod" TEXT,
ADD COLUMN     "recognitionTrigger" TEXT,
ADD COLUMN     "revenueStream" TEXT,
ADD COLUMN     "standaloneSellingPrice" DOUBLE PRECISION,
ADD COLUMN     "standardCost" DOUBLE PRECISION,
ADD COLUMN     "taxCode" TEXT;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "accountingPeriodId" TEXT,
ADD COLUMN     "approvedByEmployeeId" TEXT,
ADD COLUMN     "postedByEmployeeId" TEXT,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- AlterTable
ALTER TABLE "journal_entry_line_items" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "itemId" TEXT,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "memo" TEXT,
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "subsidiaries" ADD COLUMN     "consolidationMethod" TEXT,
ADD COLUMN     "ctaAccountId" TEXT,
ADD COLUMN     "dueFromAccountId" TEXT,
ADD COLUMN     "dueToAccountId" TEXT,
ADD COLUMN     "fiscalCalendarId" TEXT,
ADD COLUMN     "functionalCurrencyId" TEXT,
ADD COLUMN     "intercompanyClearingAccountId" TEXT,
ADD COLUMN     "ownershipPercent" DOUBLE PRECISION,
ADD COLUMN     "periodLockDate" TIMESTAMP(3),
ADD COLUMN     "reportingCurrencyId" TEXT,
ADD COLUMN     "retainedEarningsAccountId" TEXT;

-- CreateTable
CREATE TABLE "rev_rec_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recognitionMethod" TEXT NOT NULL,
    "scheduleType" TEXT NOT NULL,
    "defaultTermMonths" INTEGER,
    "catchUpAllowed" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rev_rec_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rev_rec_templates_code_key" ON "rev_rec_templates"("code");

-- CreateIndex
CREATE INDEX "accounting_periods_entityId_idx" ON "accounting_periods"("entityId");

-- CreateIndex
CREATE INDEX "bill_line_items_departmentId_idx" ON "bill_line_items"("departmentId");

-- CreateIndex
CREATE INDEX "bill_line_items_locationId_idx" ON "bill_line_items"("locationId");

-- CreateIndex
CREATE INDEX "bill_line_items_projectId_idx" ON "bill_line_items"("projectId");

-- CreateIndex
CREATE INDEX "bill_line_items_revRecTemplateId_idx" ON "bill_line_items"("revRecTemplateId");

-- CreateIndex
CREATE INDEX "chart_of_accounts_parentAccountId_idx" ON "chart_of_accounts"("parentAccountId");

-- CreateIndex
CREATE INDEX "chart_of_accounts_closeToAccountId_idx" ON "chart_of_accounts"("closeToAccountId");

-- CreateIndex
CREATE INDEX "departments_parentDepartmentId_idx" ON "departments"("parentDepartmentId");

-- CreateIndex
CREATE INDEX "departments_managerId_idx" ON "departments"("managerId");

-- CreateIndex
CREATE INDEX "employees_locationId_idx" ON "employees"("locationId");

-- CreateIndex
CREATE INDEX "employees_approverEmployeeId_idx" ON "employees"("approverEmployeeId");

-- CreateIndex
CREATE INDEX "employees_expenseApproverEmployeeId_idx" ON "employees"("expenseApproverEmployeeId");

-- CreateIndex
CREATE INDEX "invoice_line_items_departmentId_idx" ON "invoice_line_items"("departmentId");

-- CreateIndex
CREATE INDEX "invoice_line_items_locationId_idx" ON "invoice_line_items"("locationId");

-- CreateIndex
CREATE INDEX "invoice_line_items_projectId_idx" ON "invoice_line_items"("projectId");

-- CreateIndex
CREATE INDEX "invoice_line_items_revRecTemplateId_idx" ON "invoice_line_items"("revRecTemplateId");

-- CreateIndex
CREATE INDEX "items_defaultRevRecTemplateId_idx" ON "items"("defaultRevRecTemplateId");

-- CreateIndex
CREATE INDEX "journal_entries_postedByEmployeeId_idx" ON "journal_entries"("postedByEmployeeId");

-- CreateIndex
CREATE INDEX "journal_entries_approvedByEmployeeId_idx" ON "journal_entries"("approvedByEmployeeId");

-- CreateIndex
CREATE INDEX "journal_entries_accountingPeriodId_idx" ON "journal_entries"("accountingPeriodId");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_departmentId_idx" ON "journal_entry_line_items"("departmentId");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_locationId_idx" ON "journal_entry_line_items"("locationId");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_projectId_idx" ON "journal_entry_line_items"("projectId");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_customerId_idx" ON "journal_entry_line_items"("customerId");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_vendorId_idx" ON "journal_entry_line_items"("vendorId");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_itemId_idx" ON "journal_entry_line_items"("itemId");

-- CreateIndex
CREATE INDEX "journal_entry_line_items_employeeId_idx" ON "journal_entry_line_items"("employeeId");

-- CreateIndex
CREATE INDEX "subsidiaries_functionalCurrencyId_idx" ON "subsidiaries"("functionalCurrencyId");

-- CreateIndex
CREATE INDEX "subsidiaries_reportingCurrencyId_idx" ON "subsidiaries"("reportingCurrencyId");

-- CreateIndex
CREATE INDEX "subsidiaries_retainedEarningsAccountId_idx" ON "subsidiaries"("retainedEarningsAccountId");

-- CreateIndex
CREATE INDEX "subsidiaries_ctaAccountId_idx" ON "subsidiaries"("ctaAccountId");

-- CreateIndex
CREATE INDEX "subsidiaries_intercompanyClearingAccountId_idx" ON "subsidiaries"("intercompanyClearingAccountId");

-- CreateIndex
CREATE INDEX "subsidiaries_dueToAccountId_idx" ON "subsidiaries"("dueToAccountId");

-- CreateIndex
CREATE INDEX "subsidiaries_dueFromAccountId_idx" ON "subsidiaries"("dueFromAccountId");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_closeToAccountId_fkey" FOREIGN KEY ("closeToAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_revRecTemplateId_fkey" FOREIGN KEY ("revRecTemplateId") REFERENCES "rev_rec_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_line_items" ADD CONSTRAINT "bill_line_items_revRecTemplateId_fkey" FOREIGN KEY ("revRecTemplateId") REFERENCES "rev_rec_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line_items" ADD CONSTRAINT "journal_entry_line_items_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line_items" ADD CONSTRAINT "journal_entry_line_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line_items" ADD CONSTRAINT "journal_entry_line_items_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line_items" ADD CONSTRAINT "journal_entry_line_items_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line_items" ADD CONSTRAINT "journal_entry_line_items_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line_items" ADD CONSTRAINT "journal_entry_line_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line_items" ADD CONSTRAINT "journal_entry_line_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_postedByEmployeeId_fkey" FOREIGN KEY ("postedByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_accountingPeriodId_fkey" FOREIGN KEY ("accountingPeriodId") REFERENCES "accounting_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subsidiaries" ADD CONSTRAINT "subsidiaries_functionalCurrencyId_fkey" FOREIGN KEY ("functionalCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subsidiaries" ADD CONSTRAINT "subsidiaries_reportingCurrencyId_fkey" FOREIGN KEY ("reportingCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subsidiaries" ADD CONSTRAINT "subsidiaries_retainedEarningsAccountId_fkey" FOREIGN KEY ("retainedEarningsAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subsidiaries" ADD CONSTRAINT "subsidiaries_ctaAccountId_fkey" FOREIGN KEY ("ctaAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subsidiaries" ADD CONSTRAINT "subsidiaries_intercompanyClearingAccountId_fkey" FOREIGN KEY ("intercompanyClearingAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subsidiaries" ADD CONSTRAINT "subsidiaries_dueToAccountId_fkey" FOREIGN KEY ("dueToAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subsidiaries" ADD CONSTRAINT "subsidiaries_dueFromAccountId_fkey" FOREIGN KEY ("dueFromAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_defaultRevRecTemplateId_fkey" FOREIGN KEY ("defaultRevRecTemplateId") REFERENCES "rev_rec_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_approverEmployeeId_fkey" FOREIGN KEY ("approverEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_expenseApproverEmployeeId_fkey" FOREIGN KEY ("expenseApproverEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "exchange_rates_baseCurrencyId_quoteCurrencyId_effectiveDate_rat" RENAME TO "exchange_rates_baseCurrencyId_quoteCurrencyId_effectiveDate_key";
