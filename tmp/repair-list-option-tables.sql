CREATE TABLE IF NOT EXISTS "customer_industry_options" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_industry_options_value_key"
  ON "customer_industry_options"("value");

CREATE INDEX IF NOT EXISTS "customer_industry_options_sortOrder_idx"
  ON "customer_industry_options"("sortOrder");

CREATE TABLE IF NOT EXISTS "item_type_options" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "item_type_options_value_key"
  ON "item_type_options"("value");

CREATE INDEX IF NOT EXISTS "item_type_options_sortOrder_idx"
  ON "item_type_options"("sortOrder");

CREATE TABLE IF NOT EXISTS "lead_source_options" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_source_options_value_key"
  ON "lead_source_options"("value");

CREATE INDEX IF NOT EXISTS "lead_source_options_sortOrder_idx"
  ON "lead_source_options"("sortOrder");

CREATE TABLE IF NOT EXISTS "lead_rating_options" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_rating_options_value_key"
  ON "lead_rating_options"("value");

CREATE INDEX IF NOT EXISTS "lead_rating_options_sortOrder_idx"
  ON "lead_rating_options"("sortOrder");

CREATE TABLE IF NOT EXISTS "opportunity_stage_options" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "opportunity_stage_options_value_key"
  ON "opportunity_stage_options"("value");

CREATE INDEX IF NOT EXISTS "opportunity_stage_options_sortOrder_idx"
  ON "opportunity_stage_options"("sortOrder");