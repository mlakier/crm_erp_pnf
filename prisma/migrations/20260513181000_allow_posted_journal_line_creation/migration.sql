DROP TRIGGER IF EXISTS journal_entry_line_items_prevent_posted_mutation ON "journal_entry_line_items";
CREATE TRIGGER journal_entry_line_items_prevent_posted_mutation
BEFORE UPDATE OR DELETE ON "journal_entry_line_items"
FOR EACH ROW
EXECUTE FUNCTION prevent_posted_journal_line_item_mutation();
