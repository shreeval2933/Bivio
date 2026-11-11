import { useState, useEffect } from 'react';

/**
 * Returns a debounced version of the input value.
 * The debounced value updates after the specified delay when the source value stops changing.
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
