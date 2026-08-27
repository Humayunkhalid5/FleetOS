import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { getActiveSessionToken } from '../../services/api';

function CompanyMessageBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const result = await api.get('/chats/conversations', { noCache: true });
        if (active) setCount((result.conversations || []).reduce((sum, item) => sum + Number(item.unreadCount || 0), 0));
      } catch {
        // The navigation link remains available when the API reconnects.
      }
    };
    refresh();
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      auth: { token: getActiveSessionToken() },
      transports: ['websocket', 'polling'],
    });
    socket.on('chat:message', refresh);
    return () => { active = false; socket.disconnect(); };
  }, []);

  if (!count) return null;
  return <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black grid place-items-center">{count > 9 ? '9+' : count}</span>;
}

export default CompanyMessageBadge;
