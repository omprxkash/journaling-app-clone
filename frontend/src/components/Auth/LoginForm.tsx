import { useState, FormEvent } from 'react';
import { authApi } from '../../api/client';
import { useUIStore } from '../../store/uiStore';

interface Props {
  onSwitch: () => void;
}

export function LoginForm({ onSwitch }: Props) {
  const { setUser } = useUIStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login({ email, password });
      setUser(data.user);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; code?: string };
      if (axiosErr.code === 'ECONNABORTED') {
        setError('Request timed out. Is the server running?');
      } else {
        const msg = axiosErr.response?.data?.error;
        setError(msg ?? 'Login failed. Check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
        <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your journal</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-journal-500 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-journal-500 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-journal-500 hover:bg-journal-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-500">
          No account?{' '}
          <button onClick={onSwitch} className="text-journal-600 hover:underline">
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
