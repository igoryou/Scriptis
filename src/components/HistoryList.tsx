'use client';

import { useState } from 'react';
import { Search, Star, Trash2, ArrowUpRight, Filter, ChevronDown, MessageSquare, Mail, Camera, Link2, Clock, Zap, Cpu, Sparkles, Globe, ChevronUp, Code2 } from 'lucide-react';
import { type Generation, type ScriptType, type Engine } from '@/lib/domain';

interface HistoryListProps {
  history: Generation[];
  onReopen: (generation: Generation, favorite?: boolean) => void;
  onDelete: (generation: Generation) => void;
  filter?: 'all' | 'favorites';
  searchQuery?: string;
  onSearchChange: (query: string) => void;
  onFilterChange: (filter: 'all' | 'favorites') => void;
  userAuthenticated?: boolean;
}

const SCRIPT_TYPE_LABELS: Record<ScriptType, string> = {
  abordagem_inicial: 'Abordagem inicial',
  follow_up: 'Follow-up',
  tratamento_objeção: 'Tratamento de objeção',
  fechamento_proximo_passo: 'Fechamento/Próximo passo',
  reativacao: 'Reativação/Reconexão',
  nutricao_valor: 'Nutrição/Valor',
  resposta_inbound: 'Resposta inbound',
};

const ENGINE_ICONS: Record<Engine, React.ReactNode> = {
  local: <Sparkles size={12} />,
  llama: <Cpu size={12} />,
  anthropic: <Zap size={12} />,
  openai_compatible: <Globe size={12} />,
};

const CHANNEL_ICONS = {
  WhatsApp: MessageSquare,
  'E-mail': Mail,
  'Instagram DM': Camera,
  LinkedIn: Link2,
};

export function HistoryList({
  history,
  onReopen,
  onDelete,
  filter = 'all',
  searchQuery = '',
  onSearchChange,
  onFilterChange,
  userAuthenticated = false,
}: HistoryListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = history.filter(item => {
    const matchesSearch = !searchQuery || 
      item.input.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.input.niche.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.situationRaw.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || item.variants.some(v => v.favorite);
    return matchesSearch && matchesFilter;
  });

  const favoriteCount = history.reduce((count, item) => count + item.variants.filter(v => v.favorite).length, 0);

  const ChannelIcon = ({ channel }: { channel: string }) => {
    const Icon = CHANNEL_ICONS[channel as keyof typeof CHANNEL_ICONS] || MessageSquare;
    return <Icon size={12} />;
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getScriptTypeLabel = (type: ScriptType) => SCRIPT_TYPE_LABELS[type] || type;

  const getEngineLabel = (engine: Engine) => {
    const labels: Record<Engine, string> = {
      local: 'Local',
      llama: 'Llama',
      anthropic: 'Claude',
      openai_compatible: 'OpenAI',
    };
    return labels[engine] || engine;
  };

  if (filtered.length === 0) {
    return (
      <div className="history-empty">
        {searchQuery ? (
          <>
            <Search size={31} />
            <h2>Nenhum contato encontrado</h2>
            <p>Tente buscar por outro nome ou nicho.</p>
          </>
        ) : filter === 'favorites' ? (
          <>
            <Star size={31} />
            <h2>Guarde o que soa como você</h2>
            <p>Clique na estrela de uma variante para encontrá-la neste espaço.</p>
          </>
        ) : (
          <>
            <MessageSquare size={33} />
            <h2>Sua primeira conversa começa agora</h2>
            <p>Crie uma abordagem. Os textos e suas edições aparecerão aqui.</p>
          </>
        )}
        {!searchQuery && filter === 'all' && (
          <button className="secondary-button" onClick={() => onReopen({} as Generation)}>
            <ArrowUpRight size={16} /> Criar uma abordagem
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="history-page">
      <div className="page-header">
        <div>
          <h1>{filter === 'favorites' ? 'Os estilos que ficaram' : 'Conversas começam. Ideias ficam'}<span>.</span></h1>
          <p>{filter === 'favorites' ? 'As abordagens que mais combinam com a sua voz.' : `Reabra seus últimos scripts e continue de onde parou. ${userAuthenticated ? 'Histórico da conta.' : 'Salvos neste navegador.'}`}</p>
        </div>
      </div>

      <div className="history-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Buscar no histórico"
            placeholder="Buscar por contato, nicho ou situação..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <Filter size={16} />
          <select value={filter} onChange={(e) => onFilterChange(e.target.value as 'all' | 'favorites')}>
            <option value="all">Todas ({history.length})</option>
            <option value="favorites">Favoritos ({favoriteCount})</option>
          </select>
        </div>
        <span className="results-count">{filtered.length} {filtered.length === 1 ? 'abordagem' : 'abordagens'}</span>
      </div>

      <div className="history-list">
        {filtered.map(generation => {
          const isExpanded = expandedId === generation.id;
          const engineIcon = ENGINE_ICONS[generation.engine] || <Sparkles size={12} />;

          return (
            <article key={generation.id} className="history-row">
              <span className="history-avatar">{generation.input.name.slice(0, 1).toUpperCase()}</span>
              
              <button 
                className="history-main" 
                onClick={() => { if (!deleteConfirmId) onReopen(generation, filter === 'favorites'); }}
              >
                <div className="history-main-content">
                  <div className="history-title-row">
                    <strong>{generation.input.name}</strong>
                    <span className="history-niche">{generation.input.niche}</span>
                  </div>
                  <div className="history-meta-row">
                    <span className="history-channel"><ChannelIcon channel={generation.input.channel} /> {generation.input.channel}</span>
                    <span className="history-type">{getScriptTypeLabel(generation.input.scriptType)}</span>
                    <span className="history-date"><Clock size={11} /> {formatDate(generation.createdAt)}</span>
                    <span className="history-engine">{engineIcon} {getEngineLabel(generation.engine)}</span>
                  </div>
                </div>
                <div className="history-preview">
                  {generation.variants.map((v, i) => (
                    <span key={i} className={`variant-pill ${v.favorite ? 'favorite' : ''}`}>
                      {v.title} {v.favorite && <Star size={10} fill="currentColor" />}
                    </span>
                  ))}
                </div>
              </button>

              <div className="history-flags">
                {generation.variants.some(v => v.favorite) && <Star size={15} fill="currentColor" />}
                <span className="engine-badge-small">{engineIcon} {getEngineLabel(generation.engine)}</span>
              </div>

              {deleteConfirmId === generation.id ? (
                <div className="delete-confirm">
                  <span>Excluir este registro?</span>
                  <button className="delete-confirm-btn danger" onClick={() => onDelete(generation)}>Excluir</button>
                  <button className="delete-confirm-btn cancel" onClick={() => setDeleteConfirmId(null)}>Cancelar</button>
                </div>
              ) : (
                <div className="history-actions">
                  <button
                    className="icon-button expand-button"
                    aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                    onClick={() => setExpandedId(isExpanded ? null : generation.id)}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    className="icon-button reopen-button"
                    aria-label={`Reabrir abordagem de ${generation.input.name}`}
                    onClick={() => onReopen(generation, filter === 'favorites')}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                  <button
                    className="icon-button delete-button"
                    aria-label={`Excluir abordagem de ${generation.input.name}`}
                    onClick={() => setDeleteConfirmId(generation.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {filtered.map(generation => {
        const isExpanded = expandedId === generation.id;
        if (!isExpanded) return null;

        return (
          <div key={`${generation.id}-expanded`} className="history-expanded">
            <div className="expanded-header">
              <strong>{generation.input.name}</strong> — {generation.input.niche}
              <span className="expanded-meta">
                <ChannelIcon channel={generation.input.channel} /> {generation.input.channel} · 
                {getScriptTypeLabel(generation.input.scriptType)} · 
                {ENGINE_ICONS[generation.engine]} {getEngineLabel(generation.engine)}
              </span>
            </div>
            
            <div className="expanded-variants">
              {generation.variants.map((variant, i) => (
                <div key={variant.id} className={`expanded-variant ${variant.favorite ? 'favorite' : ''}`}>
                  <div className="variant-header">
                    <span className="variant-badge">{i + 1}</span>
                    <span className="variant-title">{variant.title}</span>
                    {variant.favorite && <Star size={12} fill="currentColor" />}
                  </div>
                  <p className="variant-description">{variant.description}</p>
                  <div className="variant-messages">
                    {variant.messages.map((msg, mi) => (
                      <div key={mi} className="expanded-message">
                        <span className="msg-number">{String(mi + 1).padStart(2, '0')}</span>
                        <span>{msg}</span>
                      </div>
                    ))}
                  </div>
                  {variant.subject && (
                    <div className="variant-subject">
                      <strong>Assunto:</strong> {variant.subject}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <details className="expanded-prompt">
              <summary>
                <Code2 size={14} />
                <span>Ver prompt reutilizável (v{generation.promptVersions[0]?.version || 1})</span>
                <ChevronDown size={14} />
              </summary>
              <pre className="expanded-prompt-pre">{generation.promptVersions[0]?.fullPrompt || generation.promptVersions[0]?.fullPrompt}</pre>
            </details>
          </div>
        );
      })}
    </section>
  );
}