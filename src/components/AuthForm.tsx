import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { LogIn, UserPlus } from 'lucide-react';

const currencies = [
  { code: 'BDT', symbol: 'TK ', name: 'Bangladesh Taka' },
  { code: 'USD', symbol: '$ ', name: 'US Dollar' },
  { code: 'EUR', symbol: '€ ', name: 'Euro' },
  { code: 'GBP', symbol: '£ ', name: 'British Pound' },
  { code: 'JPY', symbol: '¥ ', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$ ', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$ ', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF ', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥ ', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹ ', name: 'Indian Rupee' },
];

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signIn(email, password);
        toast.success('Authentication successful');
      } else {
        await signUp(email, password, currency);
        toast.success('Account created successfully');
      }
    } catch (error) {
      toast.error('Authentication failed');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white dark:bg-black rounded-none shadow-lg border-2 border-black dark:border-white">
      <h2 className="text-3xl font-bold mb-8 text-center tracking-wider text-black dark:text-white uppercase">
        {isLogin ? 'Sign In' : 'Create Account'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            required
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            required
            placeholder="Enter your password"
          />
        </div>
        {!isLogin && (
          <div>
            <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Preferred Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              required
            >
              {currencies.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} ({curr.symbol}) - {curr.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="w-full py-4 px-6 bg-black dark:bg-white text-white dark:text-black hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white border-2 border-black dark:border-white transition-all font-bold uppercase tracking-wider flex items-center justify-center gap-2"
        >
          {isLogin ? (
            <>
              <LogIn className="w-5 h-5" />
              Sign In
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5" />
              Create Account
            </>
          )}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-black dark:text-white">
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="font-bold uppercase tracking-wider hover:underline"
        >
          {isLogin ? 'Create One' : 'Sign In'}
        </button>
      </p>
    </div>
  );
}
