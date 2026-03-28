import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email required');
      return;
    }
    setError('');
    login(email.trim());
    navigate('/practice');
  };

  return (
    <section className="max-w-md mx-auto py-12 space-y-4 text-center">
      <div className="card-surface p-6 sm:p-8 space-y-4">
        <h1 className="text-3xl font-bold text-white">Welcome back</h1>
        <p className="text-gray-300">Login with your email to continue.</p>
        <form onSubmit={onSubmit} className="space-y-4 text-left">
          <label className="text-sm text-gray-300">Email</label>
          <input
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm transition-colors"
          >
            Login
          </button>
        </form>
        <div className="text-sm text-gray-300 text-center">
          No account? <Link to="/signup" className="text-cyan-300 font-semibold">Sign up</Link>
        </div>
      </div>
    </section>
  );
}

export default Login;
