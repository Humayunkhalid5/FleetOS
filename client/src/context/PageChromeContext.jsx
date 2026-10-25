import { useState } from 'react';
import { ChromeValueContext, SetChromeContext } from './pageChromeContextValue';

// Pages describe their header (title, subtitle, actions, search) and the
// persistent portal layout renders it. Two contexts keep this loop-free:
// pages only consume the stable setter, so a header update never re-renders
// the page that produced it.

export function PageChromeProvider({ children }) {
  const [chrome, setChrome] = useState({});
  return (
    <SetChromeContext.Provider value={setChrome}>
      <ChromeValueContext.Provider value={chrome}>{children}</ChromeValueContext.Provider>
    </SetChromeContext.Provider>
  );
}
