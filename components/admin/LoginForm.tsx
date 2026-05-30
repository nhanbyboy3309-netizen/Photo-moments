import React, { useState, memo } from 'react';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
  onLogin: (password: string) => Promise<boolean>;
}

const LoginForm = memo(({ onLogin }: LoginFormProps) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await onLogin(password);
    setLoading(false);
    if (!success) setError('Invalid password (Default: admin123)');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 p-8 rounded-xl space-y-6 shadow-2xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Admin Access</h2>
          <p className="text-zinc-500 text-sm mt-1">Please authenticate to continue</p>
        </div>
        <input 
          type="password" 
          placeholder="Password"
          className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button 
          disabled={loading}
          className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Login'}
        </button>
        <p className="text-xs text-zinc-600 text-center">Hint: admin123</p>
      </form>
    </div>
  );
});

export default LoginForm;
