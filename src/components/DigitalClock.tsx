import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

export default function DigitalClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

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
          <Clock className="w-5 h-5 text-black dark:text-white" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-black dark:text-white">
            Current Time
          </h2>
        </div>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="px-3 py-1 bg-white dark:bg-black border border-solid border-black dark:border-white text-black dark:text-white rounded-none focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all text-sm uppercase tracking-wider hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer"
        >
          {Intl.supportedValuesOf('timeZone').map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
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