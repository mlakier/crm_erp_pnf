import { APP_MODULES, SYSTEM_NAME } from "@crm-erp-pnf/domain";

const cards = [
  {
    title: "Platform Foundation",
    items: ["Auth", "Permissions", "Metadata", "Workflow", "Audit Trail"]
  },
  {
    title: "Commercial",
    items: ["CRM", "Quotes", "Sales Orders", "Billing Plans", "Invoices"]
  },
  {
    title: "Finance",
    items: ["AP Portal", "Procurement", "GL", "Revenue", "Leases"]
  },
  {
    title: "Operations & Planning",
    items: ["Projects", "Work Orders", "Forecasting", "Cash Forecast", "KPI Dashboards"]
  }
];

export default function HomePage() {
  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif", background: "#f6f8fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>{SYSTEM_NAME}</h1>
        <p style={{ fontSize: 18, marginBottom: 24 }}>
          Monorepo scaffold for a configurable CRM, ERP, and planning platform.
        </p>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
          {cards.map((card) => (
            <div key={card.title} style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #dde4ee" }}>
              <h2 style={{ marginTop: 0 }}>{card.title}</h2>
              <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section style={{ background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #dde4ee" }}>
          <h2>Initial domain modules</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {APP_MODULES.map((module) => (
              <span
                key={module}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#eef3ff",
                  border: "1px solid #c9d8ff",
                  fontSize: 14
                }}
              >
                {module}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
