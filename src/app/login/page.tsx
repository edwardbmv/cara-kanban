'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'cara') {
      // Redirect with password to trigger middleware auth
      window.location.href = `/?password=${password}`;
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-xl border border-gray-800 w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-5xl">🐾</span>
          <h1 className="text-2xl font-bold text-white mt-4">Cara HQ</h1>
          <p className="text-gray-400 text-sm mt-1">Enter password to continue</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-700'
            }`}
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-sm mt-2">Incorrect password</p>
          )}
          <button
            type="submit"
            className="w-full mt-4 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
