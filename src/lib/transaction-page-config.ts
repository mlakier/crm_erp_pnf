export type TransactionStatCardSize = 'sm' | 'md' | 'lg'

export type TransactionVisualTone =
  | 'default'
  | 'gray'
  | 'accent'
  | 'teal'
  | 'yellow'
  | 'orange'
  | 'green'
  | 'red'
  | 'purple'
  | 'pink'

export type TransactionStatCardSlot<TMetric extends string = string> = {
  id: string
  metric: TMetric
  visible: boolean
  order: number
  size?: TransactionStatCardSize
  colorized?: boolean
  linked?: boolean
}

export type TransactionStatDefinition<TRecord> = {
  id: string
  label: string
  accent?: true | 'teal' | 'yellow'
  getValue: (record: TRecord) => string | number
  getHref?: (record: TRecord) => string | null
  getValueTone?: (record: TRecord) => TransactionVisualTone
  getCardTone?: (record: TRecord) => TransactionVisualTone
}

export type TransactionPageConfig<TRecord> = {
  sectionDescriptions: Record<string, string>
  stats: TransactionStatDefinition<TRecord>[]
}
