import { useMemo } from 'react';
import { useLiveQuery } from './useLiveQuery';

/** Business categories (industries) from the API, with a lookup by value. */
export function useIndustries() {
  const { data, loading } = useLiveQuery('/business-categories', { events: ['marketplace:updated'] });
  return useMemo(() => {
    const industries = data?.businessCategories || [];
    return { industries, loading, byValue: Object.fromEntries(industries.map((entry) => [entry.value, entry])) };
  }, [data, loading]);
}

export default useIndustries;
