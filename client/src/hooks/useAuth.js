import { useContext } from 'react';
import AppContext from '../context/appContextValue';

export function useAuth() {
  return useContext(AppContext);
}

export default useAuth;
