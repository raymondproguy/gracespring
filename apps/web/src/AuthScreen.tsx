import { useState, type FormEvent } from "react";

type AuthScreenProps = {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  onAuthenticated: (accessToken: string, isNewAccount: boolean) => void;
  authBaseUrl: string;
};

type AuthResponse = {
  data?: { access_token?: string };
  error?: { message?: string };
};

export function AuthScreen({ mode, onModeChange, onAuthenticated, authBaseUrl }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === "signup";

  async function request(path: string, body: Record<string, string>) {
    const response = await fetch(`${authBaseUrl}/v1/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as AuthResponse;
    if (!response.ok) {
      throw new Error(result.error?.message ?? "We couldn’t sign you in. Please try again.");
    }
    return result;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isSignup) await request("signup", { email: email.trim(), password });
      const result = await request("login", { email: email.trim(), password });
      const accessToken = result.data?.access_token;
      if (!accessToken) {
        throw new Error("This sign-in needs another verification step that isn’t available here yet.");
      }
      onAuthenticated(accessToken, isSignup);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <p className="eyebrow">GraceSpring Family Church</p>
      <h1>{isSignup ? "Find your place here" : "Welcome back"}</h1>
      <p className="auth-screen__intro">
        {isSignup
          ? "Create an account to grow and stay connected with your church family."
          : "Sign in to continue with your church family."}
      </p>

      <form className="auth-screen__form" onSubmit={submit}>
        <label className="profile-onboarding__field">
          <span>Email</span>
          <input
            autoComplete="email"
            autoCapitalize="none"
            maxLength={254}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="profile-onboarding__field">
          <span>Password</span>
          <input
            autoComplete={isSignup ? "new-password" : "current-password"}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error && <p className="profile-onboarding__error" role="alert">{error}</p>}

        <button className="profile-onboarding__button" disabled={submitting} type="submit">
          {submitting ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="auth-screen__switch">
        {isSignup ? "Already have an account?" : "New to GraceSpring?"}{" "}
        <button
          className="auth-screen__link"
          onClick={() => onModeChange(isSignup ? "signin" : "signup")}
          type="button"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </button>
      </p>
    </main>
  );
}
