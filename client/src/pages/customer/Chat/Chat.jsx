import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import { revalidate } from '../../../hooks/useLiveQuery';
import { usePageChrome } from '../../../hooks/usePageChrome';
import { useFeedback } from '../../../hooks/useFeedback';
import ChatWorkspace from '../../../components/common/ChatWorkspace';
import { ROUTES } from '../../../constants';

function Chat() {
  const { companyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useFeedback();
  const bookingId = location.state?.bookingId || '';
  const [startedId, setStartedId] = useState('');
  const [preparing, setPreparing] = useState(Boolean(companyId));
  const started = useRef(false);

  usePageChrome({ title: 'Messages', subtitle: 'Talk to companies before and after you book.', showBack: false });

  // /customer/chat/:companyId opens (or creates) the inquiry thread for that company.
  useEffect(() => {
    if (!companyId || started.current) return;
    started.current = true;
    api.post(`/chats/company/${encodeURIComponent(companyId)}/start`, {})
      .then(({ booking }) => { setStartedId(booking?._id || ''); return revalidate('/chats/conversations'); })
      .catch((error) => toast.error(error.message))
      .finally(() => setPreparing(false));
  }, [companyId, toast]);

  const resolveInitial = useCallback((conversations) => {
    if (bookingId) return conversations.find(({ booking }) => booking._id === bookingId)?.booking._id;
    if (startedId) return conversations.find(({ booking }) => booking._id === startedId)?.booking._id;
    if (companyId) return conversations.find(({ booking }) => [booking.company?._id, booking.company?.slug].includes(companyId))?.booking._id;
    return undefined;
  }, [bookingId, startedId, companyId]);

  if (preparing) return <ChatWorkspace role="customer" preparing resolveInitial={() => undefined} />;
  return <ChatWorkspace key={startedId || bookingId || 'all'} role="customer" resolveInitial={resolveInitial} emptyAction={<button type="button" className="btn btn-primary" onClick={() => navigate(ROUTES.companies)}>Find a company</button>} />;
}

export default Chat;
