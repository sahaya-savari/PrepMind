import { useState } from 'react';
import { useExam } from '../context/ExamContext';
import { User, Award, Target, BookOpen } from 'lucide-react';

function Profile() {
  const { exam } = useExam();
  const [attempts] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('mcq_attempts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const correctAttempts = attempts.filter((a) => a.score > 0).length;
  const accuracy =
    attempts.length > 0 ? Math.round((correctAttempts / attempts.length) * 100) : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="border-b border-midnight-border pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-ink-primary">
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary">
          Active target exam, performance summary, and session preferences.
        </p>
      </header>

      {/* Profile Overview Card */}
      <div className="rounded-xl border border-midnight-border bg-midnight-surface p-5 sm:p-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-midnight-accentSoft border border-midnight-accent/30 flex items-center justify-center text-midnight-accent font-bold text-xl shrink-0">
          <User size={26} />
        </div>
        <div className="space-y-0.5">
          <div className="text-base sm:text-lg font-bold font-display text-ink-primary">
            PrepMind Scholar
          </div>
          <div className="text-xs text-ink-muted">
            Guest Session &bull; Local Storage Persistence Active
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Award size={18} className="text-midnight-positive" />}
          label="Practice Accuracy"
          value={`${accuracy}%`}
          sub={`${attempts.length} logged drill sessions`}
        />
        <StatCard
          icon={<Target size={18} className="text-midnight-accent" />}
          label="Active Target Exam"
          value={exam || 'Not Selected'}
          sub="Configured in header bar"
        />
        <StatCard
          icon={<BookOpen size={18} className="text-midnight-info" />}
          label="Latest Drill Subject"
          value={attempts[0]?.topic || 'None'}
          sub={attempts[0] ? new Date(attempts[0].at).toLocaleDateString() : 'No attempts logged'}
        />
      </div>
    </div>
  );
}

type StatProps = {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
};

function StatCard({ icon, label, value, sub }: StatProps) {
  return (
    <div className="rounded-xl border border-midnight-border bg-midnight-surface p-4 sm:p-5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
          {label}
        </div>
        {icon}
      </div>
      <div className="text-xl sm:text-2xl font-bold font-display text-ink-primary truncate tabular-nums">
        {value}
      </div>
      {sub && <div className="text-xs text-ink-muted">{sub}</div>}
    </div>
  );
}

export default Profile;
