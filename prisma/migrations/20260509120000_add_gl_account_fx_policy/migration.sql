ALTER TABLE "chart_of_accounts"
  ADD COLUMN IF NOT EXISTS "monetaryClassification" TEXT,
  ADD COLUMN IF NOT EXISTS "translationTreatment" TEXT;
