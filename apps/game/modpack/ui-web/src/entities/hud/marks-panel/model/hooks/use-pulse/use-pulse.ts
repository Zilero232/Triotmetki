import { useState } from 'react';

export const usePulse = (milestone: number): number => {
  const [seen, setSeen] = useState(milestone);
  const [pulses, setPulses] = useState(0);

  if (milestone !== seen) {
    setSeen(milestone);

    if (milestone > seen) {
      setPulses(pulses + 1);
    }
  }

  return pulses;
};
