import { useEffect, useState } from "react";

type Session = { id: string; label: string; created_at: string; location?: string | null };

type SettingsPageProps = {
  accessToken: string;
  authBaseUrl: string;
  email: string | null;
  theme: "light" | "dark";
  onThemeChange: () => void;
  onSignOut: () => Promise<void>;
};

export function SettingsPage({ accessToken, authBaseUrl, email, theme, onThemeChange, onSignOut }: SettingsPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${authBaseUrl}/v1/sessions`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { data?: Session[]; error?: { message?: string } };
        if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Your sessions are unavailable.");
        setSessions(body.data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Your sessions are unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accessToken, authBaseUrl]);

  async function revokeSession(sessionID: string) {
    setBusy(sessionID);
    setError(null);
    try {
      const response = await fetch(`${authBaseUrl}/v1/sessions/${encodeURIComponent(sessionID)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "We couldn’t revoke that session.");
      setSessions((current) => current.filter((session) => session.id !== sessionID));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t revoke that session.");
    } finally {
      setBusy(null);
    }
  }

  return <section className="settings-page">
    <header className="settings-heading"><p className="eyebrow">Your account</p><h1>Settings</h1><p>{email ?? "Manage your account and signed-in devices."}</p></header>
    <section className="settings-section"><div><h2>Appearance</h2><p>Choose the theme you prefer.</p></div><button className="settings-toggle" aria-pressed={theme === "dark"} onClick={onThemeChange} type="button"><span>{theme === "dark" ? "Dark" : "Light"} theme</span><span className="settings-toggle__switch"/></button></section>
    <section className="settings-section settings-sessions"><div><h2>Signed-in devices</h2><p>Revoke devices you no longer use. A short-lived access token may remain valid until it expires.</p></div>
      {loading ? <p className="settings-note" role="status">Loading sessions…</p> : error ? <p className="profile-onboarding__error" role="alert">{error}</p> : sessions.length === 0 ? <p className="settings-note">No active sessions were returned by csag.</p> : <ul className="session-list">{sessions.map((session) => <li key={session.id}><span className="session-list__device" aria-hidden="true">{session.label?.slice(0, 1) || "D"}</span><span className="session-list__details"><strong>{session.label || "Signed-in device"}</strong><small>{session.location || "Location unavailable"} · {new Date(session.created_at).toLocaleDateString()}</small></span><button className="session-revoke" disabled={busy !== null} onClick={() => void revokeSession(session.id)} type="button">{busy === session.id ? "Revoking…" : "Revoke"}</button></li>)}</ul>}
    </section>
    <section className="settings-section settings-signout"><div><h2>Sign out everywhere</h2><p>Revoke every active refresh session on your account.</p></div><button className="shell-button shell-button--primary" disabled={busy !== null} onClick={() => void onSignOut()} type="button">Sign out everywhere</button></section>
  </section>;
}
