function Progress() {
  return (
    <section className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-white">Progress</h2>
          <p className="text-ink-300 text-sm">Streaks, accuracy, and topic-wise stats will live here.</p>
        </div>
        <button className="soft-button">Export</button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-5">
          <div className="text-ink-200 text-sm">Accuracy chart placeholder</div>
        </div>
        <div className="card-surface p-5">
          <div className="text-ink-200 text-sm">Recent sessions placeholder</div>
        </div>
      </div>
    </section>
  );
}

export default Progress;
