-- CreateTable
CREATE TABLE "payment_runs" (
    "id" TEXT NOT NULL,
    "paymentRunNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "runDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "dueDateCutoff" TIMESTAMP(3),
    "paymentMethod" TEXT NOT NULL DEFAULT 'ach',
    "memo" TEXT,
    "bankAccountId" TEXT,
    "subsidiaryId" TEXT,
    "currencyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_run_lines" (
    "id" TEXT NOT NULL,
    "paymentRunId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "billPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_run_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_runs_paymentRunNumber_key" ON "payment_runs"("paymentRunNumber");

-- CreateIndex
CREATE INDEX "payment_runs_bankAccountId_idx" ON "payment_runs"("bankAccountId");

-- CreateIndex
CREATE INDEX "payment_runs_subsidiaryId_idx" ON "payment_runs"("subsidiaryId");

-- CreateIndex
CREATE INDEX "payment_runs_currencyId_idx" ON "payment_runs"("currencyId");

-- CreateIndex
CREATE INDEX "payment_runs_status_idx" ON "payment_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_run_lines_paymentRunId_billId_key" ON "payment_run_lines"("paymentRunId", "billId");

-- CreateIndex
CREATE INDEX "payment_run_lines_billId_idx" ON "payment_run_lines"("billId");

-- CreateIndex
CREATE INDEX "payment_run_lines_vendorId_idx" ON "payment_run_lines"("vendorId");

-- CreateIndex
CREATE INDEX "payment_run_lines_billPaymentId_idx" ON "payment_run_lines"("billPaymentId");

-- CreateIndex
CREATE INDEX "payment_run_lines_status_idx" ON "payment_run_lines"("status");

-- AddForeignKey
ALTER TABLE "payment_runs" ADD CONSTRAINT "payment_runs_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_runs" ADD CONSTRAINT "payment_runs_subsidiaryId_fkey" FOREIGN KEY ("subsidiaryId") REFERENCES "subsidiaries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_runs" ADD CONSTRAINT "payment_runs_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_run_lines" ADD CONSTRAINT "payment_run_lines_paymentRunId_fkey" FOREIGN KEY ("paymentRunId") REFERENCES "payment_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_run_lines" ADD CONSTRAINT "payment_run_lines_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_run_lines" ADD CONSTRAINT "payment_run_lines_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_run_lines" ADD CONSTRAINT "payment_run_lines_billPaymentId_fkey" FOREIGN KEY ("billPaymentId") REFERENCES "bill_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
