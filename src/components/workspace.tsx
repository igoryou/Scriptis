'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent } from 'react';
import { Feather, History, Star, Settings2, Plus, ShieldCheck, Leaf, MessagesSquare, ChevronLeft, X, ArrowRight, Loader2, Cpu, Zap, Globe, Mail, Link2, Camera, Check, Search, Filter, Trash2, ArrowUpRight, Clock, Code2, ChevronDown, ChevronUp, Copy, ChevronRight, ExternalLink } from 'lucide-react';
import { CHANNELS, OBJECTIVES, TONES, RELATIONSHIPS, ENGINES, type Generation, type LeadInput, type Engine, type UserConfig, type ScriptType, leadInputSchema, situationInputSchema, userConfigSchema, generationSchema } from '@/lib/domain';
import { generateScript, validateSituation, getAvailableEngines } from '@/lib/agent';
import { readLocalHistory, upsertHistory, writeLocalHistory, HISTORY_KEY } from '@/lib/local-history';
import { AgentInput } from './AgentInput';
import { ScriptCard } from './ScriptCard';
import { PromptDisplay } from './PromptDisplay';
import { ModelSelector } from './ModelSelector';
import { HistoryList } from './HistoryList';
import { Brand } from './brand';

type View = 'create' | 'history' | 'favorites' | 'settings';
type Config = { supabaseConfigured: boolean; anthropicConfigured: boolean; openaiConfigured: boolean; llamaAvailable: boolean; user: { id: string; email: string } | null };
const defaultConfig: Config = { supabaseConfigured: false, anthropicConfigured: false, openaiConfigured: false, llamaAvailable: false, user: null };
const emptyInput: LeadInput = { name: '', niche: '', channel: 'WhatsApp', objective: 'Agendar reunião', tone: 'Consultivo', hook: '', relationship: 'Contato frio', scriptType: 'abordagem_inicial', objection: '', nextStep: '', context: '' };

async function fetchConfig(): Promise<Config> {
  try {
    const response = await fetch('/api/config', { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Config failed');
    const data = await response.json();
    let llamaAvailable = false;
    try {
      const ollamaRes = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
      llamaAvailable = ollamaRes.ok;
    } catch { /* ignored */ }
    return { ...data, llamaAvailable };
  } catch {
    return { ...defaultConfig, llamaAvailable: false };
  }
}

function formatElapsed(ms: number) {
  if (ms < 100) return 'menos de 0,1 s';
  return `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
}

export default function Workspace() {
  const [view, setView] = useState<View>('create');
  const [input, setInput] = useState<LeadInput>(emptyInput);
  const [current, setCurrent] = useState<Generation | null>(null);
  const [history, setHistory] = useState<Generation[]>([]);
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [userConfig, setUserConfig] = useState<UserConfig>(userConfigSchema.parse({}));
  const [currentEngine, setCurrentEngine] = useState<Engine>('local');
  const [tab, setTab] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const generationIndex = useRef(0);
  const resultRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const ollamaCheckDone = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let settings = defaultConfig;
      try { settings = await fetchConfig(); } catch { /* fallback */ }
      if (cancelled) return;
      setConfig(settings);
      setCurrentEngine(settings.user ? 'local' : userConfig.defaultEngine);
      setUserConfig(userConfigSchema.parse({ ...userConfig, ...(settings.llamaAvailable ? { llamaEndpoint: 'http://localhost:11434' } : {}) }));
      
      try {
        if (settings.user) {
          const result = await fetch('/api/history', { signal: AbortSignal.timeout(10000) });
          if (result.ok) {
            const data = await result.json();
            const rows = (data.generations || []).map((row: any) => generationSchema.parse(row));
            if (!cancelled) setHistory(rows);
          }
        } else {
          const local = readLocalHistory(localStorage);
          if (!cancelled) {
            setHistory(local.generations);
            if (local.error) setError(local.error);
          }
        }
      } catch { if (!cancelled) setError('Não foi possível carregar o histórico. Seus dados locais não foram enviados para a conta.'); }
      if (!cancelled) setReady(true);
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (ollamaCheckDone.current) return;
    const check = async () => {
      try {
        const res = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
        if (res.ok && !config.llamaAvailable) {
          setConfig(prev => ({ ...prev, llamaAvailable: true }));
          ollamaCheckDone.current = true;
        }
      } catch { /* ignored */ }
    };
    const timer = setInterval(check, 10000);
    check();
    return () => clearInterval(timer);
  }, [config.llamaAvailable]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  function replaceCurrent(generation: Generation | null) { setCurrent(generation); setTab(0); }

  function changeField<K extends keyof LeadInput>(key: K, value: LeadInput[K]) { 
    setInput(previous => ({ ...previous, [key]: value })); 
  }

  async function saveGeneration(generation: Generation) {
    setSaved(false);
    const parsed = generationSchema.safeParse(generation);
    if (!parsed.success) { setError('Uma mensagem ficou vazia ou ultrapassou o limite. Ajuste o texto para salvar.'); return; }
    
    const rows = upsertHistory(history, generation);
    setHistory(rows);
    
    if (!config.user) {
      const storageError = writeLocalHistory(localStorage, rows);
      if (storageError) { setError(storageError); return; }
      setSaved(true);
      return;
    }
    
    const save = saveQueue.current.catch(() => {}).then(() => 
      fetch('/api/history', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ generation }) 
      })
    );
    saveQueue.current = save;
    try { 
      await save; 
      if (current?.id === generation.id) setSaved(true); 
    } catch (cause) { 
      setError(cause instanceof Error ? cause.message : 'Não foi possível sincronizar. Copie os textos antes de sair.'); 
    }
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    if (busy || !ready) return;
    
    let validatedInput: LeadInput;
    
    const hasStructuredInput = input.name || input.niche || input.hook || input.context;
    if (!hasStructuredInput && input.context) {
      const validation = await validateSituation(input.context);
      if (!validation.valid || !validation.parsed) {
        setError('Não consegui entender a situação. Tente ser mais específico ou use os campos ao lado.');
        return;
      }
      validatedInput = validation.parsed;
    } else {
      const parsed = leadInputSchema.safeParse(input);
      if (!parsed.success) { setError('Confira os campos do contato.'); return; }
      validatedInput = parsed.data;
    }
    
    setError(''); 
    setBusy(true);
    const start = performance.now();
    
    try {
      const iteration = generationIndex.current++;
      const result = await generateScript({
        leadInput: validatedInput,
        userConfig,
        engine: currentEngine,
        iteration,
      });
      
      replaceCurrent(result.generation); 
      setElapsed(performance.now() - start);
      await saveGeneration(result.generation);
      
      requestAnimationFrame(() => {
        if (window.innerWidth < 980) resultRef.current?.scrollIntoView({ 
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', 
          block: 'start' 
        });
        resultRef.current?.focus({ preventScroll: true });
      });
    } catch (cause) { 
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar. Tente novamente.'); 
    } finally { 
      setBusy(false); 
    }
  }

  function editVariant(messageIndex: number, value: string) {
    const generation = current;
    if (!generation) return;
    const next = { 
      ...generation, 
      variants: generation.variants.map((variant, index) => 
        index === tab ? { ...variant, messages: variant.messages.map((msg, mi) => mi === messageIndex ? value : msg) } : variant
      ) 
    };
    replaceCurrent(next); 
    setSaved(false);
  }

  function editSubject(value: string) {
    const generation = current;
    if (!generation) return;
    const next = { 
      ...generation, 
      variants: generation.variants.map((variant, index) => 
        index === tab ? { ...variant, subject: value } : variant
      ) 
    };
    replaceCurrent(next); 
    setSaved(false);
  }

  function toggleFavorite() {
    const generation = current;
    if (!generation) return;
    const favorite = !generation.variants[tab].favorite;
    const next = { 
      ...generation, 
      variants: generation.variants.map((variant, index) => 
        index === tab ? { ...variant, favorite } : variant 
      ) 
    };
    replaceCurrent(next); 
    void saveGeneration(next);
    setNotice(favorite ? 'Estilo salvo nos favoritos.' : 'Estilo removido dos favoritos.');
  }

  async function copy(text: string, message = 'Texto copiado.') {
    try { 
      await navigator.clipboard.writeText(text); 
      setNotice(message); 
    } catch { 
      setError('O navegador não permitiu copiar. Selecione o texto e copie manualmente.'); 
    }
  }

  function reopen(generation: Generation, favorite = false) {
    replaceCurrent(generation); 
    setInput(generation.input); 
    setView('create'); 
    setElapsed(null); 
    setSaved(true); 
    setError('');
    setTab(favorite ? Math.max(0, generation.variants.findIndex(v => v.favorite)) : 0);
  }

  async function remove(generation: Generation) {
    try {
      if (config.user) {
        await saveQueue.current.catch(() => {});
        await fetch(`/api/history?id=${encodeURIComponent(generation.id)}`, { method: 'DELETE' });
      }
      const rows = history.filter(row => row.id !== generation.id);
      if (!config.user) { const problem = writeLocalHistory(localStorage, rows); if (problem) throw new Error(problem); }
      setHistory(rows); 
      if (current?.id === generation.id) { replaceCurrent(null); setSaved(false); }
      setNotice('Abordagem excluída.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível excluir.'); }
  }

  function newApproach() {
    if (current && !saved) void saveGeneration(current);
    setInput(emptyInput); 
    replaceCurrent(null); 
    setView('create'); 
    setTab(0); 
    setError(''); 
    setElapsed(null);
  }

  function clearInput() {
    setInput(emptyInput);
    replaceCurrent(null);
    setError('');
  }

  const nav = [
    { id: 'create' as const, label: 'Criar', icon: Feather },
    { id: 'history' as const, label: 'Histórico', icon: History },
    { id: 'favorites' as const, label: 'Favoritos', icon: Star },
  ];

  const availableEngines = getAvailableEngines(userConfig);
  const engineAvailable = availableEngines.find(e => e.engine === currentEngine)?.available ?? true;
  const currentEngineInfo = availableEngines.find(e => e.engine === currentEngine);

  const ChannelIcon = {
    WhatsApp: MessagesSquare,
    'E-mail': Mail,
    'Instagram DM': Camera,
    LinkedIn: Link2,
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main">Pular para o conteúdo</a>
      
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="brand-button" onClick={() => setView('create')} aria-label="Scriptis, início">
            <Brand />
          </button>
          <button 
            className="collapse-toggle" 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        {!sidebarCollapsed && (
          <>
            <button className="new-button" onClick={newApproach}>
              <Plus size={17} /><span>Nova abordagem</span>
            </button>
            
            <nav aria-label="Navegação principal">
              {nav.map(item => (
                <button 
                  key={item.id} 
                  className={`nav-item ${view === item.id ? 'active' : ''}`} 
                  onClick={() => { setView(item.id); setSearch(''); setError(''); }}
                  aria-current={view === item.id ? 'page' : undefined}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                  {item.id === 'history' && history.length > 0 && <span className="nav-count">{history.length}</span>}
                  {item.id === 'favorites' && history.reduce((c, i) => c + i.variants.filter(v => v.favorite).length, 0) > 0 && (
                    <span className="nav-count">{history.reduce((c, i) => c + i.variants.filter(v => v.favorite).length, 0)}</span>
                  )}
                </button>
              ))}
            </nav>
            
            <div className="sidebar-bottom">
              <div className="free-note">
                <Leaf size={20} />
                <strong>O começo é por nossa conta.</strong>
                <p>Componha sem chave de API.<br />Seu jeito de falar vem depois.</p>
                <span>Motor local · gratuito</span>
              </div>
              
              <ModelSelector
                currentEngine={currentEngine}
                userConfig={userConfig}
                onChange={setCurrentEngine}
                onConfigChange={setUserConfig}
                ollamaAvailable={config.llamaAvailable}
                anthropicConfigured={config.anthropicConfigured}
                openaiConfigured={config.openaiConfigured}
                disabled={busy}
              />
              
              <button 
                className={`nav-item ${view === 'settings' ? 'active' : ''}`} 
                onClick={() => setView('settings')}
              >
                <Settings2 size={18} /><span>Conta e integrações</span>
              </button>
              
              <div className="local-profile">
                <span className="profile-icon"><ShieldCheck size={18} /></span>
                <div>
                  <strong>{config.user ? 'Seu espaço' : 'Espaço local'}</strong>
                  <span>{config.user ? config.user.email : 'Salvo neste navegador'}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
      
      {sidebarCollapsed && (
        <div className="sidebar-tooltip" role="tooltip">
          <button className="brand-button" onClick={() => setView('create')} aria-label="Scriptis"><Brand /></button>
          <nav>
            {nav.map(item => (
              <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => setView(item.id)} aria-label={item.label}>
                <item.icon size={18} />
              </button>
            ))}
            <button className="nav-item" onClick={() => setSidebarCollapsed(false)} aria-label="Expandir">
              <ChevronRight size={18} />
            </button>
          </nav>
        </div>
      )}

      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Seu espaço<span>/</span>
            <strong>
              {view === 'create' ? 'Criar abordagem' : view === 'history' ? 'Histórico' : view === 'favorites' ? 'Favoritos' : 'Conta e integrações'}
            </strong>
          </span>
          <span className="private-note">
            <ShieldCheck size={14} />
            {config.user ? 'Conta conectada' : 'Sem conta. Sem atrito.'}
          </span>
        </header>
        
        <main id="main" className="main-content">
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button aria-label="Fechar aviso" onClick={() => setError('')}><X size={18} /></button>
            </div>
          )}
          
          {view === 'create' && (
            <>
              <div className="editor-layout">
                <aside className="context-panel" aria-label="Contexto do contato">
                  {!sidebarCollapsed && (
                    <div className="panel-heading">
                      <div>
                        <h2>Sobre a conversa</h2>
                        <p>Descreva a situação ou preencha os campos.</p>
                      </div>
                      <MessagesSquare size={19} />
                    </div>
                  )}
                  
                  <form ref={formRef} onSubmit={handleGenerate} className="context-form">
                    {!sidebarCollapsed && (
                      <div className="structured-fields">
                        <div className="field-row">
                          <label htmlFor="name">Nome</label>
                          <input id="name" autoComplete="off" maxLength={80} placeholder="Nome do contato" value={input.name} onChange={e => changeField('name', e.target.value)} />
                        </div>
                        <div className="field-row">
                          <label htmlFor="niche">Nicho</label>
                          <input id="niche" list="niche-options" autoComplete="off" maxLength={120} placeholder="Ex.: clínica odontológica" value={input.niche} onChange={e => changeField('niche', e.target.value)} />
                          <datalist id="niche-options">
                            {['Clínica odontológica', 'Imobiliária', 'Consultoria', 'E-commerce', 'Infoprodutos', 'Agência de marketing', 'Arquitetura'].map(n => <option key={n} value={n} />)}
                          </datalist>
                        </div>
                        <fieldset className="field-row">
                          <legend>Canal</legend>
                          <div className="channel-options">
                            {CHANNELS.map(channel => {
                              const Icon = ChannelIcon[channel as keyof typeof ChannelIcon];
                              return (
                                <label key={channel} className={`channel-option ${input.channel === channel ? 'selected' : ''}`}>
                                  <input type="radio" name="channel" value={channel} checked={input.channel === channel} onChange={() => changeField('channel', channel as LeadInput['channel'])} />
                                  <Icon size={16} /><span>{channel === 'Instagram DM' ? 'Instagram' : channel}</span>
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                        <div className="field-row">
                          <label htmlFor="objective">Objetivo</label>
                          <select id="objective" value={input.objective} onChange={e => changeField('objective', e.target.value as LeadInput['objective'])}>{OBJECTIVES.map(v => <option key={v}>{v}</option>)}</select>
                        </div>
                        <fieldset className="field-row">
                          <legend>Tom</legend>
                          <div className="tone-options">
                            {TONES.map(tone => (
                              <label key={tone} className={input.tone === tone ? 'selected' : ''}>
                                <input type="radio" name="tone" value={tone} checked={input.tone === tone} onChange={() => changeField('tone', tone)} />
                                {tone}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <div className="field-row">
                          <label htmlFor="relationship">Relacionamento</label>
                          <select id="relationship" value={input.relationship} onChange={e => changeField('relationship', e.target.value as LeadInput['relationship'])}>{RELATIONSHIPS.map(v => <option key={v}>{v}</option>)}</select>
                        </div>
                        <div className="field-row hook-field">
                          <label htmlFor="hook">Gancho observado <span>opcional</span></label>
                          <textarea id="hook" rows={2} maxLength={600} placeholder="Ex: tem Instagram ativo mas não converte" value={input.hook} onChange={e => changeField('hook', e.target.value)} />
                          <span className="field-hint">Um detalhe real deixa a abordagem mais sua.</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="agent-input-section">
                      <AgentInput
                        value={input.context || input.hook || ''}
                        onChange={(val) => { changeField('context', val); changeField('hook', val); }}
                        onSubmit={handleGenerate}
                        busy={busy}
                        disabled={busy}
                        onClear={clearInput}
                      />
                    </div>
                  </form>
                </aside>
                
                <section className="result-panel" ref={resultRef} tabIndex={-1} aria-label="Scripts gerados" aria-busy={busy}>
                  {current && current.variants[tab] ? (
                    <>
                      <div className="result-header">
                        <div>
                          <h2>Suas abordagens</h2>
                          <p>
                            <span className="channel-tag">{current.input.channel}</span>
                            <span className="type-tag">{current.input.scriptType.replace(/_/g, ' ')}</span>
                            <span className="contact-name">{current.input.name}</span>
                          </p>
                        </div>
                        <div className="result-badges">
                          <span className={`engine-badge ${current.engine}`}>
                            {current.engine === 'local' && <span className="badge-dot" />}
                            {current.engine === 'local' ? 'Local' : current.engine === 'llama' ? `Llama (${current.model})` : current.engine === 'anthropic' ? `Claude (${current.model})` : `OpenAI (${current.model})`}
                          </span>
                          {elapsed !== null && <span className="elapsed-badge">⚡ {formatElapsed(elapsed)}</span>}
                        </div>
                      </div>
                      
                      <div className="variant-tabs" role="tablist">
                        {current.variants.map((variant, index) => (
                          <button
                            id={`variant-tab-${index}`}
                            role="tab"
                            aria-selected={tab === index}
                            aria-controls="variant-panel"
                            tabIndex={tab === index ? 0 : -1}
                            key={variant.id}
                            onClick={() => setTab(index)}
                            className={`variant-tab ${tab === index ? 'active' : ''} ${variant.favorite ? 'favorite' : ''}`}
                          >
                            <span className="variant-index">{index + 1}</span>
                            {variant.title}
                            {variant.favorite && <Star size={12} fill="currentColor" />}
                          </button>
                        ))}
                      </div>
                      
                      <ScriptCard
                        variant={current.variants[tab]}
                        index={tab}
                        active={true}
                        channel={current.input.channel}
                        onSelect={() => {}}
                        onCopyMessage={copy}
                        onCopyAll={(messages, subject) => copy(
                          [...(subject ? [`Assunto: ${subject}`] : []), ...messages].join('\n\n'),
                          'Abordagem completa copiada.'
                        )}
                        onToggleFavorite={toggleFavorite}
                        onEditMessage={editVariant}
                      />
                      
                      <PromptDisplay
                        promptVersions={current.promptVersions}
                        engine={current.engine}
                        model={current.model}
                        onCopy={copy}
                      />
                      
                      <p className="result-footnote">
                        {elapsed !== null && <>Composto em {formatElapsed(elapsed)}<span>·</span></>}
                        Edite qualquer mensagem clicando duas vezes. Copie por bloco ou tudo.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="empty-state">
                        <div className="empty-illustration">
                          <MessagesSquare size={48} />
                        </div>
                        <h2>Do contexto à conversa</h2>
                        <p>Descreva a situação acima ou preencha os campos. Em segundos, três abordagens prontas para revisar e copiar.</p>
                        
                        <div className="example-preview">
                          <div className="example-contact">
                            <span className="contact-avatar">C</span>
                            <div><strong>Carla</strong><span>Clínica odontológica</span></div>
                            <span className="channel-tag"><MessagesSquare size={14} />WhatsApp</span>
                          </div>
                          <div className="example-messages">
                            <div className="example-message"><span className="example-order">01</span><p>Oi, Carla! Tudo bem?</p></div>
                            <div className="example-message"><span className="example-order">02</span><p>Queria trocar uma ideia sobre agendamento na clínica, se fizer sentido.</p></div>
                            <div className="example-pause"><span /><span>espaço para resposta</span><span /></div>
                            <div className="example-message final"><span className="example-order">03</span><p>Posso te fazer uma pergunta rápida sobre isso?</p></div>
                          </div>
                        </div>
                        
                        <button className="text-button" onClick={() => { setInput({...emptyInput, name:'Carla', niche:'Clínica odontológica', hook:'o agendamento é feito só por telefone'}); }}>Experimentar com este contato <ArrowRight size={16} /></button>
                      </div>
                      
                      {busy && (
                        <div className="loading-overlay">
                          <div className="loading-bars"><span /><span /><span /></div>
                          <p>Encontrando o melhor jeito de começar…</p>
                        </div>
                      )}
                    </>
                  )}
                </section>
              </div>
              
              <footer className="workspace-footer">
                <span>Scripts que soam como você, não como um robô.</span>
                <span>Você escolhe o texto. Você conduz a conversa.</span>
              </footer>
            </>
          )} 
          {view === 'settings' && (
            <section className="settings-page">
              <h1>Seu espaço, suas escolhas<span>.</span></h1>
              <p className="page-description">Comece de graça. Conecte outros serviços só quando fizer sentido.</p>
              
              <div className="settings-section">
                <Leaf size={22} />
                <div>
                  <h2>Motor gratuito (Local)</h2>
                  <p>A base do Scriptis compõe mensagens com regras locais. Não usa IA, não precisa de chave e não cobra por geração.</p>
                  <span className="mode-badge">Ativo por padrão</span>
                </div>
              </div>
              
              <div className="settings-section">
                <Cpu size={22} />
                <div>
                  <h2>Llama via Ollama (Local)</h2>
                  <p>Modelo aberto rodando na sua máquina. Privado, gratuito, sem limites de API.</p>
                  <p>Requer: <code>ollama pull llama3.1:8b</code> e <code>ollama serve</code> rodando.</p>
                  <span className="integration-state">{config.llamaAvailable ? '✅ Ollama detectado' : '❌ Ollama não encontrado'}</span>
                </div>
              </div>
              
              <div className="settings-section">
                <Zap size={22} />
                <div>
                  <h2>Claude (Anthropic)</h2>
                  <p>API paga, nuvem. Alta qualidade para scripts complexos.</p>
                  <span className="integration-state">{config.anthropicConfigured ? '✅ Configurado no servidor' : '❌ Não configurado'}</span>
                </div>
              </div>
              
              <div className="settings-section">
                <Globe size={22} />
                <div>
                  <h2>OpenAI-compatível (Groq, Together, LM Studio...)</h2>
                  <p>Qualquer endpoint compatível com a API OpenAI.</p>
                  <span className="integration-state">{config.openaiConfigured ? '✅ Configurado no servidor' : '❌ Não configurado'}</span>
                </div>
              </div>
              
              <div className="settings-section">
                <ShieldCheck size={22} />
                <div>
                  <h2>{config.user ? 'Sua conta está conectada' : 'Histórico e conta'}</h2>
                  <p>{config.user ? `Conectado como ${config.user.email}. O histórico desta conta é separado dos dados locais.` : 'Sem conta, os últimos 50 registros ficam apenas neste navegador.'}</p>
                  {config.supabaseConfigured ? config.user ? (
                    <button className="secondary-button" onClick={async () => { 
                      try { await saveQueue.current.catch(() => {}); await fetch('/api/logout', { method: 'POST' }); location.assign('/'); } 
                      catch { setError('Não foi possível sair.'); } 
                    }}>Sair da conta</button>
                  ) : (
                    <a className="secondary-button" href="/login">Entrar ou criar conta <ArrowRight size={15} /></a>
                  ) : (
                    <span className="integration-state">Supabase não conectado · base local disponível</span>
                  )}
                </div>
              </div>
              
              <button className="text-button" onClick={() => setView('create')}>
                <ArrowRight size={16} /> Voltar à criação
              </button>
            </section>
          )}
          {view === 'history' || view === 'favorites' && (
            <HistoryList
              history={history}
              onReopen={reopen}
              onDelete={remove}
              filter={filter}
              searchQuery={search}
              onSearchChange={setSearch}
              onFilterChange={setFilter}
              currentEngine={currentEngine}
              userAuthenticated={!!config.user}
            />
          )}
        </main>
      </div>
      
      <div className={`toast ${notice ? 'visible' : ''}`} role="status" aria-live="polite">
        {notice && <><Check size={16} />{notice}</>}
      </div>
    </div>
  );
}