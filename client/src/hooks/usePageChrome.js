import { useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { ChromeValueContext, SetChromeContext } from '../context/pageChromeContextValue';

/** Read the current header inside a layout. */
export function usePageChromeValue() {
  return useContext(ChromeValueContext);
}

/** Declare the header for the current page. Safe to call on every render. */
export function usePageChrome(config) {
  const setChrome = useContext(SetChromeContext);
  const { title, subtitle, showBack, backTo, search, onSearch, actions } = config;
  const onSearchRef = useRef(onSearch);
  useLayoutEffect(() => { onSearchRef.current = onSearch; });
  const stableSearch = useMemo(() => (value) => onSearchRef.current?.(value), []);

  // Layout effect so the header is correct on the first painted frame.
  useLayoutEffect(() => {
    setChrome({ title, subtitle, showBack, backTo, search, onSearch: onSearch ? stableSearch : undefined, actions });
  });

  useLayoutEffect(() => () => setChrome({}), [setChrome]);
}
