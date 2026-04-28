import { RecordDetailStatCard } from '@/components/RecordDetailPanels'
import type { TransactionStatCardSlot, TransactionStatDefinition } from '@/lib/transaction-page-config'

export default function TransactionStatsRow<TRecord>({
  record,
  stats,
  visibleStatIds,
  visibleStatCards,
}: {
  record: TRecord
  stats: TransactionStatDefinition<TRecord>[]
  visibleStatIds?: string[]
  visibleStatCards?: Array<TransactionStatCardSlot<string>>
}) {
  const visibleStats =
    visibleStatCards && visibleStatCards.length > 0
      ? visibleStatCards
          .filter((card) => card.visible)
          .sort((left, right) => left.order - right.order)
          .map((card) => {
            const stat = stats.find((candidate) => candidate.id === card.metric)
            return stat ? { stat, card } : null
          })
          .filter((entry): entry is { stat: TransactionStatDefinition<TRecord>; card: TransactionStatCardSlot<string> } => Boolean(entry))
      : visibleStatIds && visibleStatIds.length > 0
        ? visibleStatIds
            .map((id, index) => {
              const stat = stats.find((candidate) => candidate.id === id)
              return stat ? { stat, card: { id: `${id}-${index}`, metric: id, visible: true, order: index } } : null
            })
            .filter((entry): entry is { stat: TransactionStatDefinition<TRecord>; card: TransactionStatCardSlot<string> } => Boolean(entry))
        : stats.map((stat, index) => ({
            stat,
            card: { id: `${stat.id}-${index}`, metric: stat.id, visible: true, order: index },
          }))

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {visibleStats.map(({ stat, card }, index) => (
        <RecordDetailStatCard
          key={`${stat.id}-${index}`}
          label={stat.label}
          value={stat.getValue(record)}
          accent={card.colorized === false ? undefined : stat.accent}
          href={card.linked === false ? null : stat.getHref?.(record)}
          valueTone={card.colorized === false ? 'default' : stat.getValueTone?.(record)}
          cardTone={card.colorized === false ? 'default' : stat.getCardTone?.(record)}
          size={card.size ?? 'md'}
        />
      ))}
    </div>
  )
}
