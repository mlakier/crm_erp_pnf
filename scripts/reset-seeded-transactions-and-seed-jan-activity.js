const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const FOUNDATION_SOURCE_TYPE = 'seed-ending-balance-sheet-2025';
const JAN_ACTIVITY_SOURCE_TYPE = 'seed-january-activity-2026';
const JAN_ACTIVITY_DATE = new Date(Date.UTC(2026, 0, 31));

function toMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function isCreditNormal(account) {
  const normal = String(account.normalBalance || '').toLowerCase();
  if (normal === 'credit') return true;
  if (normal === 'debit') return false;

  const type = String(account.accountType || '').toLowerCase();
  return ['liability', 'equity', 'revenue', 'income'].some((token) => type.includes(token));
}

function seededAmount(account, index) {
  const accountNumber = Number.parseInt(account.accountNumber || '', 10);
  const seed = Number.isFinite(accountNumber) ? accountNumber : index + 1;
  const type = String(account.accountType || '').toLowerCase();
  const category = String(account.financialStatementCategory || '').toLowerCase();

  let base = 250 + ((seed + index * 17) % 41) * 25;

  if (type.includes('asset')) base += 700;
  if (type.includes('liability')) base += 600;
  if (type.includes('equity')) base += 900;
  if (type.includes('revenue') || type.includes('income')) base += 1400;
  if (type.includes('expense') || category.includes('expense') || category.includes('cost')) base += 950;
  if (category.includes('cash')) base += 500;
  if (category.includes('receivable') || category.includes('payable')) base += 350;

  return toMoney(base);
}

async function deleteMany(tx, modelName, where = {}) {
  if (!tx[modelName]) return { modelName, count: 0, skipped: true };
  const result = await tx[modelName].deleteMany({ where });
  return { modelName, count: result.count, skipped: false };
}

async function nextSeedJournalNumber(tx) {
  const journals = await tx.journalEntry.findMany({
    where: { number: { startsWith: 'SJE-' } },
    select: { number: true },
  });

  const max = journals.reduce((highest, journal) => {
    const match = /^SJE-(\d+)$/.exec(journal.number || '');
    if (!match) return highest;
    return Math.max(highest, Number.parseInt(match[1], 10));
  }, 0);

  return `SJE-${max + 1}`;
}

async function ensureJanuaryPeriod(tx) {
  const existing = await tx.accountingPeriod.findFirst({
    where: {
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: JAN_ACTIVITY_DATE,
    },
  });

  if (existing) return existing;

  return tx.accountingPeriod.create({
    data: {
      name: 'Jan 2026',
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: JAN_ACTIVITY_DATE,
      status: 'open',
      closed: false,
    },
  });
}

async function createJanuaryActivityJournal(tx) {
  const accounts = await tx.chartOfAccounts.findMany({
    where: {
      active: true,
      isPosting: true,
      summary: false,
    },
    orderBy: [{ accountNumber: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      accountNumber: true,
      name: true,
      accountType: true,
      normalBalance: true,
      financialStatementCategory: true,
    },
  });

  if (accounts.length === 0) {
    throw new Error('No active posting, non-summary GL accounts found.');
  }

  const period = await ensureJanuaryPeriod(tx);
  const subsidiary = await tx.subsidiary.findFirst({
    where: { subsidiaryId: 'SUB-001' },
  }) || await tx.subsidiary.findFirst({ orderBy: { subsidiaryId: 'asc' } });
  const currency = await tx.currency.findFirst({
    where: { code: 'USD' },
  }) || await tx.currency.findFirst({ orderBy: { code: 'asc' } });

  if (!subsidiary) throw new Error('No subsidiary found for January activity journal.');
  if (!currency) throw new Error('No currency found for January activity journal.');

  const lines = accounts.map((account, index) => {
    const amount = seededAmount(account, index);
    const creditNormal = isCreditNormal(account);

    return {
      accountId: account.id,
      subsidiaryId: subsidiary.id,
      debit: creditNormal ? 0 : amount,
      credit: creditNormal ? amount : 0,
      localDebit: creditNormal ? 0 : amount,
      localCredit: creditNormal ? amount : 0,
      functionalDebit: creditNormal ? 0 : amount,
      functionalCredit: creditNormal ? amount : 0,
      groupDebit: creditNormal ? 0 : amount,
      groupCredit: creditNormal ? amount : 0,
      memo: `Seeded Jan 2026 activity - ${account.accountNumber} ${account.name}`,
      description: `Seeded Jan 2026 activity - ${account.accountNumber} ${account.name}`,
    };
  });

  const debitTotal = toMoney(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const creditTotal = toMoney(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));
  const imbalance = toMoney(debitTotal - creditTotal);

  if (imbalance !== 0) {
    const plugAccount = imbalance > 0
      ? accounts.find((account) => isCreditNormal(account) && /retained|equity|common stock/i.test(`${account.name} ${account.financialStatementCategory || ''}`))
        || accounts.find((account) => isCreditNormal(account))
      : accounts.find((account) => !isCreditNormal(account) && /cash|bank/i.test(`${account.name} ${account.financialStatementCategory || ''}`))
        || accounts.find((account) => !isCreditNormal(account));

    if (!plugAccount) {
      throw new Error('Could not find a valid balancing account for January activity journal.');
    }

    const plugLine = lines.find((line) => line.accountId === plugAccount.id);
    const plugAmount = Math.abs(imbalance);

    if (imbalance > 0) {
      plugLine.credit = toMoney(plugLine.credit + plugAmount);
      plugLine.localCredit = plugLine.credit;
      plugLine.functionalCredit = plugLine.credit;
      plugLine.groupCredit = plugLine.credit;
    } else {
      plugLine.debit = toMoney(plugLine.debit + plugAmount);
      plugLine.localDebit = plugLine.debit;
      plugLine.functionalDebit = plugLine.debit;
      plugLine.groupDebit = plugLine.debit;
    }

    plugLine.memo = `${plugLine.memo} (balanced seeded activity journal)`;
    plugLine.description = `${plugLine.description} (balanced seeded activity journal)`;
  }

  const finalDebitTotal = toMoney(lines.reduce((sum, line) => sum + Number(line.debit || 0), 0));
  const finalCreditTotal = toMoney(lines.reduce((sum, line) => sum + Number(line.credit || 0), 0));

  if (finalDebitTotal !== finalCreditTotal) {
    throw new Error(`January activity journal does not balance: debit ${finalDebitTotal}, credit ${finalCreditTotal}`);
  }

  const number = await nextSeedJournalNumber(tx);

  const journal = await tx.journalEntry.create({
    data: {
      number,
      date: JAN_ACTIVITY_DATE,
      description: 'Seeded January 2026 activity across every posting non-summary GL account',
      journalType: 'seed_january_activity',
      status: 'posted',
      total: finalDebitTotal,
      accountingPeriodId: period.id,
      subsidiaryId: subsidiary.id,
      currencyId: currency.id,
      sourceType: JAN_ACTIVITY_SOURCE_TYPE,
      sourceId: 'JAN-2026-ACTIVITY',
      lineItems: {
        create: lines,
      },
    },
  });

  return {
    journalNumber: journal.number,
    accountCount: accounts.length,
    lineCount: lines.length,
    debitTotal: finalDebitTotal,
    creditTotal: finalCreditTotal,
  };
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const deletions = [];

    deletions.push(await deleteMany(tx, 'documentRelationship'));
    deletions.push(await deleteMany(tx, 'clearingDocumentLine'));
    deletions.push(await deleteMany(tx, 'clearingDocumentHeader'));
    deletions.push(await deleteMany(tx, 'openItemApplication'));
    deletions.push(await deleteMany(tx, 'openItemEntry'));
    deletions.push(await deleteMany(tx, 'openItem'));
    deletions.push(await deleteMany(tx, 'runHeader'));

    deletions.push(await deleteMany(tx, 'bankReconciliation'));
    deletions.push(await deleteMany(tx, 'bankStatementLine'));
    deletions.push(await deleteMany(tx, 'bankStatement'));
    deletions.push(await deleteMany(tx, 'paymentRunLine'));
    deletions.push(await deleteMany(tx, 'paymentRun'));
    deletions.push(await deleteMany(tx, 'bankCheck'));
    deletions.push(await deleteMany(tx, 'bankDeposit'));
    deletions.push(await deleteMany(tx, 'bankTransfer'));
    deletions.push(await deleteMany(tx, 'bankFeedTransaction'));

    deletions.push(await deleteMany(tx, 'customerRefund'));
    deletions.push(await deleteMany(tx, 'vendorRefund'));
    deletions.push(await deleteMany(tx, 'cashReceiptApplication'));
    deletions.push(await deleteMany(tx, 'cashReceipt'));
    deletions.push(await deleteMany(tx, 'billPaymentApplication'));
    deletions.push(await deleteMany(tx, 'billPayment'));
    deletions.push(await deleteMany(tx, 'billCreditLineItem'));
    deletions.push(await deleteMany(tx, 'billCredit'));
    deletions.push(await deleteMany(tx, 'creditMemoLineItem'));
    deletions.push(await deleteMany(tx, 'creditMemo'));
    deletions.push(await deleteMany(tx, 'receiptLine'));
    deletions.push(await deleteMany(tx, 'receipt'));
    deletions.push(await deleteMany(tx, 'fulfillmentLine'));
    deletions.push(await deleteMany(tx, 'fulfillment'));
    deletions.push(await deleteMany(tx, 'invoiceLineItem'));
    deletions.push(await deleteMany(tx, 'invoice'));
    deletions.push(await deleteMany(tx, 'salesOrderLineItem'));
    deletions.push(await deleteMany(tx, 'salesOrder'));
    deletions.push(await deleteMany(tx, 'quoteLineItem'));
    deletions.push(await deleteMany(tx, 'quote'));
    deletions.push(await deleteMany(tx, 'billLineItem'));
    deletions.push(await deleteMany(tx, 'bill'));
    deletions.push(await deleteMany(tx, 'purchaseOrderLineItem'));
    deletions.push(await deleteMany(tx, 'purchaseOrder'));
    deletions.push(await deleteMany(tx, 'requisitionLineItem'));
    deletions.push(await deleteMany(tx, 'requisition'));

    const nonFoundationJournals = await tx.journalEntry.findMany({
      where: {
        OR: [
          { sourceType: null },
          { sourceType: { not: FOUNDATION_SOURCE_TYPE } },
        ],
      },
      select: { id: true },
    });
    const nonFoundationJournalIds = nonFoundationJournals.map((journal) => journal.id);

    if (nonFoundationJournalIds.length > 0) {
      const deletedLines = await tx.journalEntryLineItem.deleteMany({
        where: { journalEntryId: { in: nonFoundationJournalIds } },
      });
      deletions.push({ modelName: 'journalEntryLineItem', count: deletedLines.count, skipped: false });

      const deletedHeaders = await tx.journalEntry.deleteMany({
        where: { id: { in: nonFoundationJournalIds } },
      });
      deletions.push({ modelName: 'journalEntry', count: deletedHeaders.count, skipped: false });
    } else {
      deletions.push({ modelName: 'journalEntryLineItem', count: 0, skipped: false });
      deletions.push({ modelName: 'journalEntry', count: 0, skipped: false });
    }

    const journal = await createJanuaryActivityJournal(tx);

    return { deletions, journal };
  }, { timeout: 120000, maxWait: 120000 });

  const deletedSummary = result.deletions
    .filter((entry) => !entry.skipped && entry.count > 0)
    .map((entry) => `${entry.modelName}: ${entry.count}`);

  console.log('Seeded transaction cleanup complete.');
  console.log(deletedSummary.length > 0 ? deletedSummary.join('\n') : 'No seeded transaction rows required cleanup.');
  console.log(`January activity journal: ${result.journal.journalNumber}`);
  console.log(`Accounts hit: ${result.journal.accountCount}`);
  console.log(`Lines created: ${result.journal.lineCount}`);
  console.log(`Debits: ${result.journal.debitTotal.toFixed(2)}`);
  console.log(`Credits: ${result.journal.creditTotal.toFixed(2)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
