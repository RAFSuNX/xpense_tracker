import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthForm from './components/AuthForm';
import ExpenseForm from './components/ExpenseForm';
import ProfilePage from './components/ProfilePage';
import ExpenseList from './components/ExpenseList';
import DigitalClock from './components/DigitalClock';
import { Moon, Sun, User } from 'lucide-react';

function Dashboard() {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Only show dashboard if user is verified
  if (!user?.emailVerified) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors">
      <nav className="sticky top-0 z-10 bg-white dark:bg-black border-b border-solid border-black dark:border-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center overflow-hidden">
              <h1 className="text-lg sm:text-2xl font-bold tracking-wider uppercase text-black dark:text-white truncate">Xpense Tracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="w-10 h-10 sm:w-auto sm:h-auto sm:p-2 border border-solid border-black dark:border-white rounded-none text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-2 touch-manipulation"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="w-10 h-10 sm:w-auto sm:h-auto sm:p-2 border border-solid border-black dark:border-white rounded-none text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-2 touch-manipulation"
                aria-label="Toggle profile"
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-8">
          {showProfile ? (
            <ProfilePage />
          ) : (
            <>
              <div className="space-y-4 sm:space-y-8">
                <DigitalClock />
                <ExpenseForm />
                <ExpenseList />
              </div>
            </>
          )}
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