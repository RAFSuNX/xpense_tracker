import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Clock, Mail, DollarSign } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, userCurrency } = useAuth();
  const [timezone, setTimezone] = React.useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  return (
    <div className="p-8 bg-white dark:bg-black rounded-none shadow-lg border border-solid border-black dark:border-white">
      <h2 className="text-2xl font-bold mb-8 text-black dark:text-white uppercase tracking-wider">Profile Settings</h2>
      
      <div className="space-y-8">
        {/* User Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">Account Information</h3>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-black dark:text-white" />
            <span className="text-black dark:text-white">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-black dark:text-white" />
            <span className="text-black dark:text-white">Preferred Currency: {userCurrency}</span>
          </div>
        </div>

        {/* Timezone Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">Time Settings</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Clock className="w-5 h-5 text-black dark:text-white" />
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full sm:w-auto min-w-[200px] max-w-full px-4 py-2 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all uppercase tracking-wider appearance-none cursor-pointer hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-ellipsis"
            >
              {Intl.supportedValuesOf('timeZone').map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pt-4">
          <button
            onClick={logout}
            className="w-full px-6 py-3 border border-solid border-black dark:border-white text-black dark:text-white rounded-none hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}