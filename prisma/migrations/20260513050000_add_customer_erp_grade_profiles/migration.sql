-- ERP-grade customer master normalization foundation.
-- Existing customer columns stay in place for compatibility; these child tables
-- carry entity-specific accounting, address, tax, credit, dimension, contract,
-- and audit records going forward.

ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "mobile" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "contactType" TEXT;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "receivesStatements" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "receivesDunning" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "receivesContractNotices" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "receivesTaxNotices" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "receivesSupportNotices" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "customer_entity_settings" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "subsidiaryId" TEXT,
  "isEnabledForEntity" BOOLEAN NOT NULL DEFAULT true,
  "defaultArAccountId" TEXT,
  "defaultRevenueAccountId" TEXT,
  "defaultDeferredRevenueAccountId" TEXT,
  "defaultUnbilledArAccountId" TEXT,
  "paymentTerms" TEXT,
  "defaultDueDays" INTEGER,
  "currencyId" TEXT,
  "taxCode" TEXT,
  "creditLimit" DECIMAL(18,2),
  "billingHold" BOOLEAN NOT NULL DEFAULT false,
  "billingHoldReason" TEXT,
  "invoiceDeliveryMethod" TEXT,
  "intercompanyPartnerSubsidiaryId" TEXT,
  "inactive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_entity_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_addresses" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "addressId" TEXT,
  "addressType" TEXT NOT NULL DEFAULT 'billing',
  "attentionTo" TEXT,
  "line1" TEXT,
  "line2" TEXT,
  "city" TEXT,
  "stateRegion" TEXT,
  "postalCode" TEXT,
  "countryCode" TEXT,
  "taxJurisdictionId" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_tax_profiles" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "taxProfileId" TEXT,
  "subsidiaryId" TEXT,
  "taxCountry" TEXT,
  "taxRegistrationNumber" TEXT,
  "taxExempt" BOOLEAN NOT NULL DEFAULT false,
  "taxExemptionCertificateId" TEXT,
  "taxExemptionExpirationDate" TIMESTAMP(3),
  "resaleCertificateNumber" TEXT,
  "vatReverseChargeApplicable" BOOLEAN NOT NULL DEFAULT false,
  "taxCode" TEXT,
  "taxEngineCustomerCode" TEXT,
  "taxValidationStatus" TEXT,
  "validatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_tax_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_credit_profiles" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "creditProfileId" TEXT,
  "subsidiaryId" TEXT,
  "creditLimit" DECIMAL(18,2),
  "creditCurrencyId" TEXT,
  "creditStatus" TEXT NOT NULL DEFAULT 'pending_review',
  "creditRating" TEXT,
  "creditReviewDate" TIMESTAMP(3),
  "nextCreditReviewDate" TIMESTAMP(3),
  "averageDaysToPay" DECIMAL(10,2),
  "highestBalance" DECIMAL(18,2),
  "dunningLevel" TEXT,
  "collectionsOwnerUserId" TEXT,
  "creditHold" BOOLEAN NOT NULL DEFAULT false,
  "creditHoldReason" TEXT,
  "collectionsHold" BOOLEAN NOT NULL DEFAULT false,
  "blockCollectionEmail" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_credit_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_dimension_defaults" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "subsidiaryId" TEXT,
  "dimensionDefinitionId" TEXT NOT NULL,
  "dimensionValueId" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3),
  "effectiveTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_dimension_defaults_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_contracts" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "contractNumber" TEXT NOT NULL,
  "contractStatus" TEXT NOT NULL DEFAULT 'draft',
  "contractStartDate" TIMESTAMP(3),
  "contractEndDate" TIMESTAMP(3),
  "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  "renewalTermMonths" INTEGER,
  "noticePeriodDays" INTEGER,
  "billingTerms" TEXT,
  "contractCurrencyId" TEXT,
  "signedDocumentId" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "customer_audit_log" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "fieldName" TEXT,
  "oldValue" TEXT,
  "newValue" TEXT,
  "changeReason" TEXT,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_entity_settings_customerId_subsidiaryId_key" ON "customer_entity_settings"("customerId", "subsidiaryId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_addresses_addressId_key" ON "customer_addresses"("addressId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_tax_profiles_taxProfileId_key" ON "customer_tax_profiles"("taxProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_credit_profiles_creditProfileId_key" ON "customer_credit_profiles"("creditProfileId");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_dimension_defaults_customerId_subsidiaryId_dimensionDefinitionId_effectiveFrom_key" ON "customer_dimension_defaults"("customerId", "subsidiaryId", "dimensionDefinitionId", "effectiveFrom");
CREATE UNIQUE INDEX IF NOT EXISTS "customer_contracts_contractNumber_key" ON "customer_contracts"("contractNumber");

CREATE INDEX IF NOT EXISTS "customer_entity_settings_customerId_idx" ON "customer_entity_settings"("customerId");
CREATE INDEX IF NOT EXISTS "customer_entity_settings_subsidiaryId_idx" ON "customer_entity_settings"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "customer_entity_settings_currencyId_idx" ON "customer_entity_settings"("currencyId");
CREATE INDEX IF NOT EXISTS "customer_entity_settings_defaultArAccountId_idx" ON "customer_entity_settings"("defaultArAccountId");
CREATE INDEX IF NOT EXISTS "customer_entity_settings_defaultRevenueAccountId_idx" ON "customer_entity_settings"("defaultRevenueAccountId");
CREATE INDEX IF NOT EXISTS "customer_entity_settings_defaultDeferredRevenueAccountId_idx" ON "customer_entity_settings"("defaultDeferredRevenueAccountId");
CREATE INDEX IF NOT EXISTS "customer_entity_settings_defaultUnbilledArAccountId_idx" ON "customer_entity_settings"("defaultUnbilledArAccountId");
CREATE INDEX IF NOT EXISTS "customer_entity_settings_intercompanyPartnerSubsidiaryId_idx" ON "customer_entity_settings"("intercompanyPartnerSubsidiaryId");
CREATE INDEX IF NOT EXISTS "customer_addresses_customerId_idx" ON "customer_addresses"("customerId");
CREATE INDEX IF NOT EXISTS "customer_addresses_addressType_idx" ON "customer_addresses"("addressType");
CREATE INDEX IF NOT EXISTS "customer_addresses_countryCode_idx" ON "customer_addresses"("countryCode");
CREATE INDEX IF NOT EXISTS "customer_tax_profiles_customerId_idx" ON "customer_tax_profiles"("customerId");
CREATE INDEX IF NOT EXISTS "customer_tax_profiles_subsidiaryId_idx" ON "customer_tax_profiles"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "customer_tax_profiles_taxCountry_idx" ON "customer_tax_profiles"("taxCountry");
CREATE INDEX IF NOT EXISTS "customer_tax_profiles_taxCode_idx" ON "customer_tax_profiles"("taxCode");
CREATE INDEX IF NOT EXISTS "customer_credit_profiles_customerId_idx" ON "customer_credit_profiles"("customerId");
CREATE INDEX IF NOT EXISTS "customer_credit_profiles_subsidiaryId_idx" ON "customer_credit_profiles"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "customer_credit_profiles_creditCurrencyId_idx" ON "customer_credit_profiles"("creditCurrencyId");
CREATE INDEX IF NOT EXISTS "customer_credit_profiles_collectionsOwnerUserId_idx" ON "customer_credit_profiles"("collectionsOwnerUserId");
CREATE INDEX IF NOT EXISTS "customer_credit_profiles_creditStatus_idx" ON "customer_credit_profiles"("creditStatus");
CREATE INDEX IF NOT EXISTS "customer_dimension_defaults_customerId_idx" ON "customer_dimension_defaults"("customerId");
CREATE INDEX IF NOT EXISTS "customer_dimension_defaults_subsidiaryId_idx" ON "customer_dimension_defaults"("subsidiaryId");
CREATE INDEX IF NOT EXISTS "customer_dimension_defaults_dimensionDefinitionId_idx" ON "customer_dimension_defaults"("dimensionDefinitionId");
CREATE INDEX IF NOT EXISTS "customer_dimension_defaults_dimensionValueId_idx" ON "customer_dimension_defaults"("dimensionValueId");
CREATE INDEX IF NOT EXISTS "customer_contracts_customerId_idx" ON "customer_contracts"("customerId");
CREATE INDEX IF NOT EXISTS "customer_contracts_contractCurrencyId_idx" ON "customer_contracts"("contractCurrencyId");
CREATE INDEX IF NOT EXISTS "customer_contracts_contractStatus_idx" ON "customer_contracts"("contractStatus");
CREATE INDEX IF NOT EXISTS "customer_audit_log_customerId_idx" ON "customer_audit_log"("customerId");
CREATE INDEX IF NOT EXISTS "customer_audit_log_actorUserId_idx" ON "customer_audit_log"("actorUserId");
CREATE INDEX IF NOT EXISTS "customer_audit_log_action_idx" ON "customer_audit_log"("action");

ALTER TABLE "customer_entity_settings" ADD CONSTRAINT "customer_entity_settings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_entity_settings" ADD CONSTRAINT "customer_entity_settings_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_entity_settings" ADD CONSTRAINT "customer_entity_settings_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_entity_settings" ADD CONSTRAINT "customer_entity_settings_defaultArAccountId_fkey" FOREIGN KEY ("defaultArAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_entity_settings" ADD CONSTRAINT "customer_entity_settings_defaultRevenueAccountId_fkey" FOREIGN KEY ("defaultRevenueAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_entity_settings" ADD CONSTRAINT "customer_entity_settings_defaultDeferredRevenueAccountId_fkey" FOREIGN KEY ("defaultDeferredRevenueAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_entity_settings" ADD CONSTRAINT "customer_entity_settings_defaultUnbilledArAccountId_fkey" FOREIGN KEY ("defaultUnbilledArAccountId") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_entity_settings" ADD CONSTRAINT "customer_entity_settings_intercompanyPartnerSubsidiaryId_fkey" FOREIGN KEY ("intercompanyPartnerSubsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_tax_profiles" ADD CONSTRAINT "customer_tax_profiles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_tax_profiles" ADD CONSTRAINT "customer_tax_profiles_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_credit_profiles" ADD CONSTRAINT "customer_credit_profiles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_credit_profiles" ADD CONSTRAINT "customer_credit_profiles_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_credit_profiles" ADD CONSTRAINT "customer_credit_profiles_creditCurrencyId_fkey" FOREIGN KEY ("creditCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_credit_profiles" ADD CONSTRAINT "customer_credit_profiles_collectionsOwnerUserId_fkey" FOREIGN KEY ("collectionsOwnerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_dimension_defaults" ADD CONSTRAINT "customer_dimension_defaults_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_dimension_defaults" ADD CONSTRAINT "customer_dimension_defaults_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_dimension_defaults" ADD CONSTRAINT "customer_dimension_defaults_dimensionDefinitionId_fkey" FOREIGN KEY ("dimensionDefinitionId") REFERENCES "dimension_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_dimension_defaults" ADD CONSTRAINT "customer_dimension_defaults_dimensionValueId_fkey" FOREIGN KEY ("dimensionValueId") REFERENCES "dimension_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_contracts" ADD CONSTRAINT "customer_contracts_contractCurrencyId_fkey" FOREIGN KEY ("contractCurrencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_audit_log" ADD CONSTRAINT "customer_audit_log_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_audit_log" ADD CONSTRAINT "customer_audit_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "customer_entity_settings" (
  "id",
  "customerId",
  "subsidiaryId",
  "defaultArAccountId",
  "currencyId",
  "taxCode",
  "isEnabledForEntity",
  "inactive",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('ces-', "id"),
  "id",
  "subsidiaryId",
  "arAccountId",
  "currencyId",
  "taxItem",
  true,
  "inactive",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "customers"
WHERE "subsidiaryId" IS NOT NULL
   OR "arAccountId" IS NOT NULL
   OR "currencyId" IS NOT NULL
   OR "taxItem" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "customer_addresses" (
  "id",
  "customerId",
  "addressId",
  "addressType",
  "line1",
  "isPrimary",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('caddr-', "id"),
  "id",
  concat('CADDR-', "customerId"),
  'billing',
  "address",
  true,
  true,
  "createdAt",
  CURRENT_TIMESTAMP
FROM "customers"
WHERE "address" IS NOT NULL
  AND btrim("address") <> ''
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "customer_tax_profiles" (
  "id",
  "customerId",
  "taxProfileId",
  "subsidiaryId",
  "taxExempt",
  "resaleCertificateNumber",
  "taxCode",
  "taxValidationStatus",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('ctax-', "id"),
  "id",
  concat('CTAX-', "customerId"),
  "subsidiaryId",
  NOT "taxable",
  "resaleNumber",
  "taxItem",
  CASE WHEN "taxItem" IS NOT NULL OR "resaleNumber" IS NOT NULL THEN 'pending' ELSE NULL END,
  "createdAt",
  CURRENT_TIMESTAMP
FROM "customers"
WHERE "taxable" = true
   OR "taxItem" IS NOT NULL
   OR "resaleNumber" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "customer_credit_profiles" (
  "id",
  "customerId",
  "creditProfileId",
  "subsidiaryId",
  "creditCurrencyId",
  "creditStatus",
  "collectionsOwnerUserId",
  "collectionsHold",
  "blockCollectionEmail",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('ccrp-', "id"),
  "id",
  concat('CCR-', "customerId"),
  "subsidiaryId",
  "currencyId",
  'pending_review',
  NULL,
  false,
  "blockCollectionEmail",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "customers"
WHERE "currencyId" IS NOT NULL
   OR "subsidiaryId" IS NOT NULL
   OR "blockCollectionEmail" = true
   OR "collectionsRep" IS NOT NULL
ON CONFLICT ("id") DO NOTHING;
