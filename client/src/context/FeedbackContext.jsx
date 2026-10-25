import { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../components/ui';
import FeedbackContext from './feedbackContextValue';

// App-wide confirmation dialogs, text prompts and toasts. Replaces the
// browser's window.confirm / window.prompt, which block the page and look
// out of place in a product.

let toastSeq = 0;

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [value, setValue] = useState('');
  const [toasts, setToasts] = useState([]);
  const resolver = useRef(null);

  const close = useCallback((result) => {
    resolver.current?.(result);
    resolver.current = null;
    setDialog(null);
  }, []);

  const open = useCallback((config) => new Promise((resolve) => {
    resolver.current = resolve;
    setValue(config.defaultValue || '');
    setDialog(config);
  }), []);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const push = useCallback((tone, message, options = {}) => {
    const id = ++toastSeq;
    setToasts((list) => [...list.slice(-3), { id, tone, message, title: options.title }]);
    window.setTimeout(() => dismiss(id), options.duration || (tone === 'error' ? 6000 : 3600));
    return id;
  }, [dismiss]);

  const api = useMemo(() => ({
    confirm: (config) => open({ kind: 'confirm', confirmLabel: 'Confirm', ...config }),
    prompt: (config) => open({ kind: 'prompt', confirmLabel: 'Submit', ...config }),
    toast: {
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      info: (message, options) => push('info', message, options),
    },
  }), [open, push]);

  const submitPrompt = (event) => {
    event.preventDefault();
    if (dialog?.required !== false && !value.trim()) return;
    close(value.trim());
  };

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <Modal
        open={Boolean(dialog)}
        onClose={() => close(dialog?.kind === 'prompt' ? null : false)}
        title={dialog?.title}
        description={dialog?.message}
        size="sm"
        footer={dialog && (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => close(dialog.kind === 'prompt' ? null : false)}>{dialog.cancelLabel || 'Cancel'}</button>
            <button
              type={dialog.kind === 'prompt' ? 'submit' : 'button'}
              form={dialog.kind === 'prompt' ? 'feedback-prompt' : undefined}
              data-autofocus
              className={`btn ${dialog.tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`}
              onClick={dialog.kind === 'confirm' ? () => close(true) : undefined}
              disabled={dialog.kind === 'prompt' && dialog.required !== false && !value.trim()}
            >
              {dialog.confirmLabel}
            </button>
          </>
        )}
      >
        {dialog?.kind === 'prompt' ? (
          <form id="feedback-prompt" onSubmit={submitPrompt} className="field">
            {dialog.label && <span className="label">{dialog.label}</span>}
            {dialog.multiline
              ? <textarea className="textarea" value={value} onChange={(event) => setValue(event.target.value)} placeholder={dialog.placeholder} />
              : <input className="input" value={value} onChange={(event) => setValue(event.target.value)} placeholder={dialog.placeholder} />}
          </form>
        ) : dialog?.body || null}
      </Modal>
      {createPortal(
        <div className="toast-stack pointer-events-none fixed inset-x-0 z-[300] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto flex w-full max-w-sm animate-rise-in items-start gap-3 rounded-2xl border border-line bg-raised px-4 py-3 shadow-pop">
              <span className={`material-symbols-outlined icon-fill mt-0.5 text-[20px] ${toast.tone === 'success' ? 'text-success' : toast.tone === 'error' ? 'text-danger' : 'text-brand'}`}>
                {toast.tone === 'success' ? 'check_circle' : toast.tone === 'error' ? 'error' : 'info'}
              </span>
              <div className="min-w-0 flex-1 text-[13.5px]">
                {toast.title && <p className="font-semibold text-ink">{toast.title}</p>}
                <p className="text-muted">{toast.message}</p>
              </div>
              <button type="button" onClick={() => dismiss(toast.id)} className="text-subtle hover:text-ink" aria-label="Dismiss"><span className="material-symbols-outlined text-[18px]">close</span></button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </FeedbackContext.Provider>
  );
}
