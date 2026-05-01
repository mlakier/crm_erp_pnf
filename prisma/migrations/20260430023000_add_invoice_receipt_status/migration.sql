ALTER TABLE "cash_receipts"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';

UPDATE "cash_receipts"
SET "status" = 'posted'
WHERE EXISTS (
  SELECT 1
  FROM "journal_entries"
  WHERE "journal_entries"."sourceType" = 'invoice-receipt'
    AND "journal_entries"."sourceId" = "cash_receipts"."id"
);

CREATE INDEX "cash_receipts_status_idx"
ON "cash_receipts"("status");
