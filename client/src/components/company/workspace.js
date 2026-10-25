import { useLiveQuery } from '../../hooks/useLiveQuery';

/** Shared with pages so the workspace config is fetched once. */
export const DASHBOARD_KEY = '/company/dashboard';
export const DASHBOARD_EVENTS = ['booking:created', 'booking:updated', 'workspace:updated', 'review:created'];

export function useWorkspace() {
  const { data } = useLiveQuery(DASHBOARD_KEY, { events: DASHBOARD_EVENTS });
  const workspace = data?.company?.workspace || {};
  return { company: data?.company, workspace, modules: { requests: true, workforce: true, inventory: true, customers: true, chat: true, reviews: true, analytics: true, ...workspace.modules } };
}
