import { createContext } from 'react';

const RealtimeContext = createContext({ socket: null, connected: false, subscribe: () => () => {} });

export default RealtimeContext;
