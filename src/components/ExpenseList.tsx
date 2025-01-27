import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, endOfDay, startOfDay } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Download, X, Calendar, Save, Edit2, ArrowLeftCircle, ArrowRightCircle, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Transaction } from '../types';

// Calculate totals from transactions
const calculateTotals = (transactions: Transaction[]) => {
  return transactions.reduce((acc, transaction) => {
    const { amount, type, isSettlement, relatedTransactionId } = transaction;
    
    if (isSettlement) {
      if (type === 'expense') {
        // Paying back borrowed money
        acc.payable = Math.max(0, acc.payable - amount);
        acc.balance -= amount; // Decrease balance when paying back
      } else if (type === 'income') {
        // Receiving lent money back
        acc.receivable = Math.max(0, acc.receivable - amount);
        acc.balance += amount; // Increase balance when receiving back
      }
    } else {
      // For regular transactions
      switch (type) {
        case 'income':
          if (!isSettlement) {
            acc.income += amount;
            acc.balance += amount;
          }
          break;
        case 'expense':
          if (!isSettlement) {
            acc.expense += amount;
            acc.balance -= amount;
          }
          break;
        case 'payable':
          if (!isSettlement) {
            acc.payable += amount;
            acc.balance += amount; // Borrowing increases balance
          }
          break;
        case 'receivable':
          if (!isSettlement) {
            acc.receivable += amount;
            acc.balance -= amount; // Lending decreases balance
          }
          break;
      }
    }
    
    return acc;
  }, {
    income: 0,
    expense: 0,
    payable: 0,
    receivable: 0,
    balance: 0
  });
};

const currencySymbols: { [key: string]: string } = {
  'BDT': 'TK ',
  'USD': '$ ',
  'EUR': '€ ',
  'GBP': '£ ',
  'JPY': '¥ ',
  'AUD': 'A$ ',
  'CAD': 'C$ ',
  'CHF': 'CHF ',
  'CNY': '¥ ',
  'INR': '₹ '
};

export default function ExpenseList() {
  const { user, userCurrency, userData } = useAuth();
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Transaction[]>([]);
  const [total, setTotal] = useState({
    income: 0,
    expense: 0,
    payable: 0,
    receivable: 0,
    balance: 0
  });

  // Calculate totals whenever expenses change
  useEffect(() => {
    const newTotals = calculateTotals(expenses);
    setTotal(newTotals);
  }, [expenses]);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customStartTime, setCustomStartTime] = useState('00:00');
  const [customEndTime, setCustomEndTime] = useState('23:59');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      let q;
      
      if (selectedPeriod === 'all') {
        // For 'all' time, just order by date without date filters
        q = query(
          collection(db, `users/${user.uid}/expenses`),
          orderBy('date', 'desc')
        );
      } else {
        // For specific time periods, include date filters
        q = query(
          collection(db, `users/${user.uid}/expenses`),
          where('date', '>=', startDate.toISOString()),
          where('date', '<=', endDate.toISOString()),
          orderBy('date', 'desc')
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const expenseData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Expense[];

        setExpenses(expenseData);
        setFilteredExpenses(expenseData);
      });

      return unsubscribe;
    }
  }, [user, selectedPeriod, customStartDate, customEndDate, customStartTime, customEndTime]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredExpenses(expenses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = expenses.filter(expense => 
      expense.name.toLowerCase().includes(query) ||
      expense.type.toLowerCase().includes(query) ||
      expense.notes.toLowerCase().includes(query)
    );

    setFilteredExpenses(filtered);
  }, [searchQuery, expenses]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <ArrowUpCircle className="w-6 h-6" />;
      case 'expense':
        return <ArrowDownCircle className="w-6 h-6" />;
      case 'payable':
        return <ArrowLeftCircle className="w-6 h-6" />;
      case 'receivable':
        return <ArrowRightCircle className="w-6 h-6" />;
      default:
        return <ArrowDownCircle className="w-6 h-6" />;
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case 'income':
      case 'receivable':
        return '+';
      case 'expense':
      case 'payable':
        return '-';
      default:
        return '';
    }
  };

  const exportToExcel = () => {
    const exportData = filteredExpenses.map(expense => ({
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
    if (!user || !editingExpense || !userData) return;

    try {
      await runTransaction(db, async (transaction) => {
        // Get the latest user data
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('User document not found');
        }

        const currentData = userDoc.data();
        let newData = { ...currentData };

        // Revert old transaction
        switch (selectedExpense?.type) {
          case "income":
            newData.balance -= selectedExpense.amount;
            newData.totalIncome -= selectedExpense.amount;
            break;
          case "expense":
            newData.balance += selectedExpense.amount;
            newData.totalExpense -= selectedExpense.amount;
            break;
          case "payable":
            newData.totalPayable -= selectedExpense.amount;
            newData.balance -= selectedExpense.amount;
            break;
          case "receivable":
            newData.totalReceivable -= selectedExpense.amount;
            newData.balance += selectedExpense.amount;
            break;
        }

        // Apply new transaction
        switch (editingExpense.type) {
          case "income":
            newData.balance += editingExpense.amount;
            newData.totalIncome += editingExpense.amount;
            break;
          case "expense":
            if (newData.balance - editingExpense.amount < 0) {
              throw new Error('Insufficient balance');
            }
            newData.balance -= editingExpense.amount;
            newData.totalExpense += editingExpense.amount;
            break;
          case "payable":
            newData.totalPayable += editingExpense.amount;
            newData.balance += editingExpense.amount;
            break;
          case "receivable":
            newData.totalReceivable += editingExpense.amount;
            newData.balance -= editingExpense.amount;
            break;
        }

        // Update user data
        transaction.update(userRef, newData);

        // Update transaction
        const expenseRef = doc(db, `users/${user.uid}/expenses`, editingExpense.id);
        transaction.update(expenseRef, {
          name: editingExpense.name,
          amount: editingExpense.amount,
          type: editingExpense.type,
          notes: editingExpense.notes
        });
      });

      setEditingExpense(null);
      setSelectedExpense(null);
      toast.success('Transaction updated successfully');
    } catch (error) {
      if (error.message === 'Balance cannot be negative after transaction.') {
        toast.error('Insufficient balance for this update');
      } else {
        toast.error('Failed to update transaction. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="p-4 sm:p-6 bg-white dark:bg-black rounded-none shadow-lg border border-solid border-black dark:border-white">
        <h3 className="text-sm font-medium uppercase tracking-wider mb-1 text-black dark:text-white">
          Current Balance
        </h3>
        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-black dark:text-white">
          {currencySymbol}{(total.balance || 0).toFixed(2)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="group p-6 bg-white dark:bg-black rounded-none shadow-lg border border-solid border-black dark:border-white transition-all hover:bg-black dark:hover:bg-white cursor-pointer">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-1 text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">Total Income</h3>
          <p className="text-lg sm:text-xl md:text-3xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">
            {currencySymbol}{(total.income || 0).toFixed(2)}
          </p>
        </div>
        <div className="group p-6 bg-white dark:bg-black rounded-none shadow-lg border border-solid border-black dark:border-white transition-all hover:bg-black dark:hover:bg-white cursor-pointer">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-1 text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">Total Expenses</h3>
          <p className="text-xl md:text-3xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">
            {currencySymbol}{total.expense ? total.expense.toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="group p-6 bg-white dark:bg-black rounded-none shadow-lg border border-solid border-black dark:border-white transition-all hover:bg-black dark:hover:bg-white cursor-pointer">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-1 text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">Total Payable</h3>
          <p className="text-xl md:text-3xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">
            {currencySymbol}{total.payable ? total.payable.toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="group p-6 bg-white dark:bg-black rounded-none shadow-lg border border-solid border-black dark:border-white transition-all hover:bg-black dark:hover:bg-white cursor-pointer">
          <h3 className="text-sm font-medium uppercase tracking-wider mb-1 text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">Total Receivable</h3>
          <p className="text-xl md:text-3xl font-bold text-black dark:text-white group-hover:text-white dark:group-hover:text-black transition-colors">
            {currencySymbol}{total.receivable ? total.receivable.toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-black rounded-none shadow-lg border border-solid border-black dark:border-white overflow-hidden">
        <div className="p-3 sm:p-4 md:p-6 border-b border-solid border-black dark:border-white">
          <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-black dark:text-white uppercase tracking-wider">Transaction History</h2>
            <div className="flex gap-4">
              <div className="relative flex-1 md:min-w-[300px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all placeholder-gray-500 dark:placeholder-gray-400 touch-manipulation"
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden px-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all uppercase tracking-wider"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            </div>
          </div>
          
          <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-col md:flex-row flex-wrap items-start md:items-center gap-4 w-full`}>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full md:w-auto min-w-[150px] max-w-full px-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all uppercase tracking-wider appearance-none cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-ellipsis"
            >
              <option value="all">All Time</option>
              <option value="1">Last Month</option>
              <option value="3">Last 3 Months</option>
              <option value="6">Last 6 Months</option>
              <option value="12">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {selectedPeriod === 'custom' && (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col w-full md:w-auto">
                  <label className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">From</label>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="flex-1 md:flex-none px-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                    />
                    <input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-auto px-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                    />
                  </div>
                </div>
                <div className="flex flex-col w-full md:w-auto">
                  <label className="text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1">To</label>
                  <div className="flex gap-2 w-full md:w-auto">
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="flex-1 md:flex-none px-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                    />
                    <input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="w-auto px-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <button
              onClick={exportToExcel}
              className="w-full md:w-auto px-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-wider"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
        <div className="divide-y divide-solid divide-black dark:divide-white">
          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-black dark:text-white">
              {searchQuery ? 'No transactions found matching your search.' : 'No transactions recorded. Add your first transaction above.'}
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div 
                key={expense.id} 
                className="p-4 md:p-6 flex items-center justify-between text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group cursor-pointer"
                onClick={() => setSelectedExpense(expense)}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-none border border-solid border-black dark:border-white group-hover:border-white dark:group-hover:border-black flex items-center justify-center transition-colors">
                    {getTransactionIcon(expense.type)}
                  </div>
                  <div>
                    <h3 className="font-bold uppercase tracking-wider text-sm md:text-base">{expense.name}</h3>
                    <p className="text-xs md:text-sm opacity-80">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </p>
                    {expense.notes && (
                      <p className="text-xs md:text-sm opacity-80 mt-1 line-clamp-1">{expense.notes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base md:text-lg font-bold">
                    {getAmountPrefix(expense.type)}{currencySymbol}{expense.amount.toFixed(2)}
                  </p>
                  <p className="text-xs md:text-sm uppercase tracking-wider opacity-80">
                    {expense.type}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-black border border-solid border-black dark:border-white p-4 md:p-6 w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-lg sm:rounded-none">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-black dark:text-white uppercase tracking-wider">
                Transaction Details
              </h3>
              <button
                onClick={() => {
                  setSelectedExpense(null);
                  setEditingExpense(null);
                }}
                className="text-black dark:text-white hover:opacity-70 transition-opacity p-2 touch-manipulation"
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
                    className="w-full px-4 py-2 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none"
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
                    className="w-full px-4 py-2 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                    Type
                  </label>
                  <select
                    value={editingExpense.type}
                    onChange={(e) => setEditingExpense({ ...editingExpense, type: e.target.value as 'income' | 'expense' | 'payable' | 'receivable' })}
                    className="w-full px-4 py-2 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none appearance-none text-ellipsis"
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="payable">Account Payable (Borrowed)</option>
                    <option value="receivable">Account Receivable (Lent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider text-black dark:text-white mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editingExpense.notes}
                    onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-transparent border border-solid border-black dark:border-white text-black dark:text-white rounded-none"
                    rows={3}
                  />
                </div>
                <div className="flex flex-col md:flex-row justify-end gap-4 mt-6">
                  <button
                    onClick={() => setEditingExpense(null)}
                    className="w-full md:w-auto px-4 py-2 border border-solid border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateExpense}
                    className="w-full md:w-auto px-4 py-2 bg-black dark:bg-white text-white dark:text-black border border-solid border-black dark:border-white hover:bg-white hover:text-black dark:hover:bg-black dark:hover:text-white transition-all uppercase tracking-wider flex items-center justify-center gap-2"
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
                    className="px-4 py-2 border border-solid border-black dark:border-white text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all uppercase tracking-wider flex items-center gap-2"
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
                    {getAmountPrefix(selectedExpense.type)}{currencySymbol}{selectedExpense.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-wider text-black dark:text-white opacity-70">Type</p>
                  <p className="text-black dark:text-white">{selectedExpense.type}</p>
                </div>
                {selectedExpense.notes && (
                  <div>
                    <p className="text-sm uppercase tracking-wider text-black dark:text-white opacity-70">Notes</p>
                    <p className="text-black dark:text-white break-words">{selectedExpense.notes}</p>
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