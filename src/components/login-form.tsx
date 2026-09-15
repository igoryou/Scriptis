"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
export default function LoginForm({
  enabled,
  invalidLink,
}: {
  enabled: boolean;
  invalidLink: boolean;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");
  const [error, setError] = useState(
    invalidLink
      ? "Esse link não pôde ser validado. Solicite um novo no mesmo navegador."
      : "",
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        signal: AbortSignal.timeout(14000),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível enviar o link.");
      setSent(result.message);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível conectar. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-main">
      <h2>
        {enabled
          ? "Seu espaço, de onde estiver."
          : "Comece sem nenhuma barreira."}
      </h2>
      <p>
        {enabled
          ? "Entre ou crie uma conta com um link enviado para o seu e-mail. Sem precisar de mais uma senha."
          : "A base gratuita compõe textos sem IA. Uma conta permite sincronizar o histórico; Claude é opcional e depende de configuração no servidor."}
      </p>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {enabled ? (
        sent ? (
          <div role="status">
            <Mail size={26} />
            <p className="login-note">{sent}</p>
            <button className="secondary-button" onClick={() => setSent("")}>
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Seu e-mail</label>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button disabled={busy} className="primary-button" type="submit">
              <Mail size={17} />
              {busy ? "Enviando link…" : "Receber link de acesso"}
              <ArrowRight size={16} />
            </button>
            <p className="login-note">
              Ao solicitar o link, você autoriza o uso deste e-mail para criar
              ou acessar sua conta. Seus contatos locais não serão importados
              automaticamente.
            </p>
          </form>
        )
      ) : (
        <div className="integration-state">
          <ShieldCheck size={18} />
          <p>Supabase ainda não conectado.</p>
          <p className="login-note">
            Você pode gerar, editar e salvar sem cadastro. O histórico fica só
            neste navegador e é apagado ao limpar os dados do site.
          </p>
        </div>
      )}
      <Link
        className={enabled ? "text-button" : "primary-button login-continue"}
        href="/"
      >
        Continuar sem conta
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
