'use client'

import { useState, type ReactNode } from 'react'

type RecordBottomTab = {
  key: string
  label: string
  count: number
  content: ReactNode
  toolbarTargetId?: string
  toolbarPlacement?: 'panel' | 'tab-bar'
}

export default function RecordBottomTabsSection({
  title = 'Related | Communications | System Notes',
  tabs,
  defaultActiveKey,
  defaultTabbed = true,
}: {
  title?: string
  tabs: RecordBottomTab[]
  defaultActiveKey?: string
  defaultTabbed?: boolean
}) {
  const firstKey = tabs[0]?.key ?? ''
  const [active, setActive] = useState(defaultActiveKey ?? firstKey)
  const [tabbed, setTabbed] = useState(defaultTabbed)
  const activeTab = tabs.find((tab) => tab.key === active) ?? tabs[0]

  if (!tabs.length || !activeTab) return null

  return (
    <div
      className="mb-6 overflow-hidden rounded-xl border"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
    >
      <div
        className="flex items-center justify-between gap-4 border-b px-6 py-4"
        style={{ borderColor: 'var(--border-muted)' }}
      >
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <label className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <input
            type="checkbox"
            checked={tabbed}
            onChange={(event) => setTabbed(event.target.checked)}
          />
          Tab View
        </label>
      </div>
      {tabbed ? (
        <>
          <div className="border-b px-6 py-0" style={{ borderColor: 'var(--border-muted)' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
                {tabs.map((tab) => {
                  const isActive = active === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActive(tab.key)}
                      className="flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors -mb-px"
                      style={{
                        borderColor: isActive ? 'var(--accent-primary-strong)' : 'transparent',
                        color: isActive ? '#93c5fd' : '#8ab4f8',
                      }}
                    >
                      {tab.label}
                      <span
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: isActive ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.1)',
                          color: isActive ? '#93c5fd' : '#7fb0f8',
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2 py-2">
                {tabs.map((tab) =>
                  tab.toolbarTargetId && tab.toolbarPlacement === 'tab-bar' ? (
                    <div
                      key={`tab-bar-toolbar-${tab.key}`}
                      id={tab.toolbarTargetId}
                      className="items-center justify-end gap-2"
                      style={{ display: activeTab.key === tab.key ? 'flex' : 'none' }}
                    />
                  ) : null
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
            <div
              className="overflow-hidden rounded-xl border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
            >
              <div
                className="flex items-center justify-between gap-4 border-b px-6 py-4"
                style={{ borderColor: 'var(--border-muted)' }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base font-semibold text-white">{activeTab.label}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{
                      backgroundColor: 'rgba(59,130,246,0.18)',
                      color: '#93c5fd',
                    }}
                >
                  {activeTab.count}
                  </span>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2">
                  {tabs.map((tab) =>
                    tab.toolbarTargetId && tab.toolbarPlacement !== 'tab-bar' ? (
                      <div
                        key={`panel-toolbar-${tab.key}`}
                        id={tab.toolbarTargetId}
                        className="items-center justify-end gap-2"
                        style={{ display: activeTab.key === tab.key ? 'flex' : 'none' }}
                      />
                    ) : null
                  )}
                </div>
              </div>
              <div>{activeTab.content}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6 p-6">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className="overflow-hidden rounded-xl border"
              style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}
            >
              <div className="border-b px-6 py-0" style={{ borderColor: 'var(--border-muted)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-2 py-3">
                    <span className="text-base font-semibold text-white">{tab.label}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: 'rgba(59,130,246,0.18)',
                        color: '#93c5fd',
                      }}
                    >
                      {tab.count}
                    </span>
                  </div>
                  {tab.toolbarTargetId ? (
                    <div id={tab.toolbarTargetId} className="flex shrink-0 items-center justify-end gap-2 py-2" />
                  ) : (
                    <div />
                  )}
                </div>
              </div>
              <div>{tab.content}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
