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
    <section className="max-w-md mx-auto space-y-4 text-center">
      <div className="card-surface p-6 sm:p-8 space-y-4">
        <h1 className="text-3xl font-bold text-white">Create account</h1>
        <p className="text-white/80">No passwords. Just your name and email.</p>
        <form onSubmit={onSubmit} className="space-y-4 text-left">
          <div className="space-y-2">
            <label className="text-sm text-white/80">Name</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-white/80 text-gray-900 placeholder:text-gray-500 shadow-lg focus:ring-4 focus:ring-blue-300 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-white/80">Email</label>
            <input
              className="w-full px-4 py-3 rounded-xl bg-white/80 text-gray-900 placeholder:text-gray-500 shadow-lg focus:ring-4 focus:ring-blue-300 focus:outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-300">{error}</div>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold shadow-lg hover:scale-105 transition-all"
          >
            Create account
          </button>
        </form>
        <div className="text-sm text-white/80 text-center">
          Already have an account? <Link to="/login" className="text-blue-200 font-semibold">Login</Link>
        </div>
      </div>
    </section>
  );
}

export default Signup;
