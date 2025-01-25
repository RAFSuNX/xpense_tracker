import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function ExpenseForm() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, `users/${user.uid}/expenses`), {
        name,
        amount: parseFloat(amount),
        type,
        notes,
        date: new Date().toISOString(),
      });

      setName('');
      setAmount('');
      setNotes('');
      toast.success('Transaction recorded successfully');
    } catch (error) {
      toast.error('Failed to record transaction');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 bg-white dark:bg-black rounded-none shadow-lg border-2 border-black dark:border-white">
      <h2 className="text-xl font-bold mb-8 text-black dark:text-white uppercase tracking-wider">Record Transaction</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Transaction Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            required
            placeholder="Enter transaction name"
          />
        </div>
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-3 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            required
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="mt-8">
        <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as 'income' | 'expense')}
          className="w-full px-4 py-3 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all uppercase"
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>
      <div className="mt-8">
        <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
          rows={3}
          placeholder="Add transaction details"
        />
      </div>
      <button
        type="submit"
        className="mt-8 w-full py-4 px-6 bg-black dark:bg-white text-white dark:text-black hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white border-2 border-black dark:border-white transition-all font-bold uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-5 h-5" />
        Record Transaction
      </button>
    </form>
  );
}