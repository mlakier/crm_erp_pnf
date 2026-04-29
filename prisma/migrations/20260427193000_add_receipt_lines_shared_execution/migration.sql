-- CreateTable
CREATE TABLE "receipt_lines" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "receiptId" TEXT NOT NULL,
    "purchaseOrderLineItemId" TEXT,

    CONSTRAINT "receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipt_lines_receiptId_idx" ON "receipt_lines"("receiptId");

-- CreateIndex
CREATE INDEX "receipt_lines_purchaseOrderLineItemId_idx" ON "receipt_lines"("purchaseOrderLineItemId");

-- AddForeignKey
ALTER TABLE "receipt_lines"
ADD CONSTRAINT "receipt_lines_receiptId_fkey"
FOREIGN KEY ("receiptId") REFERENCES "receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_lines"
ADD CONSTRAINT "receipt_lines_purchaseOrderLineItemId_fkey"
FOREIGN KEY ("purchaseOrderLineItemId") REFERENCES "purchase_order_line_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
