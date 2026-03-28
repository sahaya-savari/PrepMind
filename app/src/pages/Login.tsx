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
    <section className="max-w-md mx-auto space-y-4 text-center">
      <div className="card-surface p-6 sm:p-8 space-y-4">
        <h1 className="text-3xl font-bold text-white">Welcome back</h1>
        <p className="text-white/80">Login with your email to continue.</p>
        <form onSubmit={onSubmit} className="space-y-4 text-left">
          <label className="text-sm text-white/80">Email</label>
          <input
            className="w-full px-4 py-3 rounded-xl bg-white/80 text-gray-900 placeholder:text-gray-500 shadow-lg focus:ring-4 focus:ring-blue-300 focus:outline-none"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:scale-105 transition-all"
          >
            Login
          </button>
        </form>
        <div className="text-sm text-white/80 text-center">
          No account? <Link to="/signup" className="text-blue-200 font-semibold">Sign up</Link>
        </div>
      </div>
    </section>
  );
}

export default Login;
