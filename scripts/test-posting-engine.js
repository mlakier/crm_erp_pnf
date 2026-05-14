const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

function loadPostingValidationModule() {
  const sourcePath = path.join(__dirname, '..', 'src', 'lib', 'accounting', 'posting-validation.ts')
  const source = fs.readFileSync(sourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText

  const compiledModule = { exports: {} }
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled)
  fn(compiledModule.exports, require, compiledModule, sourcePath, path.dirname(sourcePath))
  return compiledModule.exports
}

const validation = loadPostingValidationModule()

function basePeriod(overrides = {}) {
  return {
    name: 'Jan 2026',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2026-01-31T00:00:00.000Z'),
    subsidiaryId: 'sub-1',
    closed: false,
    status: 'open',
    arLocked: false,
    apLocked: false,
    inventoryLocked: false,
    ...overrides,
  }
}

function baseAccount(overrides = {}) {
  return {
    id: 'acct-1',
    accountNumber: '1000',
    name: 'Cash',
    active: true,
    isPosting: true,
    summary: false,
    ...overrides,
  }
}

test('posting lines must balance', () => {
  assert.equal(
    validation.assertBalancedPostingLines([
      { accountId: 'acct-1', debit: 100, credit: 0 },
      { accountId: 'acct-2', debit: 0, credit: 100 },
    ]),
    100,
  )

  assert.throws(
    () => validation.assertBalancedPostingLines([
      { accountId: 'acct-1', debit: 100, credit: 0 },
      { accountId: 'acct-2', debit: 0, credit: 99 },
    ]),
    /out of balance/,
  )
})

test('posting lines reject missing accounts and debit-credit conflicts', () => {
  assert.throws(
    () => validation.assertValidPostingLines([{ accountId: '', debit: 100, credit: 0 }]),
    /missing a GL account/,
  )

  assert.throws(
    () => validation.assertValidPostingLines([{ accountId: 'acct-1', debit: 100, credit: 100 }]),
    /both debit and credit/,
  )
})

test('posting lines allow translated layer-only FX rows', () => {
  assert.doesNotThrow(() => validation.assertValidPostingLines([
    { accountId: 'fx-gain', debit: 0, credit: 0, functionalCredit: 10 },
  ]))
})

test('posting period controls reject closed and locked periods', () => {
  assert.throws(
    () => validation.assertPostingPeriodControls({
      period: basePeriod({ closed: true }),
      postingDate: new Date('2026-01-15T00:00:00.000Z'),
      subsidiaryId: 'sub-1',
      module: 'gl',
    }),
    /closed/,
  )

  assert.throws(
    () => validation.assertPostingPeriodControls({
      period: basePeriod({ apLocked: true }),
      postingDate: new Date('2026-01-15T00:00:00.000Z'),
      subsidiaryId: 'sub-1',
      module: 'ap',
    }),
    /AP is locked/,
  )
})

test('posting period controls reject dates outside the period', () => {
  assert.throws(
    () => validation.assertPostingPeriodControls({
      period: basePeriod(),
      postingDate: new Date('2026-02-01T00:00:00.000Z'),
      subsidiaryId: 'sub-1',
      module: 'gl',
    }),
    /inside accounting period/,
  )
})

test('posting account controls reject inactive, summary, and non-posting accounts', () => {
  assert.doesNotThrow(() => validation.assertPostingAccountControls(['acct-1'], [baseAccount()]))

  assert.throws(
    () => validation.assertPostingAccountControls(['acct-1'], [baseAccount({ active: false })]),
    /inactive/,
  )

  assert.throws(
    () => validation.assertPostingAccountControls(['acct-1'], [baseAccount({ summary: true })]),
    /not a posting account/,
  )

  assert.throws(
    () => validation.assertPostingAccountControls(['acct-1'], [baseAccount({ isPosting: false })]),
    /not a posting account/,
  )
})
