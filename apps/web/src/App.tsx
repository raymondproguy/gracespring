import { APP_NAME } from "@gracespring/shared";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { AuthScreen } from "./AuthScreen";
import { ProfileOnboarding, type Profile } from "./ProfileOnboarding";
import { SettingsPage } from "./SettingsPage";

const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL || "http://127.0.0.1:8080";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8082";

type Screen = "welcome" | "signin" | "signup" | "profile" | "app";
type NavigationItem = { label: string; path: string; icon: string };
type TokenPair = { access_token: string; refresh_token: string };
let refreshInFlight: Promise<TokenPair> | null = null;
const refreshTokenMaxAge = 30 * 24 * 60 * 60 * 1000;

function storedRefreshToken(): string | null {
  try {
    const token = localStorage.getItem("gs-refresh-token");
    const savedAt = Number(localStorage.getItem("gs-refresh-token-saved-at"));
    if (!token || !Number.isFinite(savedAt) || Date.now() - savedAt > refreshTokenMaxAge) {
      localStorage.removeItem("gs-refresh-token");
      localStorage.removeItem("gs-refresh-token-saved-at");
      return null;
    }
    return token;
  } catch { return null; }
}

function storeRefreshToken(token: string): void {
  localStorage.setItem("gs-refresh-token", token);
  localStorage.setItem("gs-refresh-token-saved-at", String(Date.now()));
}

function tokenExpiry(token: string): number | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch { return null; }
}

function refreshSession(authBase: string, currentRefreshToken: string): Promise<TokenPair> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${authBase}/v1/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: currentRefreshToken }),
    }).then(async (response) => {
      const body = (await response.json()) as { data?: Partial<TokenPair> };
      if (!response.ok || !body.data?.access_token || !body.data.refresh_token) throw new Error("Session expired");
      return { access_token: body.data.access_token, refresh_token: body.data.refresh_token };
    });
  }
  const request = refreshInFlight;
  return request.finally(() => { if (refreshInFlight === request) refreshInFlight = null; });
}

const primaryNavigation: NavigationItem[] = [
  { label: "Home", path: "/", icon: "home" },
  { label: "Audio", path: "/audio", icon: "audio" },
  { label: "Devotional", path: "/devotional", icon: "sun" },
  { label: "Events", path: "/events", icon: "calendar" },
  { label: "Prayer", path: "/prayer", icon: "heart" },
  { label: "Growth", path: "/growth", icon: "book" },
  { label: "Community", path: "/community", icon: "people" },
  { label: "Messages", path: "/messages", icon: "message" },
  { label: "Ministries", path: "/ministries", icon: "sparkle" },
];

const utilityNavigation: NavigationItem[] = [
  { label: "Search", path: "/search", icon: "search" },
  { label: "Profile", path: "/profile", icon: "person" },
  { label: "Settings", path: "/settings", icon: "settings" },
];

const mobileNavigation = [primaryNavigation[0], primaryNavigation[1], primaryNavigation[2], primaryNavigation[7], primaryNavigation[6]];

function screenFromPath(path: string): Screen {
  if (path === "/signin") return "signin";
  if (path === "/signup") return "signup";
  if (path === "/onboarding/profile" || path === "/profile") return "profile";
  if (path === "/" && !window.history.state?.signedIn) return "welcome";
  return "app";
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v12h14V9M9 21v-7h6v7"/></>,
    audio: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    book: <><path d="M12 7v14"/><path d="M3 18V4a1 1 0 0 1 1-1h4a4 4 0 0 1 4 4 4 4 0 0 1 4-4h4a1 1 0 0 1 1 1v14h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3Z"/></>,
    people: <><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m2-14a4 4 0 0 1 0 7m4 7v-2a7 7 0 0 0-4-6"/></>,
    message: <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z"/>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    person: <><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.4.8l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.4-.8l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.7l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.4-.8l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.4.8l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.6Z"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0"/></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>,
    sunTheme: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.1-7.1-1.4 1.4M6.3 17.7l-1.4 1.4m14.2 0-1.4-1.4M6.3 6.3 4.9 4.9"/></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
  };
  return <svg aria-hidden="true" className="shell-icon" viewBox="0 0 24 24">{paths[name] ?? paths.sparkle}</svg>;
}

function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <><h1 className="home-greeting">{greeting}, {name}</h1><p className="home-subtitle">Here’s what’s happening at GraceSpring.</p></>;
}

function HomeContent({ profile, loading, error, onRetry, onNavigate }: {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: (path: string) => void;
}) {
  if (loading) return <div className="home-loading" aria-busy="true"><div className="home-loading__hero"/><div className="home-loading__row"/><div className="home-loading__row"/><p role="status">Loading your home…</p></div>;
  if (error) return <section className="home-empty home-error" role="alert"><h2>We couldn’t load your home</h2><p>{error}</p><button className="shell-button shell-button--primary" onClick={onRetry} type="button">Try again</button></section>;
  return <>
    <section className="home-welcome"><p className="eyebrow">GraceSpring Family Church</p><Greeting name={profile?.display_name || "friend"}/></section>
    <section className="home-feature"><div className="home-feature__art" aria-hidden="true"><span>GS</span><i/><i/><i/></div><div className="home-feature__copy"><p className="home-feature__eyebrow">A place to grow together</p><h2>Faith grows when we walk together.</h2><p>Find a moment to worship, learn, and connect with your church family.</p><button className="shell-button shell-button--light" onClick={() => onNavigate("/devotional")} type="button">Explore devotionals <span aria-hidden="true">→</span></button></div></section>
    <nav className="home-shortcuts" aria-label="Quick links">
      {[primaryNavigation[1], primaryNavigation[4], primaryNavigation[2], primaryNavigation[8]].map((item) => <button className="shortcut" key={item.label} onClick={() => onNavigate(item.path)} type="button"><span className="shortcut__icon"><Icon name={item.icon}/></span><span>{item.label === "Audio" ? "Sermons" : item.label}</span></button>)}
    </nav>
    <section className="home-section"><div className="home-section__heading"><h2>Continue listening</h2><button onClick={() => onNavigate("/audio")} type="button">All sermons</button></div><div className="home-empty"><span className="home-empty__icon"><Icon name="audio"/></span><p>Your recently played sermons will appear here.</p><button className="text-button" onClick={() => onNavigate("/audio")} type="button">Browse audio</button></div></section>
    <section className="home-section"><div className="home-section__heading"><h2>Today’s devotional</h2><button onClick={() => onNavigate("/devotional")} type="button">All devotionals</button></div><div className="home-empty"><span className="home-empty__icon"><Icon name="sun"/></span><p>Devotionals will appear here when they’re ready.</p><button className="text-button" onClick={() => onNavigate("/devotional")} type="button">Explore devotionals</button></div></section>
    <section className="home-section"><div className="home-section__heading"><h2>From the community</h2><button onClick={() => onNavigate("/community")} type="button">Visit community</button></div><div className="home-empty"><span className="home-empty__icon"><Icon name="people"/></span><p>Your church community is getting ready.</p><button className="text-button" onClick={() => onNavigate("/community")} type="button">Explore community</button></div></section>
  </>;
}

function PlaceholderPage({ path, onNavigate }: { path: string; onNavigate: (path: string) => void }) {
  const item = [...primaryNavigation, ...utilityNavigation, { label: "Notifications", path: "/notifications", icon: "bell" }, { label: "Church admin", path: "/admin", icon: "settings" }].find((entry) => entry.path === path);
  const title = item?.label ?? "GraceSpring";
  return <section className="route-placeholder"><span className="route-placeholder__icon"><Icon name={item?.icon ?? "sparkle"}/></span><p className="eyebrow">GraceSpring Family Church</p><h1>{title}</h1><p>This space is getting ready. We’ll let you know when there’s something here.</p><button className="shell-button shell-button--primary" onClick={() => onNavigate("/")} type="button">Back to home</button></section>;
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(storedRefreshToken);
  const [authLoading, setAuthLoading] = useState(() => Boolean(storedRefreshToken()));
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileAttempt, setProfileAttempt] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try { return localStorage.getItem("gs-theme") === "dark" ? "dark" : "light"; } catch { return "light"; }
  });
  const screen = screenFromPath(path);
  const activeScreen: Screen = (screen === "profile" || screen === "app") && !accessToken && !authLoading ? "signin" : screen;

  useEffect(() => {
    function handlePopState() {
      setPath(window.location.pathname);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("gs-theme", theme); } catch { /* Theme still applies for this session. */ }
  }, [theme]);

  useEffect(() => {
    const currentRefreshToken = refreshToken ?? "";
    if (currentRefreshToken === "") return;
    let cancelled = false;
    let timer: number | undefined;
    async function rotateToken() {
      try {
        const tokens = await refreshSession(authBaseUrl, currentRefreshToken);
        if (cancelled) return;
        try { storeRefreshToken(tokens.refresh_token); } catch { /* Keep the rotated token in memory. */ }
        setAccessToken(tokens.access_token);
        setRefreshToken(tokens.refresh_token);
      } catch {
        if (cancelled) return;
        try { localStorage.removeItem("gs-refresh-token"); } catch { /* Clear in-memory credentials below. */ }
        try { localStorage.removeItem("gs-refresh-token-saved-at"); } catch { /* Continue clearing the local session. */ }
        setAccessToken(null);
        setRefreshToken(null);
        setProfile(null);
        window.history.replaceState({}, "", "/signin");
        setPath("/signin");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }
    if (!accessToken) {
      void rotateToken();
    } else {
      const expiry = tokenExpiry(accessToken);
      if (expiry) timer = window.setTimeout(() => void rotateToken(), Math.max(1000, expiry - Date.now() - 60_000));
    }
    return () => { cancelled = true; if (timer !== undefined) window.clearTimeout(timer); };
  }, [accessToken, refreshToken]);

  useEffect(() => {
    if (screen !== "app" || !accessToken) return;
    const controller = new AbortController();
    void fetch(`${apiBaseUrl}/v1/me`, { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as { data?: Profile; error?: { message?: string } };
        if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Your profile is unavailable.");
        setProfile(body.data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setProfileError(cause instanceof Error ? cause.message : "Your profile is unavailable.");
      });
    return () => controller.abort();
  }, [accessToken, profileAttempt, screen]);

  function navigate(nextPath: string, replace = false) {
    window.history[replace ? "replaceState" : "pushState"]({ signedIn: Boolean(accessToken) }, "", nextPath);
    setPath(nextPath);
  }

  function handleAuthenticated(token: string, nextRefreshToken: string, isNewAccount: boolean) {
    setAccessToken(token);
    setRefreshToken(nextRefreshToken);
    try { storeRefreshToken(nextRefreshToken); } catch { /* Keep the current session in memory. */ }
    window.history.replaceState({ signedIn: true }, "", isNewAccount ? "/onboarding/profile" : "/");
    setPath(isNewAccount ? "/onboarding/profile" : "/");
  }

  function handleNavigation(event: MouseEvent<HTMLAnchorElement>, destination: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(destination);
  }

  async function signOutEverywhere() {
    try {
      if (accessToken) await fetch(`${authBaseUrl}/v1/logout-all`, { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {
      // The local refresh token is still removed when csag is unavailable.
    } finally {
      try { localStorage.removeItem("gs-refresh-token"); } catch { /* Clear in-memory credentials below. */ }
      try { localStorage.removeItem("gs-refresh-token-saved-at"); } catch { /* Continue clearing the local session. */ }
      setAccessToken(null);
      setRefreshToken(null);
      setProfile(null);
      window.history.replaceState({}, "", "/signin");
      setPath("/signin");
    }
  }

  if (authLoading && !accessToken) return <main className="profile-onboarding" aria-busy="true"><div className="profile-onboarding__skeleton" aria-hidden="true"/><p role="status">Restoring your session…</p></main>;

  if (activeScreen === "signin" || activeScreen === "signup") {
    return (
      <AuthScreen
        authBaseUrl={authBaseUrl}
        mode={activeScreen}
        onAuthenticated={handleAuthenticated}
        onModeChange={(mode) => navigate(`/${mode}`)}
      />
    );
  }

  if (activeScreen === "profile" && accessToken) {
    return (
      <ProfileOnboarding
        accessToken={accessToken}
        apiBaseUrl={apiBaseUrl}
        mode={path === "/profile" ? "edit" : "onboarding"}
        onCancel={() => navigate("/")}
        onComplete={(savedProfile) => {
          setProfile(savedProfile);
          navigate("/");
        }}
      />
    );
  }

  if (activeScreen === "app" && accessToken) {
    const isHome = path === "/" || path === "/home";
    const visibleNavigation = profile?.role === "admin"
      ? [...utilityNavigation, { label: "Church admin", path: "/admin", icon: "settings" }]
      : utilityNavigation;
    return <div className="app-shell">
      <aside className="app-sidebar" aria-label="Main navigation">
        <a className="shell-brand" href="/" onClick={(event) => handleNavigation(event, "/")}><span className="shell-brand__mark">G</span><span><strong>GraceSpring</strong><small>Family Church</small></span></a>
        <nav className="sidebar-navigation" aria-label="Primary">
          {primaryNavigation.map((item) => <a aria-current={path === item.path ? "page" : undefined} href={item.path} key={item.path} onClick={(event) => handleNavigation(event, item.path)}><Icon name={item.icon}/><span>{item.label}</span></a>)}
          <div className="sidebar-navigation__divider"/>
          {visibleNavigation.map((item) => <a aria-current={path === item.path ? "page" : undefined} href={item.path} key={item.path} onClick={(event) => handleNavigation(event, item.path)}><Icon name={item.icon}/><span>{item.label}</span></a>)}
        </nav>
        <button className="shell-signout" onClick={() => void signOutEverywhere()} type="button"><Icon name="logout"/>Sign out everywhere</button>
      </aside>
      <main className="app-main" id="main-content">
        <header className="app-header">
          <a className="shell-brand shell-brand--mobile" href="/" onClick={(event) => handleNavigation(event, "/")}><span className="shell-brand__mark">G</span><strong>GraceSpring</strong></a>
          <div className="app-header__actions">
            <a className="shell-icon-button" href="/search" aria-label="Search" onClick={(event) => handleNavigation(event, "/search")}><Icon name="search"/></a>
            <a className="shell-icon-button" href="/events" aria-label="Events" onClick={(event) => handleNavigation(event, "/events")}><Icon name="calendar"/></a>
            <a className="shell-icon-button" href="/notifications" aria-label="Notifications" onClick={(event) => handleNavigation(event, "/notifications")}><Icon name="bell"/></a>
            <button className="shell-icon-button" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} onClick={() => setTheme(theme === "light" ? "dark" : "light")} type="button"><Icon name={theme === "light" ? "moon" : "sunTheme"}/></button>
            <a className="member-avatar" href="/profile" aria-label="Your profile" onClick={(event) => handleNavigation(event, "/profile")}>{profile?.avatar_url ? <img src={profile.avatar_url} alt=""/> : (profile?.display_name?.[0] ?? "G").toUpperCase()}</a>
          </div>
        </header>
        <div className="app-page">
          {isHome
            ? <HomeContent profile={profile} loading={!profile && !profileError} error={profileError} onRetry={() => { setProfileError(null); setProfileAttempt((attempt) => attempt + 1); }} onNavigate={navigate}/>
            : path === "/settings"
              ? <SettingsPage accessToken={accessToken} authBaseUrl={authBaseUrl} email={profile?.email ?? null} theme={theme} onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")} onSignOut={signOutEverywhere}/>
              : <PlaceholderPage path={path} onNavigate={navigate}/>}
          <footer className="app-footer">{APP_NAME}</footer>
        </div>
      </main>
      <nav className="mobile-tabbar" aria-label="Main navigation">
        {mobileNavigation.map((item) => <a aria-current={path === item.path ? "page" : undefined} href={item.path} key={item.path} onClick={(event) => handleNavigation(event, item.path)}><Icon name={item.icon}/><span>{item.label === "Messages" ? "Chats" : item.label}</span></a>)}
      </nav>
    </div>;
  }

  return (
    <main className="welcome-screen">
      <p className="eyebrow">GraceSpring Family Church</p>
      <h1>{APP_NAME}</h1>
      <p>Grow in faith and stay connected with your church family.</p>
      <div className="welcome-screen__actions">
        <button className="profile-onboarding__button" onClick={() => navigate("/signup")} type="button">
          Create account
        </button>
        <button className="welcome-screen__signin" onClick={() => navigate("/signin")} type="button">
          Sign in
        </button>
      </div>
    </main>
  );
}
