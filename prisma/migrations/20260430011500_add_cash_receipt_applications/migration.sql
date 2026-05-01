CREATE TABLE "cash_receipt_applications" (
  "id" TEXT NOT NULL,
  "cashReceiptId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "appliedAmount" DECIMAL(18,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cash_receipt_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_receipt_applications_cashReceiptId_invoiceId_key"
ON "cash_receipt_applications"("cashReceiptId", "invoiceId");

CREATE INDEX "cash_receipt_applications_cashReceiptId_idx"
ON "cash_receipt_applications"("cashReceiptId");

CREATE INDEX "cash_receipt_applications_invoiceId_idx"
ON "cash_receipt_applications"("invoiceId");

ALTER TABLE "cash_receipt_applications"
ADD CONSTRAINT "cash_receipt_applications_cashReceiptId_fkey"
FOREIGN KEY ("cashReceiptId") REFERENCES "cash_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cash_receipt_applications"
ADD CONSTRAINT "cash_receipt_applications_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
