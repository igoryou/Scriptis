'use client';

import { useState, type ChangeEvent } from 'react';
import { Sparkles, Cpu, Zap, Globe, Check, ChevronDown, AlertTriangle } from 'lucide-react';
import { type Engine, type UserConfig, ENGINES } from '@/lib/domain';

interface ModelSelectorProps {
  currentEngine: Engine;
  userConfig: UserConfig;
  onChange: (engine: Engine) => void;
  onConfigChange: (config: UserConfig) => void;
  ollamaAvailable?: boolean;
  anthropicConfigured?: boolean;
  openaiConfigured?: boolean;
  disabled?: boolean;
}

const ENGINE_INFO: Record<Engine, { icon: React.ReactNode; label: string; description: string; requiresAuth: boolean }> = {
  local: {
    icon: <Sparkles size={18} />,
    label: 'Local (gratuito)',
    description: 'Regras determinísticas, offline, sem custo. Variedade limitada mas confiável.',
    requiresAuth: false,
  },
  llama: {
    icon: <Cpu size={18} />,
    label: 'Llama (Ollama local)',
    description: 'Modelo local via Ollama. Privado, gratuito, requer ollama serve rodando.',
    requiresAuth: false,
  },
  anthropic: {
    icon: <Zap size={18} />,
    label: 'Claude (Anthropic)',
    description: 'API paga, nuvem. Alta qualidade. Requer conta autenticada e chave no servidor.',
    requiresAuth: true,
  },
  openai_compatible: {
    icon: <Globe size={18} />,
    label: 'OpenAI-compatível',
    description: 'Groq, Together, LM Studio, vLLM, etc. Requer endpoint e chave no servidor.',
    requiresAuth: true,
  },
};

export function ModelSelector({
  currentEngine,
  userConfig,
  onChange,
  onConfigChange,
  ollamaAvailable = false,
  anthropicConfigured = false,
  openaiConfigured = false,
  disabled = false,
}: ModelSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [showConfig, setShowConfig] = useState<Engine | null>(null);
  const [localConfig, setLocalConfig] = useState({
    llamaEndpoint: userConfig.llamaEndpoint,
    llamaModel: userConfig.llamaModel,
    openaiEndpoint: userConfig.openaiEndpoint,
    openaiModel: userConfig.openaiModel,
  });

  const isAvailable = (engine: Engine) => {
    switch (engine) {
      case 'local':
        return true;
      case 'llama':
        return ollamaAvailable;
      case 'anthropic':
        return anthropicConfigured;
      case 'openai_compatible':
        return openaiConfigured;
      default:
        return false;
    }
  };

  const handleEngineClick = (engine: Engine) => {
    if (disabled) return;
    if (!isAvailable(engine) && engine !== currentEngine) {
      setShowConfig(engine);
      return;
    }
    onChange(engine);
    setExpanded(false);
  };

  const handleConfigSave = (engine: Engine) => {
    if (engine === 'llama') {
      onConfigChange({ ...userConfig, llamaEndpoint: localConfig.llamaEndpoint, llamaModel: localConfig.llamaModel });
    } else if (engine === 'openai_compatible') {
      onConfigChange({ ...userConfig, openaiEndpoint: localConfig.openaiEndpoint, openaiModel: localConfig.openaiModel });
    }
    setShowConfig(null);
  };

  const renderEngineOption = (engine: Engine) => {
    const info = ENGINE_INFO[engine];
    const available = isAvailable(engine);
    const selected = engine === currentEngine;

    return (
      <button
        key={engine}
        role="option"
        aria-selected={selected}
        className={`engine-option ${selected ? 'selected' : ''} ${!available && engine !== currentEngine ? 'unavailable' : ''}`}
        onClick={() => handleEngineClick(engine)}
        disabled={disabled}
        title={!available ? 'Clique para configurar' : undefined}
      >
        <div className="engine-icon">{info.icon}</div>
        <div className="engine-details">
          <span className="engine-label">{info.label}</span>
          <span className="engine-description">{info.description}</span>
        </div>
        {selected && <Check size={16} className="engine-check" />}
        {!available && engine !== currentEngine && (
          <AlertTriangle size={14} className="engine-warning" />
        )}
      </button>
    );
  };

  const renderConfigPanel = (engine: Engine) => {
    if (engine === 'llama') {
      return (
        <div className="config-panel">
          <h4>Configurar Llama (Ollama)</h4>
          <p className="config-hint">Certifique-se de ter o Ollama rodando: <code>ollama serve</code></p>
          <div className="config-field">
            <label htmlFor="llama-endpoint">Endpoint</label>
            <input
              id="llama-endpoint"
              type="url"
              value={localConfig.llamaEndpoint}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({ ...prev, llamaEndpoint: e.target.value }))}
              placeholder="http://localhost:11434"
            />
          </div>
          <div className="config-field">
            <label htmlFor="llama-model">Modelo</label>
            <input
              id="llama-model"
              type="text"
              value={localConfig.llamaModel}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({ ...prev, llamaModel: e.target.value }))}
              placeholder="llama3.1:8b"
            />
          </div>
          <div className="config-actions">
            <button className="secondary-button" onClick={() => setShowConfig(null)}>Cancelar</button>
            <button className="primary-button" onClick={() => handleConfigSave('llama')}>Salvar e usar</button>
          </div>
          <button className="test-connection" onClick={async () => {
            const res = await fetch(`${localConfig.llamaEndpoint}/api/tags`).catch(() => null);
            alert(res?.ok ? '✅ Ollama conectado!' : '❌ Não foi possível conectar. Verifique se está rodando.');
          }}>
            Testar conexão
          </button>
        </div>
      );
    }
    if (engine === 'openai_compatible') {
      return (
        <div className="config-panel">
          <h4>Configurar OpenAI-compatível</h4>
          <p className="config-hint">Suporta: Groq, Together AI, LM Studio, vLLM, OpenRouter, etc.</p>
          <div className="config-field">
            <label htmlFor="openai-endpoint">Endpoint</label>
            <input
              id="openai-endpoint"
              type="url"
              value={localConfig.openaiEndpoint}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({ ...prev, openaiEndpoint: e.target.value }))}
              placeholder="https://api.groq.com/openai/v1"
            />
          </div>
          <div className="config-field">
            <label htmlFor="openai-model">Modelo</label>
            <input
              id="openai-model"
              type="text"
              value={localConfig.openaiModel}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalConfig(prev => ({ ...prev, openaiModel: e.target.value }))}
              placeholder="llama-3.1-70b-versatile"
            />
          </div>
          <div className="config-field">
            <label htmlFor="openai-key-state">API Key (configurada no servidor)</label>
            <input id="openai-key-state" type="password" disabled placeholder="Configure via variável de ambiente no servidor" />
          </div>
          <div className="config-actions">
            <button className="secondary-button" onClick={() => setShowConfig(null)}>Cancelar</button>
            <button className="primary-button" onClick={() => handleConfigSave('openai_compatible')}>Salvar e usar</button>
          </div>
        </div>
      );
    }
    if (engine === 'anthropic') {
      return (
        <div className="config-panel">
          <h4>Claude (Anthropic)</h4>
          <p className="config-hint">Requer configuração no servidor (ANTHROPIC_API_KEY, ANTHROPIC_MODEL) e conta autenticada.</p>
          <div className="config-field">
            <label htmlFor="anthropic-model-state">Modelo (configurado no servidor)</label>
            <input id="anthropic-model-state" type="text" disabled placeholder="claude-3-5-sonnet-20241022" />
          </div>
          <div className="config-actions">
            <button className="secondary-button" onClick={() => setShowConfig(null)}>Fechar</button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="model-selector">
      <div className="selector-header">
        <span className="selector-label">Motor de geração</span>
        <button
          className={`selector-trigger ${expanded ? 'open' : ''}`}
          onClick={() => setExpanded(!expanded)}
          disabled={disabled}
          aria-expanded={expanded}
          aria-haspopup="listbox"
        >
          <span className="selected-engine">
            {ENGINE_INFO[currentEngine].icon}
            <span>{ENGINE_INFO[currentEngine].label}</span>
          </span>
          <ChevronDown size={16} />
        </button>
      </div>

      {showConfig && renderConfigPanel(showConfig)}

      <div className={`engine-list ${expanded && !showConfig ? 'open' : ''}`} role="listbox" aria-label="Escolha o motor de geração">
        {ENGINES.map(renderEngineOption)}
      </div>

      <div className="selector-footer">
        <span className="free-badge">
          <Sparkles size={12} /> O motor local é sempre gratuito e funciona offline
        </span>
      </div>
    </div>
  );
}