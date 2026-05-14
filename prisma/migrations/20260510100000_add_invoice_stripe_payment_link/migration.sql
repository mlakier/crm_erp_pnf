ALTER TABLE "invoices"
  ADD COLUMN "stripeCheckoutSessionId" TEXT,
  ADD COLUMN "stripePaymentUrl" TEXT,
  ADD COLUMN "stripePaymentUrlExpiresAt" TIMESTAMP(3),
  ADD COLUMN "stripePaymentLinkCreatedAt" TIMESTAMP(3);

CREATE INDEX "invoices_stripeCheckoutSessionId_idx" ON "invoices"("stripeCheckoutSessionId");
