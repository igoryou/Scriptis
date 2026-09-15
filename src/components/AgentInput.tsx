'use client';

import { useRef, useEffect, type KeyboardEvent } from 'react';
import { Send, Loader2, Sparkles, X } from 'lucide-react';

interface AgentInputProps {
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
  placeholder?: string;
  disabled?: boolean;
  canSubmit?: boolean;
  onClear?: () => void;
}

export function AgentInput({
  value,
  onChange,
  busy,
  placeholder = 'Descreva a situação... Ex: "Preciso fazer follow-up com a Carla da clínica, ela pediu para ligar terça mas não atendeu"',
  disabled,
  canSubmit = true,
  onClear,
}: AgentInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const minHeight = 60;
  const maxHeight = 280;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = `${minHeight}px`;
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const form = textareaRef.current?.closest('form');
      form?.requestSubmit();
    }
  };

  return (
    <div className="agent-input-form">
      <div className="agent-input-wrapper">
        <textarea
          ref={textareaRef}
          className="agent-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || busy}
          rows={1}
          spellCheck
          aria-label="Descreva a situação para gerar o script"
          aria-busy={busy}
        />
        <div className="agent-input-footer">
          <div className="agent-hint">
            <Sparkles size={14} />
            <span>Pressione <kbd>Ctrl</kbd> + <kbd>Enter</kbd> para gerar</span>
          </div>
          <div className="agent-actions">
            {value && onClear && (
              <button
                type="button"
                className="icon-button clear-button"
                onClick={onClear}
                aria-label="Limpar"
                disabled={busy}
              >
                <X size={16} />
              </button>
            )}
            <button
              type="submit"
              className={`primary-button generate-button ${busy ? 'busy' : ''}`}
              disabled={busy || disabled || !canSubmit}
              aria-busy={busy}
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Compondo...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Gerar script
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}