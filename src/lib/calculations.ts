import { UserData, Transaction } from '../types';

export const calculateBalanceFromTransactions = (transactions: Transaction[]): UserData => {
  const initialData: UserData = {
    email: '',
    currency: '',
    balance: 0,
    totalIncome: 0,
    totalExpense: 0,
    totalPayable: 0,
    totalReceivable: 0,
    createdAt: ''
  };

  return transactions.reduce((acc, transaction) => {
    const { amount, type } = transaction;
    
    switch (type) {
      case "income":
        acc.balance += amount;
        acc.totalIncome += amount;
        break;

      case "expense":
        acc.balance -= amount;
        acc.totalExpense += amount;
        break;

      case "payable":
        acc.balance += amount; // Borrowing increases balance
        acc.totalPayable += amount;
        break;

      case "receivable":
        acc.balance -= amount; // Lending decreases balance
        acc.totalReceivable += amount;
        break;
    }

    return acc;
  }, initialData);
};

export const calculateNewBalances = (
  currentData: UserData,
  amount: number,
  transactionType: string,
  isSettlement: boolean = false,
  relatedData?: Transaction
): UserData => {
  // Validate input data
  if (!currentData) {
    throw new Error('User data is required');
  }

  if (isNaN(amount) || amount <= 0) {
    throw new Error('Invalid transaction data');
  }

  // Ensure all required fields exist with default values if needed
  const safeCurrentData = {
    email: currentData.email || '',
    currency: currentData.currency || 'USD',
    balance: currentData.balance || 0,
    totalIncome: currentData.totalIncome || 0,
    totalExpense: currentData.totalExpense || 0,
    totalPayable: currentData.totalPayable || 0,
    totalReceivable: currentData.totalReceivable || 0,
    createdAt: currentData.createdAt || new Date().toISOString()
  };

  let newData = { ...currentData };

  if (isSettlement && relatedData) {
    if (relatedData.type === "payable") {
      if (amount > relatedData.amount) {
        throw new Error('Settlement amount cannot exceed borrowed amount');
      }
      // Settling a payable: decrease payables but don't increase expenses
      newData.totalPayable = Math.max(0, newData.totalPayable - amount);
      newData.balance -= amount; // Paying back borrowed money reduces balance
    } else if (relatedData.type === "receivable") {
      if (amount > relatedData.amount) {
        throw new Error('Settlement amount cannot exceed lent amount');
      }
      // Settling a receivable: decrease receivables but don't increase income
      newData.totalReceivable = Math.max(0, newData.totalReceivable - amount);
      newData.balance += amount; // Receiving lent money increases balance
    }
  } else {
    // Validate transaction type
    if (!['income', 'expense', 'payable', 'receivable'].includes(transactionType)) {
      throw new Error('Invalid transaction type');
    }

    switch (transactionType) {
      case "income":
        newData.balance += amount;
        newData.totalIncome += amount;
        break;

      case "expense":
        newData.balance -= amount;
        newData.totalExpense += amount;
        break;

      case "payable":
        newData.totalPayable += amount;
        newData.balance += amount; // Borrowing increases balance
        break;

      case "receivable":
        newData.totalReceivable += amount;
        newData.balance -= amount; // Lending decreases balance
        break;

      default:
        throw new Error('Invalid transaction type');
    }
  }

  // Prevent negative balance issues (except for settlements)
  if (newData.balance < 0 && !isSettlement && transactionType !== 'payable') {
    throw new Error("Balance cannot be negative after transaction.");
  }

  // Ensure all values are numbers and not NaN
  Object.keys(newData).forEach(key => {
    if (typeof newData[key] === 'number' && isNaN(newData[key])) {
      newData[key] = 0;
    }
  });

  return newData;
};