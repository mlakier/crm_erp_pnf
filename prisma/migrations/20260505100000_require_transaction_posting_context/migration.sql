-- DropForeignKey
ALTER TABLE "bill_credits" DROP CONSTRAINT "bill_credits_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "bill_credits" DROP CONSTRAINT "bill_credits_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "bill_payments" DROP CONSTRAINT "bill_payments_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "bill_payments" DROP CONSTRAINT "bill_payments_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "bills" DROP CONSTRAINT "bills_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "bills" DROP CONSTRAINT "bills_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "cash_receipts" DROP CONSTRAINT "cash_receipts_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "cash_receipts" DROP CONSTRAINT "cash_receipts_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "credit_memos" DROP CONSTRAINT "credit_memos_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "credit_memos" DROP CONSTRAINT "credit_memos_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "customer_refunds" DROP CONSTRAINT "customer_refunds_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "customer_refunds" DROP CONSTRAINT "customer_refunds_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "fulfillments" DROP CONSTRAINT "fulfillments_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "fulfillments" DROP CONSTRAINT "fulfillments_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "opportunities" DROP CONSTRAINT "opportunities_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "purchase_orders" DROP CONSTRAINT "purchase_orders_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "receipts" DROP CONSTRAINT "receipts_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "requisitions" DROP CONSTRAINT "requisitions_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "requisitions" DROP CONSTRAINT "requisitions_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_orders_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "sales_orders" DROP CONSTRAINT "sales_orders_subsidiaryId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_refunds" DROP CONSTRAINT "vendor_refunds_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "vendor_refunds" DROP CONSTRAINT "vendor_refunds_subsidiaryId_fkey";

-- AlterTable
ALTER TABLE "bill_credits" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "bill_payments" ALTER COLUMN "currencyId" SET NOT NULL,
ALTER COLUMN "subsidiaryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "bills" ALTER COLUMN "currencyId" SET NOT NULL,
ALTER COLUMN "subsidiaryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "cash_receipts" ALTER COLUMN "currencyId" SET NOT NULL,
ALTER COLUMN "subsidiaryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "clearing_document_headers" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "transactionCurrencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "credit_memos" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "customer_refunds" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "fulfillments" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "invoices" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "journal_entries" ALTER COLUMN "currencyId" SET NOT NULL,
ALTER COLUMN "subsidiaryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "open_items" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "transactionCurrencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "opportunities" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "quotes" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "receipts" ALTER COLUMN "currencyId" SET NOT NULL,
ALTER COLUMN "subsidiaryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "requisitions" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "sales_orders" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AlterTable
ALTER TABLE "vendor_refunds" ALTER COLUMN "subsidiaryId" SET NOT NULL,
ALTER COLUMN "currencyId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_receipts" ADD CONSTRAINT "cash_receipts_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_receipts" ADD CONSTRAINT "cash_receipts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_refunds" ADD CONSTRAINT "customer_refunds_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_refunds" ADD CONSTRAINT "customer_refunds_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_refunds" ADD CONSTRAINT "vendor_refunds_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_refunds" ADD CONSTRAINT "vendor_refunds_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_memos" ADD CONSTRAINT "credit_memos_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_memos" ADD CONSTRAINT "credit_memos_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_credits" ADD CONSTRAINT "bill_credits_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_credits" ADD CONSTRAINT "bill_credits_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bills" ADD CONSTRAINT "bills_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bill_payments" ADD CONSTRAINT "bill_payments_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
