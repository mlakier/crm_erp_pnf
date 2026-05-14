CREATE TABLE "billing_schedules" (
  "id" TEXT NOT NULL,
  "billingScheduleId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "scheduleType" TEXT,
  "frequency" TEXT,
  "billingTiming" TEXT,
  "billingAnchor" TEXT,
  "billingDay" INTEGER,
  "prorationPolicy" TEXT,
  "renewalMode" TEXT,
  "invoiceGroupingPolicy" TEXT,
  "graceDays" INTEGER,
  "minimumBillAmount" DECIMAL(18,2),
  "currencyId" TEXT,
  "inactive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_accounts" (
  "id" TEXT NOT NULL,
  "billingAccountId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "customerId" TEXT,
  "accountType" TEXT,
  "status" TEXT DEFAULT 'active',
  "subsidiaryId" TEXT,
  "includeChildren" BOOLEAN NOT NULL DEFAULT false,
  "currencyId" TEXT,
  "defaultBillingScheduleId" TEXT,
  "defaultPriceBookId" TEXT,
  "defaultPriceLevelId" TEXT,
  "billToContactId" TEXT,
  "invoiceDeliveryMethod" TEXT,
  "billingEmail" TEXT,
  "billingAddress" TEXT,
  "paymentTerms" TEXT,
  "paymentMethod" TEXT,
  "paymentInstrumentId" TEXT,
  "consolidateInvoices" BOOLEAN NOT NULL DEFAULT true,
  "requiresPurchaseOrder" BOOLEAN NOT NULL DEFAULT false,
  "poNumber" TEXT,
  "taxable" BOOLEAN NOT NULL DEFAULT false,
  "taxCode" TEXT,
  "taxRegistrationStatus" TEXT,
  "creditHold" BOOLEAN NOT NULL DEFAULT false,
  "collectionsHold" BOOLEAN NOT NULL DEFAULT false,
  "directDebitEnabled" BOOLEAN NOT NULL DEFAULT false,
  "inactive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription_plans" (
  "id" TEXT NOT NULL,
  "subscriptionPlanId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "planType" TEXT,
  "billingModel" TEXT,
  "status" TEXT DEFAULT 'draft',
  "itemId" TEXT,
  "subsidiaryId" TEXT,
  "includeChildren" BOOLEAN NOT NULL DEFAULT false,
  "currencyId" TEXT,
  "defaultBillingScheduleId" TEXT,
  "defaultPriceBookId" TEXT,
  "defaultPriceLevelId" TEXT,
  "termMonths" INTEGER,
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "renewalMode" TEXT,
  "renewalTermMonths" INTEGER,
  "usageRatingModel" TEXT,
  "includedQuantity" DECIMAL(18,4),
  "overageRate" DECIMAL(18,4),
  "minimumCommitAmount" DECIMAL(18,2),
  "setupFeeAmount" DECIMAL(18,2),
  "revenueRecognitionPolicy" TEXT,
  "revenueAccountId" TEXT,
  "deferredRevenueAccountId" TEXT,
  "costAccountId" TEXT,
  "deferredCostAccountId" TEXT,
  "inactive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_schedules_billingScheduleId_key" ON "billing_schedules"("billingScheduleId");
CREATE INDEX "billing_schedules_scheduleType_idx" ON "billing_schedules"("scheduleType");
CREATE INDEX "billing_schedules_frequency_idx" ON "billing_schedules"("frequency");
CREATE INDEX "billing_schedules_currencyId_idx" ON "billing_schedules"("currencyId");
CREATE INDEX "billing_schedules_inactive_idx" ON "billing_schedules"("inactive");

CREATE UNIQUE INDEX "billing_accounts_billingAccountId_key" ON "billing_accounts"("billingAccountId");
CREATE INDEX "billing_accounts_customerId_idx" ON "billing_accounts"("customerId");
CREATE INDEX "billing_accounts_accountType_idx" ON "billing_accounts"("accountType");
CREATE INDEX "billing_accounts_status_idx" ON "billing_accounts"("status");
CREATE INDEX "billing_accounts_subsidiaryId_idx" ON "billing_accounts"("subsidiaryId");
CREATE INDEX "billing_accounts_currencyId_idx" ON "billing_accounts"("currencyId");
CREATE INDEX "billing_accounts_defaultBillingScheduleId_idx" ON "billing_accounts"("defaultBillingScheduleId");
CREATE INDEX "billing_accounts_defaultPriceBookId_idx" ON "billing_accounts"("defaultPriceBookId");
CREATE INDEX "billing_accounts_defaultPriceLevelId_idx" ON "billing_accounts"("defaultPriceLevelId");
CREATE INDEX "billing_accounts_billToContactId_idx" ON "billing_accounts"("billToContactId");
CREATE INDEX "billing_accounts_paymentInstrumentId_idx" ON "billing_accounts"("paymentInstrumentId");
CREATE INDEX "billing_accounts_inactive_idx" ON "billing_accounts"("inactive");

CREATE UNIQUE INDEX "subscription_plans_subscriptionPlanId_key" ON "subscription_plans"("subscriptionPlanId");
CREATE INDEX "subscription_plans_planType_idx" ON "subscription_plans"("planType");
CREATE INDEX "subscription_plans_billingModel_idx" ON "subscription_plans"("billingModel");
CREATE INDEX "subscription_plans_status_idx" ON "subscription_plans"("status");
CREATE INDEX "subscription_plans_itemId_idx" ON "subscription_plans"("itemId");
CREATE INDEX "subscription_plans_subsidiaryId_idx" ON "subscription_plans"("subsidiaryId");
CREATE INDEX "subscription_plans_currencyId_idx" ON "subscription_plans"("currencyId");
CREATE INDEX "subscription_plans_defaultBillingScheduleId_idx" ON "subscription_plans"("defaultBillingScheduleId");
CREATE INDEX "subscription_plans_defaultPriceBookId_idx" ON "subscription_plans"("defaultPriceBookId");
CREATE INDEX "subscription_plans_defaultPriceLevelId_idx" ON "subscription_plans"("defaultPriceLevelId");
CREATE INDEX "subscription_plans_revenueAccountId_idx" ON "subscription_plans"("revenueAccountId");
CREATE INDEX "subscription_plans_deferredRevenueAccountId_idx" ON "subscription_plans"("deferredRevenueAccountId");
CREATE INDEX "subscription_plans_costAccountId_idx" ON "subscription_plans"("costAccountId");
CREATE INDEX "subscription_plans_deferredCostAccountId_idx" ON "subscription_plans"("deferredCostAccountId");
CREATE INDEX "subscription_plans_inactive_idx" ON "subscription_plans"("inactive");

ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_defaultBillingScheduleId_fkey" FOREIGN KEY ("defaultBillingScheduleId") REFERENCES "billing_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_defaultPriceBookId_fkey" FOREIGN KEY ("defaultPriceBookId") REFERENCES "price_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_defaultPriceLevelId_fkey" FOREIGN KEY ("defaultPriceLevelId") REFERENCES "price_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_billToContactId_fkey" FOREIGN KEY ("billToContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_paymentInstrumentId_fkey" FOREIGN KEY ("paymentInstrumentId") REFERENCES "customer_payment_instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_defaultBillingScheduleId_fkey" FOREIGN KEY ("defaultBillingScheduleId") REFERENCES "billing_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_defaultPriceBookId_fkey" FOREIGN KEY ("defaultPriceBookId") REFERENCES "price_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_defaultPriceLevelId_fkey" FOREIGN KEY ("defaultPriceLevelId") REFERENCES "price_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_revenueAccountId_fkey" FOREIGN KEY ("revenueAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_deferredRevenueAccountId_fkey" FOREIGN KEY ("deferredRevenueAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_costAccountId_fkey" FOREIGN KEY ("costAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_deferredCostAccountId_fkey" FOREIGN KEY ("deferredCostAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
