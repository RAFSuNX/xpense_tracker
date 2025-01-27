import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { addDoc, collection, doc, updateDoc, query, where, orderBy, onSnapshot, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Transaction } from '../types';

export default function ExpenseForm() {
  const { user, userData } = useAuth();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'payable' | 'receivable'>('expense');
  const [isSettlement, setIsSettlement] = useState(false);
  const [relatedTransactionId, setRelatedTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Fetch existing transactions for settlement options
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/expenses`),
      where('type', 'in', ['payable', 'receivable']),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
      setTransactions(transactionData);
    });

    return unsubscribe;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) {
      toast.error('Authentication required');
      return;
    }

    try {
      // Validate amount
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      // Validate name
      if (!name.trim()) {
        toast.error('Please enter a transaction name');
        return;
      }

      const selectedTransaction = isSettlement ? transactions.find(t => t.id === relatedTransactionId) : undefined;

      // Validate settlement transaction
      if (isSettlement && !selectedTransaction) {
        toast.error('Please select a transaction to settle');
        return;
      }

      const transactionData = {
        name: name.trim(),
        amount: parsedAmount,
        type,
        notes: notes || '',
        isSettlement,
        relatedTransactionId: isSettlement ? relatedTransactionId : null,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Add new transaction to Firebase
      await addDoc(collection(db, `users/${user.uid}/expenses`), transactionData);

      setName('');
      setAmount('');
      setNotes('');
      setIsSettlement(false);
      setRelatedTransactionId('');
      setType('expense');
      toast.success('Transaction recorded successfully');
    } catch (error: any) {
      console.error('Transaction error:', error.code, error.message);
      if (error.code === 'invalid-argument') {
        toast.error('Invalid transaction data. Please check all fields.');
      } else {
        toast.error(error.message || 'Failed to record transaction');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 sm:p-8 bg-white dark:bg-black rounded-none shadow-lg border border-solid border-black dark:border-white">
      <h2 className="text-xl font-bold mb-8 text-black dark:text-white uppercase tracking-wider">Record Transaction</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        <div>
          <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Transaction Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all touch-manipulation"
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
            className="w-full px-4 py-3 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all touch-manipulation"
            required
            step="0.01"
            placeholder="0.00"
            inputMode="decimal"
          />
        </div>
      </div>
      <div className="mt-8">
        <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">
          Transaction Type
        </label>
        <div className="w-full">
          <select
            value={type}
            onChange={(e) => {
              const newType = e.target.value as 'income' | 'expense' | 'payable' | 'receivable';
              setType(newType);
              setIsSettlement(false);
              setRelatedTransactionId('');
            }}
            className="w-full px-4 py-3 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all uppercase appearance-none text-ellipsis"
          >
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="payable">Account Payable (Borrowed)</option>
            <option value="receivable">Account Receivable (Lent)</option>
          </select>
        </div>
      </div>
      {(type === 'expense' || type === 'income') && transactions.length > 0 && (
        <div className="mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSettlement}
              onChange={(e) => {
                setIsSettlement(e.target.checked);
                if (!e.target.checked) {
                  setRelatedTransactionId('');
                }
              }}
              className="w-4 h-4 border border-solid border-black dark:border-white rounded-none focus:ring-0 focus:ring-offset-0 checked:bg-black dark:checked:bg-white checked:border-black dark:checked:border-white"
            />
            <span className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
              {type === 'expense' ? 'Paying Back Borrowed Money' : 'Receiving Lent Money'}
            </span>
          </label>
        </div>
      )}
      {isSettlement && (
        <div className="mt-4">
          <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">
            Select {type === 'expense' ? 'Borrowed' : 'Lent'} Transaction
          </label>
          <select
            value={relatedTransactionId}
            onChange={(e) => setRelatedTransactionId(e.target.value)}
            required
            className="w-full px-4 py-3 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all appearance-none text-ellipsis"
          >
            <option value="">Select a transaction</option>
            {transactions
              .filter(t => type === 'expense' ? t.type === 'payable' : t.type === 'receivable')
              .map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} - {t.amount.toFixed(2)}
                </option>
              ))
            }
          </select>
        </div>
      )}
      <div className="mt-8">
        <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all"
          rows={3}
          placeholder="Add transaction details"
        />
      </div>
      <button
        type="submit"
        className="mt-8 w-full py-4 px-6 bg-black dark:bg-white text-white dark:text-black hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white border border-solid border-black dark:border-white transition-all font-bold uppercase tracking-wider flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-5 h-5" />
        Record Transaction
      </button>
    </form>
  );
}