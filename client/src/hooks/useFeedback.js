import { useContext } from 'react';
import FeedbackContext from '../context/feedbackContextValue';

export function useFeedback() {
  return useContext(FeedbackContext);
}

export default useFeedback;
