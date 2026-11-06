// Header for the payment pages (no search or cart there).
export default function SimpleHeader() {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <a href="/" className="logo" aria-label="VoltEdge Electronics home">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
          VoltEdge
        </a>
        <a href="/" className="back-link">Back to store</a>
      </div>
    </header>
  );
}
