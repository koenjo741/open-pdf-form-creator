import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

// ─── Global Toast State (module-level singleton) ──────────────────────────────
let toastListeners: Array<(toasts: ToastItem[]) => void> = [];
let toasts: ToastItem[] = [];

function notify(listeners: typeof toastListeners, items: ToastItem[]) {
  listeners.forEach((l) => l([...items]));
}

export const toast = {
  show(message: string, variant: ToastVariant = 'info', durationMs = 4000) {
    const id = crypto.randomUUID();
    toasts = [...toasts, { id, message, variant }];
    notify(toastListeners, toasts);
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify(toastListeners, toasts);
    }, durationMs);
  },
  success: (msg: string) => toast.show(msg, 'success'),
  error: (msg: string) => toast.show(msg, 'error', 6000),
  warning: (msg: string) => toast.show(msg, 'warning'),
  info: (msg: string) => toast.show(msg, 'info'),
};

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const borderColors: Record<ToastVariant, string> = {
  success: 'border-emerald-500/30',
  error: 'border-red-500/30',
  warning: 'border-amber-500/30',
  info: 'border-blue-500/30',
};

// ─── ToastContainer (mount once at root) ────────────────────────────────────

export function ToastContainer() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    toastListeners.push(setItems);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== setItems);
    };
  }, []);

  const dismiss = (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notify(toastListeners, toasts);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`
              pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl
              bg-zinc-900/95 backdrop-blur-md border ${borderColors[item.variant]}
              shadow-2xl min-w-[280px] max-w-sm
            `}
          >
            <span className="shrink-0 mt-0.5">{icons[item.variant]}</span>
            <p className="text-sm text-zinc-100 leading-snug flex-1">{item.message}</p>
            <button
              onClick={() => dismiss(item.id)}
              className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
