-- System-generated journal entries use the SJE-* namespace. Use a database
-- sequence so concurrent posting workers cannot allocate the same number.
CREATE SEQUENCE IF NOT EXISTS "system_journal_number_seq" START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

SELECT setval(
  '"system_journal_number_seq"',
  GREATEST(
    1,
    COALESCE((
      SELECT MAX((substring("number" from '^SJE-(\d+)$'))::integer)
      FROM "journal_entries"
      WHERE "number" ~ '^SJE-\d+$'
    ), 0)
  ),
  true
);
