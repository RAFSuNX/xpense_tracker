export interface UserData {
  email: string;
  currency: string;
  balance: number;
  totalIncome: number;
  totalExpense: number;
  totalPayable: number;
  totalReceivable: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: 'income' | 'expense' | 'payable' | 'receivable';
  notes: string;
  date: string;
  isSettlement?: boolean;
  relatedTransactionId?: string;
}