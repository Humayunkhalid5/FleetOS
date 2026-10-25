import { useContext } from 'react';
import ThemeContext from '../context/themeContextValue';

export function useTheme() {
  return useContext(ThemeContext);
}

export default useTheme;
