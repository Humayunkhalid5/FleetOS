import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { usePageChrome } from '../../../hooks/usePageChrome';
import ChatWorkspace from '../../../components/common/ChatWorkspace';

function CompanyChat() {
  const location = useLocation();
  const bookingId = location.state?.bookingId || '';
  usePageChrome({ title: 'Messages', subtitle: 'Reply to customers and keep them updated on their bookings.' });
  const resolveInitial = useCallback((conversations) => (bookingId ? conversations.find(({ booking }) => booking._id === bookingId)?.booking._id : undefined), [bookingId]);
  return <ChatWorkspace key={bookingId || 'all'} role="company" resolveInitial={resolveInitial} />;
}

export default CompanyChat;
