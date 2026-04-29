"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import SearchableSelect, { type SearchableSelectOption } from '@/components/SearchableSelect';
import { parseMoneyValue } from '@/lib/money';
import type { PtpWorkflowConfig, PtpStep, PtpTrigger, PtpApproval, ApprovalTier } from '@/lib/ptp-workflow-store';

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
      style={{ backgroundColor: enabled ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
    >
      <span
        className="pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
        style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}

function InlineSearchableSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: SearchableSelectOption[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <SearchableSelect
      selectedValue={value}
      options={options}
      placeholder={placeholder}
      textClassName="text-sm"
      onSelect={onChange}
    />
  );
}

export default function PtpWorkflowConfig() {
  const [config, setConfig] = useState<PtpWorkflowConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [statusOptions, setStatusOptions] = useState<Record<string, Array<{ id: string; value: string }>>>({});
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string; employeeId: string | null }[]>([]);

  useEffect(() => {
    fetch('/api/config/ptp-workflow')
      .then((r) => r.json())
      .then((body) => setConfig(body.config))
      .catch(() => {});
    fetch('/api/config/lists')
      .then((r) => r.json())
      .then((body) => setStatusOptions(body.rowsByKey || {}))
      .catch(() => {});
    fetch('/api/employees').then(r => r.json()).then(data => setEmployees(data)).catch(() => {});
  }, []);

  const save = useCallback(async (next: PtpWorkflowConfig) => {
    setSaving(true);
    setToast('');
    try {
      const res = await fetch('/api/config/ptp-workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: next })
      });
      const body = await res.json();
      if (res.ok) {
        setConfig(body.config);
        setToast('Saved');
        setTimeout(() => setToast(''), 2000);
      }
    } catch {}
    setSaving(false);
  }, []);

  const enabledSteps = (config?.steps ?? []).filter((s) => s.enabled);

  const dynamicTriggers = useMemo(() => {
    if (!config) return [];
    const sorted = [...enabledSteps].sort((a, b) => a.order - b.order);
    const pairs: PtpTrigger[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      const existing = config.triggers.find(
        (t) => (t.fromStep === from.id && t.toStep === to.id) || t.id === from.id + '-to-' + to.id
      );
      if (existing) {
        pairs.push(existing);
      } else {
        pairs.push({
          id: from.id + '-to-' + to.id,
          label: from.label + ' \u2192 ' + to.label,
          fromStep: from.id,
          toStep: to.id,
          enabled: false,
          condition: { field: 'status', operator: 'equals', value: '' },
          action: 'create_next',
          resultStatus: '',
        });
      }
    }
    return pairs;
  }, [config, enabledSteps]);

  if (!config) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>;

  function updateStep(id: string, patch: Partial<PtpStep>) {
    if (!config) return;
    const next: PtpWorkflowConfig = {
      steps: config.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      triggers: config.triggers,
      approvals: config.approvals,
    };
    setConfig(next);
    save(next);
  }

  function updateTrigger(id: string, patch: Partial<PtpTrigger>) {
    if (!config) return;
    const exists = config.triggers.find((t) => t.id === id);
    const updatedTriggers = exists
      ? config.triggers.map((t) => (t.id === id ? { ...t, ...patch } : t))
      : [...config.triggers, { ...(dynamicTriggers.find((t) => t.id === id) || { id, label: '', fromStep: '', toStep: '', enabled: false, condition: { field: 'status', operator: 'equals', value: '' }, action: 'create_next', resultStatus: '' }), ...patch }];
    const next: PtpWorkflowConfig = {
      steps: config.steps,
      triggers: updatedTriggers,
      approvals: config.approvals,
    };
    setConfig(next);
    save(next);
  }

  function updateTriggerCondition(id: string, field: string, value: string) {
    if (!config) return;
    let triggers = config.triggers;
    if (!triggers.find((t) => t.id === id)) {
      triggers = [...triggers, dynamicTriggers.find((t) => t.id === id) || { id, label: '', fromStep: '', toStep: '', enabled: false, condition: { field: 'status', operator: 'equals', value: '' }, action: 'create_next', resultStatus: '' }];
    }
    const next: PtpWorkflowConfig = {
      steps: config.steps,
      triggers: triggers.map((t) =>
        t.id === id ? { ...t, condition: { ...t.condition, [field]: value } } : t,
      ),
      approvals: config.approvals,
    };
    setConfig(next);
    save(next);
  }

  function updateApproval(id: string, patch: Partial<PtpApproval>) {
    if (!config) return;
    const next: PtpWorkflowConfig = {
      steps: config.steps,
      triggers: config.triggers,
      approvals: config.approvals.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    };
    setConfig(next);
    save(next);
  }

  function updateTier(approvalId: string, tierIdx: number, patch: Partial<ApprovalTier>) {
    if (!config) return;
    const next: PtpWorkflowConfig = {
      steps: config.steps,
      triggers: config.triggers,
      approvals: config.approvals.map((a) => {
        if (a.id !== approvalId) return a;
        return { ...a, tiers: a.tiers.map((t, i) => (i === tierIdx ? { ...t, ...patch } : t)) };
      }),
    };
    setConfig(next);
    save(next);
  }

  function addTier(approvalId: string) {
    if (!config) return;
    const next: PtpWorkflowConfig = {
      steps: config.steps,
      triggers: config.triggers,
      approvals: config.approvals.map((a) => {
        if (a.id !== approvalId) return a;
        const maxLevel = a.tiers.length > 0 ? Math.max(...a.tiers.map((t) => t.level)) : 0;
        return { ...a, tiers: [...a.tiers, { level: maxLevel + 1, operator: '>=', value: 0, approverType: 'role', approverValue: 'manager' }] };
      }),
    };
    setConfig(next);
    save(next);
  }

  function removeTier(approvalId: string, tierIdx: number) {
    if (!config) return;
    const next: PtpWorkflowConfig = {
      steps: config.steps,
      triggers: config.triggers,
      approvals: config.approvals.map((a) => {
        if (a.id !== approvalId) return a;
        return { ...a, tiers: a.tiers.filter((_, i) => i !== tierIdx) };
      }),
    };
    setConfig(next);
    save(next);
  }

  const fromStepToListKey: Record<string, string> = {
    requisition: 'REQ-STATUS',
    po: 'PO-STATUS',
    receipt: 'RECEIPT-STATUS',
    bill: 'BILL-STATUS',
    payment: 'BILL-STATUS',
  };

  const stepToListKey: Record<string, string> = {
    po: 'PO-STATUS',
    receipt: 'RECEIPT-STATUS',
    bill: 'BILL-STATUS',
    payment: 'BILL-STATUS',
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-md px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: 'var(--success)' }}>
          {toast}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Workflow Steps</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Toggle which stages are active in the Procure-to-Pay flow.</p>
        <div className="flex items-center flex-wrap gap-2 mb-5">
          {enabledSteps.sort((a, b) => a.order - b.order).map((step, idx) => (
            <span key={step.id} className="flex items-center gap-2">
              <span
                className="rounded-md px-3 py-1.5 text-xs font-medium"
                style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
              >
                {step.label}
              </span>
              {idx < enabledSteps.length - 1 && (
                <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
              )}
            </span>
          ))}
        </div>
        <div className="rounded-lg border" style={{ borderColor: 'var(--border-muted)' }}>
          {config.steps.map((step, idx) => (
            <div
              key={step.id}
              className="flex items-center justify-between px-4 py-3"
              style={idx < config.steps.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}
            >
              <div>
                <span className="text-sm font-medium text-white">{step.label}</span>
                <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{step.href}</span>
              </div>
              <Toggle enabled={step.enabled} onChange={(v) => updateStep(step.id, { enabled: v })} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Status Triggers</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Auto-create the next record when a status condition is met.</p>
        <div className="rounded-lg border" style={{ borderColor: 'var(--border-muted)' }}>
          {dynamicTriggers.map((trigger, idx) => (
            <div
              key={trigger.id}
              className="px-4 py-4 space-y-3"
              style={idx < dynamicTriggers.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{trigger.label}</span>
                <Toggle enabled={trigger.enabled} onChange={(v) => updateTrigger(trigger.id, { enabled: v })} />
              </div>
              {trigger.enabled && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{(config.steps.find(s => s.id === trigger.fromStep)?.label || 'From') + ' Status'}</label>
                    <InlineSearchableSelect
                      value={trigger.condition.value}
                      onChange={(value) => updateTriggerCondition(trigger.id, 'value', value)}
                      placeholder="Select status"
                      options={(statusOptions[fromStepToListKey[trigger.fromStep]] || []).map((opt) => ({
                        value: opt.value,
                        label: opt.value,
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{'Auto-Created ' + (config.steps.find(s => s.id === trigger.toStep)?.label || 'To') + ' Status'}</label>
                    <InlineSearchableSelect
                      value={trigger.resultStatus || ''}
                      onChange={(value) => updateTrigger(trigger.id, { resultStatus: value })}
                      placeholder="Select status"
                      options={(statusOptions[stepToListKey[trigger.toStep]] || []).map((opt) => ({
                        value: opt.value,
                        label: opt.value,
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Approval Workflows</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Multi-level approvals - rows sharing the same level require all listed approvers to sign off.</p>
        <div className="rounded-lg border" style={{ borderColor: 'var(--border-muted)' }}>
          {config.approvals.map((approval, idx) => (
            <div
              key={approval.id}
              className="px-4 py-4 space-y-3"
              style={idx < config.approvals.length - 1 ? { borderBottom: '1px solid var(--border-muted)' } : {}}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">{approval.label}</span>
                <Toggle enabled={approval.enabled} onChange={(v) => updateApproval(approval.id, { enabled: v })} />
              </div>
              {approval.enabled && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-[60px_80px_1fr_100px_1fr_32px] gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Level</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Operator</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Amount</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Approver</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>&nbsp;</span>
                    <span />
                  </div>
                  {(approval.tiers || []).map((tier, tierIdx) => (
                    <div key={tierIdx} className="grid grid-cols-[60px_80px_1fr_100px_1fr_32px] gap-2 items-center">
                      <input
                        type="number"
                        min={1}
                        value={tier.level}
                        onChange={(e) => updateTier(approval.id, tierIdx, { level: Number(e.target.value) || 1 })}
                        className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white text-center"
                        style={{ borderColor: 'var(--border-muted)' }}
                      />
                      <InlineSearchableSelect
                        value={tier.operator}
                        onChange={(value) => updateTier(approval.id, tierIdx, { operator: value })}
                        placeholder="Select operator"
                        options={[
                          { value: '=', label: '=' },
                          { value: '>', label: '>' },
                          { value: '>=', label: '>=' },
                          { value: '<', label: '<' },
                          { value: '<=', label: '<=' },
                        ]}
                      />
                      <input
                        type="number"
                        value={tier.value}
                        onChange={(e) => updateTier(approval.id, tierIdx, { value: parseMoneyValue(e.target.value) })}
                        className="w-full rounded-md border bg-transparent px-2 py-1.5 text-sm text-white"
                        style={{ borderColor: 'var(--border-muted)' }}
                      />
                      <InlineSearchableSelect
                        value={tier.approverType}
                        onChange={(value) => updateTier(approval.id, tierIdx, { approverType: (value || 'role') as 'role' | 'employee', approverValue: value === 'employee' ? '' : 'manager' })}
                        placeholder="Select approver type"
                        options={[
                          { value: 'role', label: 'Role' },
                          { value: 'employee', label: 'Employee' },
                        ]}
                      />
                      {tier.approverType === 'employee' ? (
                        <InlineSearchableSelect
                          value={tier.approverValue}
                          onChange={(value) => updateTier(approval.id, tierIdx, { approverValue: value })}
                          placeholder="Select employee"
                          options={employees.map((emp) => ({
                            value: emp.id,
                            label: `${emp.lastName}, ${emp.firstName}${emp.employeeId ? ` (${emp.employeeId})` : ''}`,
                          }))}
                        />
                      ) : (
                        <InlineSearchableSelect
                          value={tier.approverValue}
                          onChange={(value) => updateTier(approval.id, tierIdx, { approverValue: value })}
                          placeholder="Select role"
                          options={[
                            { value: 'manager', label: 'Manager' },
                            { value: 'department_manager', label: 'Department Manager' },
                            { value: 'purchase_coordinator', label: 'Purchase Coordinator' },
                            { value: 'purchase_manager', label: 'Purchase Manager' },
                            { value: 'finance_manager', label: 'Finance Manager' },
                            { value: 'director', label: 'Director' },
                            { value: 'vp', label: 'VP' },
                            { value: 'cfo', label: 'CFO' },
                          ]}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeTier(approval.id, tierIdx)}
                        className="w-6 h-6 flex items-center justify-center rounded text-xs hover:bg-red-900/30"
                        style={{ color: '#ef4444' }}
                        title="Remove row"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addTier(approval.id)}
                    className="mt-1 flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-80"
                    style={{ color: 'var(--accent-primary)', border: '1px dashed var(--border-muted)' }}
                  >
                    + Add Approval Row
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {saving && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saving...</p>
      )}
    </div>
  );
}
