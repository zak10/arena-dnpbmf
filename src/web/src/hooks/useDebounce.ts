import { useEffect, useState } from 'react'; // v18.0.0

/**
 * Default delay in milliseconds for debouncing operations
 * Optimized for typical user input scenarios while maintaining
 * responsive feel and reducing unnecessary processing
 */
const DEFAULT_DEBOUNCE_DELAY = 300;

/**
 * A custom React hook that provides debounced value updates.
 * Useful for preventing excessive re-renders and API calls in scenarios
 * like form inputs, search fields, and real-time filtering.
 * 
 * @template T - The type of the value being debounced
 * @param {T} value - The value to debounce
 * @param {number} [delay=DEFAULT_DEBOUNCE_DELAY] - The delay in milliseconds
 * @returns {T} The debounced value
 * 
 * @example
 * ```tsx
 * const SearchComponent = () => {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearch = useDebounce(searchTerm, 500);
 * 
 *   useEffect(() => {
 *     // API call will only be made 500ms after the user stops typing
 *     fetchSearchResults(debouncedSearch);
 *   }, [debouncedSearch]);
 * 
 *   return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
 * };
 * ```
 */
function useDebounce<T>(value: T, delay: number = DEFAULT_DEBOUNCE_DELAY): T {
  // Store the debounced value in state
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Validate delay parameter
    if (delay < 0) {
      console.warn('useDebounce: Delay parameter should be non-negative. Using default delay.');
      delay = DEFAULT_DEBOUNCE_DELAY;
    }

    // Create timeout for delayed value update
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function to clear timeout if value changes or component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]); // Only re-run effect if value or delay changes

  return debouncedValue;
}

export default useDebounce;