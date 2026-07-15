import { X, Copy, Edit2, Files } from 'lucide-react';
import type { FieldDef } from '../../types';

interface Props {
  field: FieldDef;
  onClose: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onClone: () => void;
  onConvert: (type: FieldDef['type'], subType?: string) => void;
}

export function FieldActionModal({ field, onClose, onRename, onDuplicate, onClone, onConvert }: Props) {
  const isCheckboxOrRadio = field.type === 'checkbox' || field.type === 'radio';
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

        <div className="mt-6 border-t border-zinc-700 pt-6">
          <div className="font-medium text-white mb-3">Feld umwandeln in...</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onConvert('text')}
              className={`p-2 rounded-lg text-sm text-left transition-colors border ${field.type === 'text' && field.textSubType === 'text' ? 'bg-zinc-800 border-zinc-600 text-white cursor-default' : 'bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
              disabled={field.type === 'text' && (!field.textSubType || field.textSubType === 'text')}
            >
              Textfeld
            </button>
            <button
              onClick={() => onConvert('date')}
              className={`p-2 rounded-lg text-sm text-left transition-colors border ${field.type === 'date' ? 'bg-zinc-800 border-zinc-600 text-white cursor-default' : 'bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
              disabled={field.type === 'date'}
            >
              Datum
            </button>
            <button
              onClick={() => onConvert('dropdown')}
              className={`p-2 rounded-lg text-sm text-left transition-colors border ${field.type === 'dropdown' ? 'bg-zinc-800 border-zinc-600 text-white cursor-default' : 'bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
              disabled={field.type === 'dropdown'}
            >
              Dropdown
            </button>
            <button
              onClick={() => onConvert('checkbox')}
              className={`p-2 rounded-lg text-sm text-left transition-colors border ${field.type === 'checkbox' ? 'bg-zinc-800 border-zinc-600 text-white cursor-default' : 'bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
              disabled={field.type === 'checkbox'}
            >
              Kontrollkästchen
            </button>
            <button
              onClick={() => onConvert('radio')}
              className={`p-2 rounded-lg text-sm text-left transition-colors border ${field.type === 'radio' ? 'bg-zinc-800 border-zinc-600 text-white cursor-default' : 'bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
              disabled={field.type === 'radio'}
            >
              Radio-Button
            </button>
            <button
              onClick={() => onConvert('text', 'number')}
              className={`p-2 rounded-lg text-sm text-left transition-colors border ${field.type === 'text' && field.textSubType === 'number' ? 'bg-zinc-800 border-zinc-600 text-white cursor-default' : 'bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
              disabled={field.type === 'text' && field.textSubType === 'number'}
            >
              Zahlen
            </button>
            <button
              onClick={() => onConvert('text', 'currency')}
              className={`p-2 rounded-lg text-sm text-left transition-colors border ${field.type === 'text' && field.textSubType === 'currency' ? 'bg-zinc-800 border-zinc-600 text-white cursor-default' : 'bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
              disabled={field.type === 'text' && field.textSubType === 'currency'}
            >
              Währung
            </button>
            <button
              onClick={() => onConvert('text', 'iban')}
              className={`p-2 rounded-lg text-sm text-left transition-colors border ${field.type === 'text' && field.textSubType === 'iban' ? 'bg-zinc-800 border-zinc-600 text-white cursor-default' : 'bg-zinc-800/50 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
              disabled={field.type === 'text' && field.textSubType === 'iban'}
            >
              IBAN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
