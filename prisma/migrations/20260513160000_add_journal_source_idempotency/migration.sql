-- Enforce idempotency for system-generated journal postings.
-- PostgreSQL allows multiple NULL values in a unique index, so manual journals
-- without source metadata can continue to exist while sourced journals cannot
-- be duplicated.
CREATE UNIQUE INDEX "journal_entries_source_type_source_id_key"
ON "journal_entries"("sourceType", "sourceId");
