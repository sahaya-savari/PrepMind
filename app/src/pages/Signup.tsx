import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email required');
      return;
    }
    setError('');
    signup(name.trim(), email.trim());
    navigate('/practice');
  };

  return (
    <section className="max-w-md mx-auto py-12 space-y-4 text-center">
      <div className="card-surface p-6 sm:p-8 space-y-4">
        <h1 className="text-3xl font-bold text-white">Create account</h1>
        <p className="text-gray-300">No passwords. Just your name and email.</p>
        <form onSubmit={onSubmit} className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Name</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Email</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-sm transition-colors"
          >
            Create account
          </button>
        </form>
        <div className="text-sm text-gray-300 text-center">
          Already have an account? <Link to="/login" className="text-cyan-300 font-semibold">Login</Link>
        </div>
      </div>
    </section>
  );
}

export default Signup;
