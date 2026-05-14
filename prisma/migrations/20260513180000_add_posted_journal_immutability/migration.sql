CREATE OR REPLACE FUNCTION prevent_posted_journal_entry_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD."status" = 'posted' THEN
    RAISE EXCEPTION 'Posted journal entries are immutable and cannot be deleted';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD."status" = 'posted' THEN
    RAISE EXCEPTION 'Posted journal entries are immutable and cannot be updated';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entries_prevent_posted_mutation ON "journal_entries";
CREATE TRIGGER journal_entries_prevent_posted_mutation
BEFORE UPDATE OR DELETE ON "journal_entries"
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_journal_entry_mutation();

CREATE OR REPLACE FUNCTION prevent_posted_journal_line_item_mutation()
RETURNS trigger AS $$
DECLARE
  parent_status text;
  parent_journal_entry_id text;
BEGIN
  parent_journal_entry_id := COALESCE(NEW."journalEntryId", OLD."journalEntryId");

  SELECT "status"
    INTO parent_status
    FROM "journal_entries"
   WHERE "id" = parent_journal_entry_id;

  IF parent_status = 'posted' THEN
    RAISE EXCEPTION 'Posted journal entry lines are immutable and cannot be changed';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journal_entry_line_items_prevent_posted_mutation ON "journal_entry_line_items";
CREATE TRIGGER journal_entry_line_items_prevent_posted_mutation
BEFORE INSERT OR UPDATE OR DELETE ON "journal_entry_line_items"
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_journal_line_item_mutation();
