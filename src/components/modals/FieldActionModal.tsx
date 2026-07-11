import { X, Copy, Edit2, Files } from 'lucide-react';
import type { FieldDef } from '../../types';

interface Props {
  field: FieldDef;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onClone: () => void;
}

export function FieldActionModal({ field, onClose, onRename, onDuplicate, onClone }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold text-white mb-6">
          Aktionen für "{field.name}"
        </h2>

        <div className="space-y-4">
          <button
            onClick={() => { onRename(); onClose(); }}
            className="w-full text-left p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-start gap-4"
          >
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Umbenennen</div>
              <div className="text-xs text-zinc-400">
                Ändere den Namen dieses Feldes (und damit auch den Schlüsselnamen im JSON-Export).
              </div>
            </div>
          </button>

          <button
            onClick={() => { onDuplicate(); onClose(); }}
            className="w-full text-left p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-start gap-4"
          >
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Duplizieren</div>
              <div className="text-xs text-zinc-400">
                Erstellt ein neues, völlig unabhängiges Feld mit einem <b>neuen, eigenen Feldnamen</b>. Das Feld kann separat ausgefüllt werden.
              </div>
            </div>
          </button>

          <button
            onClick={() => { onClone(); onClose(); }}
            className="w-full text-left p-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-start gap-4"
          >
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <Files className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-white mb-1">Klonen (Spiegeln)</div>
              <div className="text-xs text-zinc-400">
                Erstellt ein <b>gesperrtes (nicht editierbares)</b> Feld, das den exakt gleichen Namen trägt. Es spiegelt automatisch den Inhalt dieses Feldes und wird im JSON nur 1x exportiert.
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
