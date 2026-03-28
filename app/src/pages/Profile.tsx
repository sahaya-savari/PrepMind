import { useAuth } from '../hooks/useAuth';

function Profile() {
  const { user, data, logout } = useAuth();
  const accuracy = data.progress.total > 0 ? Math.round((data.progress.correct / data.progress.total) * 100) : 0;

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Profile</h2>
          <p className="text-gray-600 text-sm">Your identity, stats, and progress.</p>
        </div>
        <button className="soft-button" onClick={logout}>Logout</button>
      </header>

      <div className="card-surface p-6 space-y-4">
        <div className="text-sm text-white/80">Name</div>
        <div className="text-2xl font-semibold text-white">{user?.name}</div>
        <div className="text-sm text-white/80">Email</div>
        <div className="text-lg text-white">{user?.email}</div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Accuracy" value={`${accuracy}%`} sub={`${data.progress.total} questions`} />
        <StatCard label="Current Exam" value={data.exam || 'Not set'} sub={data.overview ? 'Overview saved' : 'No overview yet'} />
        <StatCard label="Recent Exams" value={(data.recentExams[0] || 'None')} sub={`${data.recentExams.length} saved`} />
      </div>
    </section>
  );
}

type StatProps = {
  label: string;
  value: string;
  sub?: string;
};

function StatCard({ label, value, sub }: StatProps) {
  return (
    <div className="card-surface p-4 space-y-1">
      <div className="text-sm text-white/70">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/60">{sub}</div>}
    </div>
  );
}

export default Profile;
