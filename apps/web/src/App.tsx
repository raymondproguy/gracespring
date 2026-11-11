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

function Icon({ name, className = "shell-icon" }: { name: string; className?: string }) {
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
    add: <><path d="M12 5v14M5 12h14"/></>,
    photo: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></>,
    microphone: <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4m0-11-6.8 4"/></>,
    play: <path d="m7 4 14 8-14 8z"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    verse: <><path d="m14.5 21.7 6.5-19a.5.5 0 0 0-.6-.6l-19 6.5a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1l3.2 7.9a.5.5 0 0 0 .9 0Z"/><path d="m21 3-11 11"/></>,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24">{paths[name] ?? paths.sparkle}</svg>;
}

function HomeContent({ profile, loading, error, onRetry, onNavigate, onNotifications }: {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onNavigate: (path: string) => void;
  onNotifications: () => void;
}) {
  const go = (path: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(path);
  };
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] || "friend";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <>
    <header className="appbar">
      <a className="brand brand-mobile" href="/" onClick={go("/")}><img src="/assets/img/mark.png" alt=""/><span><b>GraceSpring</b></span></a>
      <span className="spacer"/>
      <a className="icon-btn" href="/search" onClick={go("/search")} aria-label="Search"><Icon name="search" className="i"/></a>
      <a className="icon-btn" href="/events" onClick={go("/events")} aria-label="Events"><Icon name="calendar" className="i"/></a>
      <button className="icon-btn" type="button" onClick={onNotifications} aria-label="Notifications"><Icon name="bell" className="i"/><span className="dot"/></button>
      <a className="icon-btn" href="/profile" onClick={go("/profile")} aria-label="Your profile">{profile?.avatar_url ? <img className="av av-sm" src={profile.avatar_url} alt=""/> : <span className="av av-sm">{firstName.slice(0,1).toUpperCase()}</span>}</a>
    </header>
    <div className="col">
      <section className="greet"><h1>{greeting}, {firstName}</h1><p>Here's what's happening at GraceSpring.</p>{loading && <span className="sr-only" role="status">Loading your profile…</span>}{error && <p className="home-profile-error" role="alert">Your profile could not be loaded. <button type="button" onClick={onRetry}>Try again</button></p>}</section>
      <a className="feature" href="/events" onClick={go("/events")}>
        <img src="/assets/img/worship.jpg" alt=""/>
        <div className="in"><p className="when-label">Next gathering, Nov 1 at 9:00 AM</p><h2>Sunday Service</h2><p className="where">Main Auditorium</p><span className="go">View details <Icon name="chevron" className="i i-sm"/></span></div>
      </a>
      <nav className="quick" aria-label="Shortcuts">
        {[{label:"Sermons",path:"/audio",icon:"audio"},{label:"Prayer",path:"/prayer",icon:"heart"},{label:"Devotional",path:"/devotional",icon:"sun"},{label:"Ministries",path:"/ministries",icon:"people"}].map((item)=><a href={item.path} key={item.label} onClick={go(item.path)}><span className="ico"><Icon name={item.icon} className="i"/></span>{item.label}</a>)}
      </nav>
      <section className="section" aria-labelledby="resume-heading"><div className="section-head"><h2 id="resume-heading">Continue listening</h2><a href="/audio" onClick={go("/audio")}>All sermons</a></div><div className="resume"><a href="/audio" onClick={go("/audio")}><img className="thumb" src="/assets/img/avatars/james.jpg" alt=""/></a><a className="item-body" href="/audio" onClick={go("/audio")}><span className="item-title">Faith in the Waiting</span><span className="item-sub">Pastor James, 28 min left</span><span className="meter"><i/></span></a><a className="play-btn" href="/audio" onClick={go("/audio")} aria-label="Resume playing"><Icon name="play" className="i i-fill"/></a></div></section>
      <section className="section" aria-labelledby="today-heading"><div className="section-head"><h2 id="today-heading">Today's devotional</h2><a href="/devotional" onClick={go("/devotional")}>All devotionals</a></div><a className="today" href="/devotional" onClick={go("/devotional")}><img src="/assets/img/journal.jpg" alt=""/><span className="item-body"><span className="item-sub">Supernatural Health, Episode 2</span><span className="today-title">Faith is your evidence</span><span className="item-sub clamp-2">Your body is real. But sickness is not the only reality you should be conscious of.</span></span></a></section>
      <section className="section"><ul className="list"><li><a className="item" href="/cards/new" onClick={go("/cards/new")}><span className="ico"><Icon name="verse" className="i"/></span><span className="item-body"><span className="item-title">Send a verse</span><span className="item-sub">Encourage someone with a Scripture card.</span></span><Icon name="chevron" className="i muted"/></a></li></ul></section>
      <section className="section" aria-labelledby="feed-heading"><div className="section-head"><h2 id="feed-heading">From the community</h2></div>
        <div className="composer"><span className="av">{firstName.slice(0,1).toUpperCase()}</span><a className="fake" href="/community/new" onClick={go("/community/new")}>What's on your heart today?</a><a className="icon-btn" href="/community/new" onClick={go("/community/new")} aria-label="Add a photo"><Icon name="photo" className="i"/></a><a className="icon-btn" href="/community/new" onClick={go("/community/new")} aria-label="Add a voice note"><Icon name="microphone" className="i"/></a></div>
        <article className="post"><div className="post-head"><img className="av" src="/assets/img/avatars/sarah.jpg" alt=""/><div className="who"><b>Sarah Okafor</b><small>2h ago, Youth Ministry</small></div><button className="icon-btn" type="button" aria-label="More options"><Icon name="more" className="i"/></button></div><p className="post-body">God is faithful! Grateful for His unfailing love and the opportunity to serve in this church. <span className="tag">#Grateful</span> <span className="tag">#GodIsGood</span></p><div className="post-photos"><img src="/assets/img/worship.jpg" alt="Worship at GraceSpring"/><img src="/assets/img/congregation.jpg" alt="GraceSpring congregation"/></div><div className="post-actions"><button className="act" type="button" aria-label="Like"><Icon name="heart" className="i"/><span>124</span></button><button className="act" type="button" aria-label="Comments"><Icon name="message" className="i"/><span>8</span></button><button className="act end" type="button" aria-label="Share"><Icon name="share" className="i"/></button></div></article>
        <article className="post"><div className="post-head"><span className="av" aria-hidden="true">DE</span><div className="who"><b>Daniel Eze</b><small>4h ago, Media Ministry</small></div><button className="icon-btn" type="button" aria-label="More options"><Icon name="more" className="i"/></button></div><p className="post-body">Great worship today! The presence of God was so real. Still carrying that song into the week.</p><div className="post-actions"><button className="act" type="button" aria-label="Like"><Icon name="heart" className="i"/><span>86</span></button><button className="act" type="button" aria-label="Comments"><Icon name="message" className="i"/><span>5</span></button><button className="act end" type="button" aria-label="Share"><Icon name="share" className="i"/></button></div></article>
      </section>
      <button className="fab" type="button" aria-label="Create a post" onClick={() => onNavigate("/community/new")}><Icon name="add" className="i"/></button>
    </div>
    <aside className="rail" aria-label="Highlights">
      <section><div className="section-head"><h3>Upcoming events</h3><a href="/events" onClick={go("/events")}>See all</a></div><ul className="list">{[{month:"Nov",day:"1",name:"Sunday Service",meta:"Main Auditorium, 9:00 AM"},{month:"Nov",day:"5",name:"Bible Study",meta:"Youth Hall, 6:00 PM"},{month:"Nov",day:"8",name:"Church Anniversary",meta:"Main Auditorium, 10:00 AM"},{month:"Nov",day:"15",name:"Prayer Night",meta:"Prayer Room, 7:00 PM"}].map((event)=><li key={event.name}><a className="item" href="/events" onClick={go("/events")}><span className="date-col"><small>{event.month}</small><b>{event.day}</b></span><span className="item-body"><span className="item-title">{event.name}</span><span className="item-sub">{event.meta}</span></span></a></li>)}</ul></section>
      <section><div className="section-head"><h3>People to follow</h3></div><ul className="list">{[{initials:"EU",name:"Esther Udo",ministry:"Youth Ministry"},{initials:"ED",name:"Emmanuel David",ministry:"Media Ministry"},{initials:"RA",name:"Ruth Adeyemi",ministry:"Choir Ministry"}].map((person)=><li className="item" key={person.name}><span className="av av-sm">{person.initials}</span><span className="item-body"><span className="item-title">{person.name}</span><span className="item-sub">{person.ministry}</span></span><button className="btn btn-sm btn-outline" type="button">Follow</button></li>)}</ul></section>
    </aside>
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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
    return <div className="shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="/" onClick={(event) => handleNavigation(event, "/")}><img src="/assets/img/mark.png" alt=""/><span><b>GraceSpring</b><small>Family Church</small></span></a>
        <nav className="side-nav" aria-label="Primary">
          {primaryNavigation.map((item) => <a aria-current={path === item.path ? "page" : undefined} href={item.path} key={item.path} onClick={(event) => handleNavigation(event, item.path)}><Icon name={item.icon} className="i"/><span>{item.label}</span></a>)}
          <hr/>
          {visibleNavigation.map((item) => <a aria-current={path === item.path ? "page" : undefined} href={item.path} key={item.path} onClick={(event) => handleNavigation(event, item.path)}><Icon name={item.icon} className="i"/><span>{item.label}</span></a>)}
        </nav>
        <div className="side-cta"><a className="btn btn-block" href="/community/new" onClick={(event) => handleNavigation(event, "/community/new")}><Icon name="add" className="i i-sm"/>New post</a></div>
      </aside>
      <main className="main" id="main">
        <div className={isHome ? "page has-rail" : "page"}>
          {isHome
            ? <HomeContent profile={profile} loading={!profile && !profileError} error={profileError} onRetry={() => { setProfileError(null); setProfileAttempt((attempt) => attempt + 1); }} onNavigate={navigate} onNotifications={() => setNotificationsOpen(true)}/>
            : <>
              <header className="appbar"><a className="brand brand-mobile" href="/" onClick={(event) => handleNavigation(event, "/")}><img src="/assets/img/mark.png" alt=""/><span><b>GraceSpring</b></span></a><span className="spacer"/><a className="icon-btn" href="/search" onClick={(event) => handleNavigation(event, "/search")} aria-label="Search"><Icon name="search" className="i"/></a><a className="icon-btn" href="/events" onClick={(event) => handleNavigation(event, "/events")} aria-label="Events"><Icon name="calendar" className="i"/></a><button className="icon-btn" type="button" onClick={() => setNotificationsOpen(true)} aria-label="Notifications"><Icon name="bell" className="i"/></button><a className="icon-btn" href="/profile" onClick={(event) => handleNavigation(event, "/profile")} aria-label="Your profile">{profile?.avatar_url ? <img className="av av-sm" src={profile.avatar_url} alt=""/> : <span className="av av-sm">{profile?.display_name?.slice(0,1).toUpperCase() ?? "G"}</span>}</a></header>
              <div className="col">{path === "/settings" ? <SettingsPage accessToken={accessToken} authBaseUrl={authBaseUrl} email={profile?.email ?? null} theme={theme} onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")} onSignOut={signOutEverywhere}/> : <PlaceholderPage path={path} onNavigate={navigate}/>}</div>
            </>}
        </div>
      </main>
      <nav className="tabbar" aria-label="Main navigation">
        {mobileNavigation.map((item) => <a aria-current={path === item.path ? "page" : undefined} href={item.path} key={item.path} onClick={(event) => handleNavigation(event, item.path)}><Icon name={item.icon} className="i"/><span>{item.label === "Messages" ? "Chats" : item.label}</span></a>)}
      </nav>
      <div className={`backdrop${notificationsOpen ? " is-open" : ""}`} aria-hidden={!notificationsOpen} role="dialog" aria-modal="true" aria-label="Notifications" onClick={(event) => { if (event.target === event.currentTarget) setNotificationsOpen(false); }}>
        <div className="sheet"><h2>Notifications</h2><p>Your church updates will appear here.</p><div className="btn-row"><button className="btn btn-outline" type="button" onClick={() => setNotificationsOpen(false)}>Close</button></div></div>
      </div>
    </div>;
  }

  return (
    <main className="cover splash">
      <img className="bg" src="/assets/img/church.jpg" alt="GraceSpring church community" />
      <div className="splash-top">
        <div className="logo-badge"><img src="/assets/img/mark.png" alt="GraceSpring emblem" /></div>
        <h1 className="wordmark">GraceSpring<small>Family Church</small></h1>
        <p className="tagline">Connect. Grow. Serve.</p>
        <p className="splash-copy">A church community where faith, family and purpose meet.</p>
      </div>
      <div className="splash-bottom">
        <a className="btn btn-white btn-block" href="/signup" onClick={(event) => handleNavigation(event, "/signup")}>Get started</a>
        <p>Already have an account? <a href="/signin" onClick={(event) => handleNavigation(event, "/signin")}>Sign in</a></p>
      </div>
    </main>
  );
}
