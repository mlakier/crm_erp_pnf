import React from 'react';

export default function ManagePensionsPage() {
  return (
    <div className="min-h-full px-8 py-8">
      <h1 className="text-xl font-semibold text-white mb-4">Manage Pensions</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Here you can view and manage pension integrations and settings.
      </p>
      {/* Pension management UI goes here */}
      <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <p className="text-muted">No pension integrations configured yet.</p>
      </div>
    </div>
  );
}
