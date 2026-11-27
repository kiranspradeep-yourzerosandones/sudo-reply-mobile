import { useState, useEffect, useRef } from 'react';

export const useCallTimer = (isActive: boolean, status: string | null) => {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isConnected =
    isActive &&
    (status === 'ACCEPTED' || status === 'CONNECTED' || status === 'IN_PROGRESS' || status === 'ACTIVE');

  useEffect(() => {
    if (isConnected) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setSeconds(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isConnected]);

  const formattedTime = () => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return { seconds, formattedTime: formattedTime(), isConnected };
};