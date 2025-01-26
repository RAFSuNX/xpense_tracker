import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

export default function DigitalClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: timezone
  }).format(currentTime);

  const formattedDate = format(
    new Date(currentTime.toLocaleString('en-US', { timeZone: timezone })),
    'EEEE, MMMM d, yyyy'
  );

  return (
    <div className="bg-white dark:bg-black border border-solid border-black dark:border-white p-6 rounded-none shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-black dark:text-white" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
            Current Time
          </h2>
        </div>
        <span className="text-sm text-black dark:text-white opacity-70">{timezone}</span>
      </div>
      <div className="space-y-1">
        <p className="text-4xl font-bold text-black dark:text-white font-mono">
          {formattedTime}
        </p>
        <p className="text-lg text-black dark:text-white">
          {formattedDate}
        </p>
      </div>
    </div>
  );
}