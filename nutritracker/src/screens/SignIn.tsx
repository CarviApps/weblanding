import { useState } from "react";
import { Field } from "../components/ui";
import { useStore } from "../state/store";
import { markSkipped } from "../lib/sync";

const MESSAGES: Record<string, string> = {
  wrong: "Contraseña incorrecta.",
  unconfigured: "La sincronización todavía no está configurada en el servidor.",
  error: "No pude conectarme. Revisá tu conexión y probá de nuevo.",
};

export default function SignIn({ onDone }: { onDone: () => void }) {
  const { signIn } = useStore();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password || busy) return;
    setBusy(true);
    setError("");
    const result = await signIn(password);
    setBusy(false);
    if (result === "ok") {
      onDone();
      return;
    }
    setPassword("");
    setError(MESSAGES[result] ?? MESSAGES.error);
  }

  return (
    <div className="onboard">
      <div className="eyebrow">NutriTracker</div>
      <h1>Entrá con tu contraseña</h1>
      <p className="lead">
        Con la misma contraseña en el celular y en la web vas a ver siempre los mismos datos:
        comidas, entrenos y pesadas quedan sincronizados.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Contraseña">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </Field>

        {error && (
          <p className="muted" style={{ color: "var(--danger)", marginTop: 10 }}>
            {error}
          </p>
        )}

        <button className="btn accent" style={{ marginTop: 18 }} disabled={busy || !password}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <button
        className="btn ghost"
        style={{ marginTop: 8 }}
        onClick={() => {
          markSkipped();
          onDone();
        }}
      >
        Seguir sin sincronizar
      </button>

      <p className="muted" style={{ marginTop: 16 }}>
        Si seguís sin sincronizar, los datos quedan sólo en este dispositivo. Podés entrar
        más tarde desde Perfil.
      </p>
    </div>
  );
}
