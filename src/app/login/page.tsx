'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Mail, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Brand } from '@/components/brand';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    if (urlError) { 
      setError(decodeURIComponent(urlError)); 
      window.history.replaceState({}, '', '/login'); 
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(''); setMessage('');
    if (!email || !email.includes('@')) { setError('Informe um e-mail válido.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível enviar o link.');
      setMessage(data.message || 'Verifique seu e-mail e clique no link de acesso.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro inesperado.'); }
    finally { setBusy(false); }
  }

  if (!mounted) {
    return (
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand"><Brand /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand"><Brand /></div>
        <h1>Entre no seu espaço<span>.</span></h1>
        <p>Sem senha. Um link mágico chega no seu e-mail.</p>
        {message && <div className="login-message"><Mail size={16} />{message}</div>}
        {error && <div className="login-error" role="alert">{error}</div>}
        <form onSubmit={submit}>
          <label htmlFor="email">E-mail</label>
          <div className="input-wrap">
            <Mail size={18} />
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="seu@email.com" value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
          </div>
          <button type="submit" className="primary-button" disabled={busy}>
            <Loader2 size={18} className={busy ? 'spin' : ''} />
            {busy ? 'Enviando…' : 'Enviar link mágico'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="login-note">Ao entrar, você aceita nossos <a href="/termos">Termos</a> e <a href="/privacidade">Privacidade</a>.</p>
        <Link href="/" className="back-link"><ArrowRight size={15} />Voltar ao gerador gratuito</Link>
      </div>
    </div>
  );
}