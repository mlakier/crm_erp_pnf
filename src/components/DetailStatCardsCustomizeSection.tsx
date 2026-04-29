'use client'

import { RecordDetailStatCard } from '@/components/RecordDetailPanels'
import SearchableSelect from '@/components/SearchableSelect'
import type { TransactionStatCardSize, TransactionVisualTone } from '@/lib/transaction-page-config'

type StatCardDefinition = {
  id: string
  label: string
}

type StatPreviewCard = {
  id: string
  label: string
  value: string | number
  href?: string | null
  accent?: true | 'teal' | 'yellow'
  valueTone?: TransactionVisualTone
  cardTone?: TransactionVisualTone
  supportsColorized?: boolean
  supportsLink?: boolean
}

type LayoutStatCard = {
  id: string
  metric: string
  visible: boolean
  order: number
  size?: TransactionStatCardSize
  colorized?: boolean
  linked?: boolean
}

const STAT_CARD_SIZE_OPTIONS: Array<{ value: TransactionStatCardSize; label: string }> = [
  { value: 'sm', label: 'Compact' },
  { value: 'md', label: 'Standard' },
  { value: 'lg', label: 'Large' },
]

export const DEFAULT_DETAIL_STAT_CARDS_TITLE = 'Customize Stat Cards'

export default function DetailStatCardsCustomizeSection({
  title,
  intro,
  statCardDefinitions,
  statPreviewCards,
  cards,
  onAddCard,
  onToggleVisible,
  onUpdateSetting,
  onAssignMetric,
  onMoveCard,
  onRemoveCard,
}: {
  title: string
  intro: string
  statCardDefinitions: StatCardDefinition[]
  statPreviewCards?: StatPreviewCard[]
  cards: LayoutStatCard[]
  onAddCard: () => void
  onToggleVisible: (cardId: string) => void
  onUpdateSetting: (cardId: string, key: 'size' | 'colorized' | 'linked', value: TransactionStatCardSize | boolean) => void
  onAssignMetric: (cardId: string, metric: string) => void
  onMoveCard: (cardId: string, direction: -1 | 1) => void
  onRemoveCard: (cardId: string) => void
}) {
  return (
    <div className="rounded-xl border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {intro}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddCard}
          className="rounded-md px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--accent-primary-strong)' }}
        >
          Add Card
        </button>
      </div>

      {statPreviewCards && statPreviewCards.length > 0 ? (
        <div className="mb-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {cards
              .filter((card) => card.visible)
              .map((card) => {
                const preview = statPreviewCards.find((entry) => entry.id === card.metric)
                if (!preview) return null
                return (
                  <RecordDetailStatCard
                    key={card.id}
                    label={preview.label}
                    value={preview.value}
                    href={card.linked === false ? null : preview.href}
                    accent={card.colorized === false ? undefined : preview.accent}
                    valueTone={card.colorized === false ? 'default' : preview.valueTone}
                    cardTone={card.colorized === false ? 'default' : preview.cardTone}
                    size={card.size ?? 'md'}
                  />
                )
              })}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {cards.map((card, index) => {
          const preview = statPreviewCards?.find((entry) => entry.id === card.metric)
          const supportsColorized = preview?.supportsColorized !== false
          const supportsLink = preview?.supportsLink !== false

          return (
            <div
              key={card.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"
              style={{ borderColor: 'var(--border-muted)' }}
            >
              <div>
                <div className="text-sm font-medium text-white">
                  {statCardDefinitions.find((option) => option.id === card.metric)?.label ?? card.metric}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={card.visible}
                    onChange={() => onToggleVisible(card.id)}
                    className="h-4 w-4"
                  />
                  Show
                </label>
                <label className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span className="block" style={{ color: 'var(--text-muted)' }}>
                    Size
                  </span>
                  <div className="w-28">
                    <SearchableSelect
                      selectedValue={card.size ?? 'md'}
                      options={STAT_CARD_SIZE_OPTIONS}
                      placeholder="Select size"
                      searchPlaceholder="Search size"
                      onSelect={(value) => onUpdateSetting(card.id, 'size', value as TransactionStatCardSize)}
                      textClassName="text-xs"
                    />
                  </div>
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={supportsColorized && card.colorized !== false}
                    onChange={(event) => onUpdateSetting(card.id, 'colorized', event.target.checked)}
                    className="h-4 w-4"
                    disabled={!supportsColorized}
                  />
                  Color Code
                </label>
                <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={supportsLink && card.linked !== false}
                    onChange={(event) => onUpdateSetting(card.id, 'linked', event.target.checked)}
                    className="h-4 w-4"
                    disabled={!supportsLink}
                  />
                  Link
                </label>
                <div className="w-44">
                  <SearchableSelect
                    selectedValue={card.metric}
                    options={statCardDefinitions.map((option) => ({ value: option.id, label: option.label }))}
                    placeholder="Select metric"
                    searchPlaceholder="Search metric"
                    onSelect={(value) => onAssignMetric(card.id, value)}
                    textClassName="text-xs"
                  />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Order {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onMoveCard(card.id, -1)}
                  className="rounded-md border px-2 py-1 text-xs"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => onMoveCard(card.id, 1)}
                  className="rounded-md border px-2 py-1 text-xs"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveCard(card.id)}
                  disabled={cards.length <= 1}
                  className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                  style={{ borderColor: 'var(--border-muted)', color: 'var(--text-secondary)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
