'use client';

import { useRef, useEffect, useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Code2, Sparkles } from 'lucide-react';
import { type PromptVersion } from '@/lib/domain';

interface PromptDisplayProps {
  promptVersions: PromptVersion[];
  engine: string;
  model?: string;
  onCopy: (text: string, label: string) => void;
}

export function PromptDisplay({ promptVersions, engine, model, onCopy }: PromptDisplayProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(0);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = 0;
    }
  }, [selectedVersion]);

  const currentPrompt = promptVersions[selectedVersion];

  return (
    <details className="prompt-section" open={expanded}>
      <summary className="prompt-summary" onClick={() => setExpanded(!expanded)}>
        <div className="prompt-summary-left">
          <span className="prompt-icon"><Code2 size={19} /></span>
          <div className="prompt-summary-text">
            <strong>O prompt por trás</strong>
            <small>Não te damos só o texto. Te mostramos o caminho.</small>
          </div>
        </div>
        <div className="prompt-summary-right">
          <select
            className="version-select"
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(Number(e.target.value))}
            aria-label="Versão do prompt"
          >
            {promptVersions.map((pv, i) => (
              <option key={pv.version} value={i}>
                v{pv.version} {i === 0 ? '(completo)' : i === 1 ? '(conciso)' : '(chain-of-thought)'}
              </option>
            ))}
          </select>
          <span className="engine-badge">
            {engine === 'local' && <Sparkles size={12} />} {engine === 'local' ? 'Motor local' : engine === 'llama' ? `Llama (${model})` : engine === 'anthropic' ? `Claude (${model})` : `OpenAI (${model})`}
          </span>
          <ChevronDown size={17} className={`details-arrow ${expanded ? 'open' : ''}`} />
        </div>
      </summary>
      <div className="prompt-content">
        <p className="prompt-hint">
          Troque <code>{'{{nome}'}</code> e <code>{'{{nicho}'}</code>, revise o gancho e leve este prompt para a IA que preferir.
        </p>
        <div className="prompt-pre-wrapper">
          <pre ref={preRef} data-testid="reusable-prompt" className="prompt-pre">
            {currentPrompt.fullPrompt}
          </pre>
          <button
            className="copy-button corner-copy"
            onClick={() => onCopy(currentPrompt.fullPrompt, 'Prompt reutilizável copiado.')}
            aria-label="Copiar prompt completo"
          >
            <Copy size={14} />
          </button>
        </div>
        <div className="prompt-meta">
          <button
            className="secondary-button copy-prompt-button"
            onClick={() => onCopy(currentPrompt.fullPrompt, 'Prompt reutilizável copiado.')}
          >
            <Copy size={15} /> Copiar prompt v{currentPrompt.version}
          </button>
          <span className="prompt-honesty">
            {engine === 'local'
              ? 'O motor gratuito usa regras locais. Este prompt reproduz essas orientações em uma IA; não houve chamada de IA.'
              : engine === 'llama'
              ? `Gerado com Llama (${model}) local via Ollama. Prompt usado na geração.`
              : engine === 'anthropic'
              ? `Gerado com Claude (${model}) via Anthropic API. Prompt usado na geração.`
              : `Gerado via endpoint OpenAI-compatível (${model}). Prompt usado na geração.`}
          </span>
        </div>
      </div>
    </details>
  );
}