ALTER TABLE "bank_connections"
ADD COLUMN IF NOT EXISTS "connectionCategory" TEXT NOT NULL DEFAULT 'bank_feed';
