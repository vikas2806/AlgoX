export default function App() {
  return (
    <div className="container">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#f3f4f6' }}>
          AlgoX <span style={{ color: '#3b82f6', fontSize: '1rem', fontWeight: 600 }}>[MVP]</span>
        </h1>
        <p style={{ color: '#9ca3af', marginTop: '0.25rem' }}>
          Anonymous Workplace Harassment Reporting &amp; Status Portal
        </p>
      </header>

      <main style={{
        background: 'rgba(17, 23, 38, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '1.5rem',
      }}>
        <p style={{ color: '#9ca3af' }}>Project scaffold initialized.</p>
      </main>
    </div>
  );
}
