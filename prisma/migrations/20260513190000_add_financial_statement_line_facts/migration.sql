CREATE OR REPLACE VIEW "financial_statement_line_facts" AS
SELECT
  line."id" AS "journal_entry_line_item_id",
  line."journalEntryId" AS "journal_entry_id",
  journal."number" AS "journal_number",
  journal."date" AS "journal_date",
  journal."description" AS "journal_description",
  journal."status" AS "journal_status",
  journal."sourceType" AS "source_type",
  journal."sourceId" AS "source_id",
  journal."subsidiaryId" AS "journal_subsidiary_id",
  line."subsidiaryId" AS "line_subsidiary_id",
  line."accountId" AS "account_id",
  account."accountNumber" AS "account_number",
  account."name" AS "account_name",
  account."accountType" AS "account_type",
  account."normalBalance" AS "normal_balance",
  account."financialStatementSection" AS "financial_statement_section",
  account."financialStatementGroup" AS "financial_statement_group",
  account."financialStatementCategory" AS "financial_statement_category",
  account."active" AS "account_active",
  account."isPosting" AS "account_is_posting",
  line."description" AS "line_description",
  line."displayOrder" AS "display_order",
  line."debit" AS "transaction_debit",
  line."credit" AS "transaction_credit",
  line."localDebit" AS "local_debit",
  line."localCredit" AS "local_credit",
  line."functionalDebit" AS "functional_debit",
  line."functionalCredit" AS "functional_credit",
  line."groupDebit" AS "group_debit",
  line."groupCredit" AS "group_credit",
  CASE
    WHEN lower(COALESCE(account."normalBalance", 'debit')) = 'credit'
      THEN COALESCE(line."credit", 0) - COALESCE(line."debit", 0)
    ELSE COALESCE(line."debit", 0) - COALESCE(line."credit", 0)
  END AS "transaction_amount",
  CASE
    WHEN lower(COALESCE(account."normalBalance", 'debit')) = 'credit'
      THEN COALESCE(line."localCredit", 0) - COALESCE(line."localDebit", 0)
    ELSE COALESCE(line."localDebit", 0) - COALESCE(line."localCredit", 0)
  END AS "local_amount",
  CASE
    WHEN lower(COALESCE(account."normalBalance", 'debit')) = 'credit'
      THEN COALESCE(line."functionalCredit", 0) - COALESCE(line."functionalDebit", 0)
    ELSE COALESCE(line."functionalDebit", 0) - COALESCE(line."functionalCredit", 0)
  END AS "functional_amount",
  CASE
    WHEN lower(COALESCE(account."normalBalance", 'debit')) = 'credit'
      THEN COALESCE(line."groupCredit", 0) - COALESCE(line."groupDebit", 0)
    ELSE COALESCE(line."groupDebit", 0) - COALESCE(line."groupCredit", 0)
  END AS "group_amount",
  (
    line."localDebit" IS NULL
    AND line."localCredit" IS NULL
    AND (COALESCE(line."debit", 0) <> 0 OR COALESCE(line."credit", 0) <> 0)
  ) AS "missing_local_layer",
  (
    line."functionalDebit" IS NULL
    AND line."functionalCredit" IS NULL
    AND (COALESCE(line."debit", 0) <> 0 OR COALESCE(line."credit", 0) <> 0)
  ) AS "missing_functional_layer",
  (
    line."groupDebit" IS NULL
    AND line."groupCredit" IS NULL
    AND (COALESCE(line."debit", 0) <> 0 OR COALESCE(line."credit", 0) <> 0)
  ) AS "missing_group_layer"
FROM "journal_entry_line_items" line
JOIN "journal_entries" journal ON journal."id" = line."journalEntryId"
JOIN "chart_of_accounts" account ON account."id" = line."accountId";
