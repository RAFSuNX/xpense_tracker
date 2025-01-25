import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, endOfDay, startOfDay } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Download, X, Calendar, Save, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Expense {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  notes: string;
  date: string;
}

const currencySymbols: { [key: string]: string } = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'CHF',
  'CNY': '¥',
  'INR': '₹'
};

export default function ExpenseList() {
  const { user, userCurrency } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState({ income: 0, expense: 0 });
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartTime, setCustomStartTime] = useState('00:00');
  const [customEndTime, setCustomEndTime] = useState('23:59');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const currencySymbol = currencySymbols[userCurrency || 'USD'];

  useEffect(() => {
    if (!user) return;

    let startDate: Date;
    let endDate: Date;

    if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
      try {
        const [startHours, startMinutes] = customStartTime.split(':').map(Number);
        const [endHours, endMinutes] = customEndTime.split(':').map(Number);
        
        startDate = parseISO(customStartDate);
        startDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
          startHours,
          startMinutes,
          0,
          0
        );
        
        endDate = parseISO(customEndDate);
        endDate = new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          endHours,
          endMinutes,
          59,
          999
        );
      } catch (error) {
        startDate = new Date('1970-01-01T00:00:00.000Z');
        endDate = endOfDay(new Date());
      }
    } else if (selectedPeriod !== 'all') {
      const months = parseInt(selectedPeriod);
      startDate = startOfDay(startOfMonth(subMonths(new Date(), months)));
      endDate = endOfDay(endOfMonth(new Date()));
    } else {
      startDate = new Date('1970-01-01T00:00:00.000Z');
      endDate = endOfDay(new Date());
    }

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const q = query(
        collection(db, `users/${user.uid}/expenses`),
        where('date', '>=', startDate.toISOString()),
        where('date', '<=', endDate.toISOString()),
        orderBy('date', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const expenseData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];

        setExpenses(expenseData);

        const totals = expenseData.reduce(
          (acc, curr) => {
            if (curr.type === 'income') {
              acc.income += curr.amount;
            } else {
              acc.expense += curr.amount;
            }
            return acc;
          },
          { income: 0, expense: 0 }
        );

        setTotal(totals);
      });

      return unsubscribe;
    }
  }, [user, selectedPeriod, customStartDate, customEndDate, customStartTime, customEndTime]);

  const exportToExcel = () => {
    const exportData = expenses.map(expense => ({
      Date: format(new Date(expense.date), 'MMM d, yyyy'),
      Name: expense.name,
      Type: expense.type.charAt(0).toUpperCase() + expense.type.slice(1),
      Amount: `${currencySymbol}${expense.amount.toFixed(2)}`,
      Notes: expense.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

    const fileName = `transactions_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleUpdateExpense = async () => {
    if (!user || !editingExpense) return;

    try {
      const expenseRef = doc(db, `users/${user.uid}/expenses`, editingExpense.id);
      await updateDoc(expenseRef, {
        name: editingExpense.name,
        amount: editingExpense.amount,
        type: editingExpense.type,
        notes: editingExpense.notes
      });
      setEditingExpense(null);
    } catch (error) {
      console.error('Error updating expense:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="group p-6 bg-white dark:bg-black rounded-none shadow-lg border-2 border-black dark:border-white transition-all hover:bg-black dark:hover:bg-white cursor-pointer">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-1 text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">Total Income</h3>
          <p className="text-3xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">{currencySymbol}{total.income.toFixed(2)}</p>
        </div>
        <div className="group p-6 bg-white dark:bg-black rounded-none shadow-lg border-2 border-black dark:border-white transition-all hover:bg-black dark:hover:bg-white cursor-pointer">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-1 text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">Total Expenses</h3>
          <p className="text-3xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">{currencySymbol}{total.expense.toFixed(2)}</p>
        </div>
        <div className="group p-6 bg-white dark:bg-black rounded-none shadow-lg border-2 border-black dark:border-white transition-all hover:bg-black dark:hover:bg-white cursor-pointer">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-1 text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">Net Balance</h3>
          <p className="text-3xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">{currencySymbol}{(total.income - total.expense).toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-black rounded-none shadow-lg border-2 border-black dark:border-white overflow-hidden">
        <div className="p-6 border-b-2 border-black dark:border-white flex flex-wrap gap-4 justify-between items-center">
          <h2 className="text-xl font-bold text-black dark:text-white uppercase tracking-wider">Transaction History</h2>
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all uppercase tracking-wider appearance-none cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
            >
              <option value="all">All Time</option>
              <option value="1">Last Month</option>
              <option value="3">Last 3 Months</option>
              <option value="6">Last 6 Months</option>
              <option value="12">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {selectedPeriod === 'custom' && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col">
                  <label className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">From</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-4 py-2 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                    />
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="px-4 py-2 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">To</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-4 py-2 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                    />
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="px-4 py-2 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-white dark:bg-black border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center gap-2 font-bold uppercase tracking-wider"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
        <div className="divide-y-2 divide-black dark:divide-white">
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-black dark:text-white">
              No transactions recorded. Add your first transaction above.
            </div>
          ) : (
            expenses.map((expense) => (
              <div 
                key={expense.id} 
                className="p-6 flex items-center justify-between text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group cursor-pointer"
                onClick={() => setSelectedExpense(expense)}
              >
                <div className="flex items-center space-x-4">
                  {expense.type === 'income' ? (
                    <div className="w-12 h-12 rounded-none border-2 border-black dark:border-white group-hover:border-white dark:group-hover:border-black flex items-center justify-center transition-colors">
                      <ArrowUpCircle className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-none border-2 border-black dark:border-white group-hover:border-white dark:group-hover:border-black flex items-center justify-center transition-colors">
                      <ArrowDownCircle className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold uppercase tracking-wider">{expense.name}</h3>
                    <p className="text-sm opacity-80">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </p>
                    {expense.notes && (
                      <p className="text-sm opacity-80 mt-1">{expense.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    {expense.type === 'income' ? '+' : '-'}{currencySymbol}{expense.amount.toFixed(2)}
                  </p>
                  <p className="text-sm uppercase tracking-wider opacity-80">
                    {expense.type}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-black dark:text-white uppercase tracking-wider">
                Transaction Details
              </h3>
              <button
                onClick={() => {
                  setSelectedExpense(null);
                  setEditingExpense(null);
                }}
                className="text-black dark:text-white hover:opacity-70 transition-opacity"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {editingExpense ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editingExpense.name}
                    onChange={(e) => setEditingExpense({ ...editingExpense, name: e.target.value })}
                    className="w-full px-4 py-2 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                    Type
                  </label>
                  <select
                    value={editingExpense.type}
                    onChange={(e) => setEditingExpense({ ...editingExpense, type: e.target.value as 'income' | 'expense' })}
                    className="w-full px-4 py-2 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editingExpense.notes}
                    onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-transparent border-2 border-black dark:border-white text-black dark:text-white rounded-none"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => setEditingExpense(null)}
                    className="px-4 py-2 border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateExpense}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-all uppercase tracking-wider flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm uppercase tracking-wider text-black dark:text-white opacity-70">Date</p>
                    <p className="text-black dark:text-white">
                      {format(new Date(selectedExpense.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingExpense(selectedExpense)}
                    className="px-4 py-2 border-2 border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all uppercase tracking-wider flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wider text-black dark:text-white opacity-70">Name</p>
                  <p className="text-black dark:text-white font-bold">{selectedExpense.name}</p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wider text-black dark:text-white opacity-70">Amount</p>
                  <p className="text-black dark:text-white font-bold">
                    {selectedExpense.type === 'income' ? '+' : '-'}{currencySymbol}{selectedExpense.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wider text-black dark:text-white opacity-70">Type</p>
                  <p className="text-black dark:text-white">{selectedExpense.type}</p>
                </div>
                {selectedExpense.notes && (
                  <div>
                    <p className="text-sm uppercase tracking-wider text-black dark:text-white opacity-70">Notes</p>
                    <p className="text-black dark:text-white">{selectedExpense.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}