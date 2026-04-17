import React from 'react';

export default function ManagePermissionsPage() {
  return (
    <div className="min-h-full px-8 py-8">
      <h1 className="text-xl font-semibold text-white mb-4">Manage Permissions</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Here you can view and manage permissions for integrations and platform features.
      </p>
      {/* Permissions management UI goes here */}
      <div className="rounded-lg border p-6" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border-muted)' }}>
        <p className="text-muted">No permissions configured yet.</p>
      </div>
    </div>
  );
}
