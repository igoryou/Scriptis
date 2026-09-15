'use client';

import { useRef, useEffect, useState } from 'react';
import { Copy, Check, Star, MessageSquare, Mail, Camera, Link2, ChevronDown, ChevronUp } from 'lucide-react';
import { type Variant, type Channel } from '@/lib/domain';

interface ScriptCardProps {
  variant: Variant;
  index: number;
  active: boolean;
  channel: Channel;
  onSelect: () => void;
  onCopyMessage: (message: string, label: string) => void;
  onCopyAll: (messages: string[], subject?: string) => void;
  onToggleFavorite: () => void;
  onEditMessage: (messageIndex: number, value: string) => void;
}

export function ScriptCard({
  variant,
  index,
  active,
  channel,
  onSelect,
  onCopyMessage,
  onCopyAll,
  onToggleFavorite,
  onEditMessage,
}: ScriptCardProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingIndex !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editingIndex, editValue]);

  const startEdit = (messageIndex: number, currentValue: string) => {
    setEditingIndex(messageIndex);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingIndex !== null) {
      onEditMessage(editingIndex, editValue);
      setEditingIndex(null);
      setEditValue('');
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  };

  const ChannelIcon = {
    WhatsApp: MessageSquare,
    'E-mail': Mail,
    'Instagram DM': Camera,
    LinkedIn: Link2,
  }[channel];

  const getMessageLabel = (msgIndex: number, total: number) => {
    if (channel === 'E-mail') return 'Corpo do e-mail';
    if (channel === 'LinkedIn') return 'Mensagem LinkedIn';
    if (msgIndex === 0) return 'Abra a conversa';
    if (msgIndex === total - 1) return 'Convide uma resposta';
    return 'Traga o contexto';
  };

  return (
    <div
      role="tabpanel"
      id={`variant-panel-${index}`}
      aria-labelledby={`variant-tab-${index}`}
      className={`script-card ${active ? 'active' : ''}`}
      key={variant.id}
    >
      <div className="variant-header">
        <div className="variant-title-row">
          <span className="variant-number">{index + 1}</span>
          <h3 className="variant-title">{variant.title}</h3>
          {variant.favorite && <Star size={16} fill="currentColor" className="favorite-star" />}
        </div>
        <div className="variant-actions">
          <button
            className={`icon-button favorite-toggle ${variant.favorite ? 'favorited' : ''}`}
            onClick={onToggleFavorite}
            aria-label={variant.favorite ? 'Remover dos favoritos' : 'Favoritar'}
            aria-pressed={variant.favorite}
          >
            <Star size={17} fill={variant.favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>

      <p className="variant-description">{variant.description}</p>

      {variant.subject && (
        <div className="subject-block">
          <div className="block-header">
            <span className="block-label"><Mail size={14} /> Assunto</span>
            <button
              className="copy-button"
              onClick={() => onCopyMessage(variant.subject!, 'Assunto')}
              aria-label="Copiar assunto"
            >
              <Copy size={13} /> Copiar
            </button>
          </div>
          {editingIndex === -1 ? (
            <textarea
              ref={textareaRef}
              className="editable-text subject-text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              rows={1}
              spellCheck
            />
          ) : (
            <div
              className="editable-display subject-display"
              onDoubleClick={() => { setEditValue(variant.subject!); setEditingIndex(-1); }}
            >
              {variant.subject}
            </div>
          )}
        </div>
      )}

      <ol className="message-sequence" role="list" aria-label={`${variant.title} - mensagens`}>
        {variant.messages.map((message, msgIndex) => (
          <li key={msgIndex} className="message-row">
            <span className="message-number">{String(msgIndex + 1).padStart(2, '0')}</span>
            <div className="message-block">
              <div className="block-header">
                <span className="block-label">
                  {channel === 'WhatsApp' || channel === 'Instagram DM' ? (
                    <>
                      <MessageSquare size={12} /> {getMessageLabel(msgIndex, variant.messages.length)}
                    </>
                  ) : channel === 'E-mail' ? (
                    <>
                      <Mail size={12} /> {getMessageLabel(msgIndex, variant.messages.length)}
                    </>
                  ) : (
                    <>
                      <Link2 size={12} /> {getMessageLabel(msgIndex, variant.messages.length)}
                    </>
                  )}
                </span>
                <button
                  className="copy-button"
                  onClick={() => onCopyMessage(message, `Mensagem ${msgIndex + 1}`)}
                  aria-label={`Copiar mensagem ${msgIndex + 1}`}
                >
                  <Copy size={13} /> Copiar
                </button>
              </div>
              {editingIndex === msgIndex ? (
                <textarea
                  ref={textareaRef}
                  className="editable-text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  spellCheck
                  style={{ minHeight: '44px' }}
                />
              ) : (
                <div
                  className="editable-display"
                  onDoubleClick={() => startEdit(msgIndex, message)}
                >
                  {message}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="card-footer">
        <button
          className="secondary-button copy-all-button"
          onClick={() => onCopyAll(variant.messages, variant.subject)}
        >
          <Copy size={15} /> Copiar tudo
        </button>
        <span className="channel-badge">
          <ChannelIcon size={13} /> {channel}
        </span>
      </div>
    </div>
  );
}