import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthForm from './components/AuthForm';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import DigitalClock from './components/DigitalClock';
import { Moon, Sun } from 'lucide-react';

function Dashboard() {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = React.useState(false);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      <nav className="sticky top-0 z-10 bg-white dark:bg-black border-b border-solid border-black dark:border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold tracking-wider uppercase text-black dark:text-white">Xpense Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 border border-solid border-black dark:border-white rounded-none text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={logout}
                className="px-6 py-2 border border-solid border-black dark:border-white text-black dark:text-white rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all font-bold uppercase tracking-wider"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <DigitalClock />
          <ExpenseForm />
          <ExpenseList />
        </div>
      </main>
    </div>
  );
}

function AuthStateManager() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <AuthForm />;
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-white dark:bg-black">
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#000',
              color: '#fff',
              borderRadius: '0',
              border: '1px solid #fff',
            },
            dark: {
              style: {
                background: '#fff',
                color: '#000',
                borderRadius: '0',
                border: '1px solid #000',
              },
            },
          }}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
          <AuthStateManager />
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;