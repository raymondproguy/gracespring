import { APP_NAME } from "@gracespring/shared";
import { useEffect, useState } from "react";
import { AuthScreen } from "./AuthScreen";
import { ProfileOnboarding, type Profile } from "./ProfileOnboarding";

type Screen = "welcome" | "signin" | "signup" | "profile" | "home";

const authBaseUrl = import.meta.env.VITE_AUTH_BASE_URL || "http://127.0.0.1:8080";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8082";

function screenFromPath(path: string): Screen {
  if (path === "/signin") return "signin";
  if (path === "/signup") return "signup";
  if (path === "/onboarding/profile") return "profile";
  if (path === "/home") return "home";
  return "welcome";
}

export function App() {
  const [screen, setScreen] = useState<Screen>(() => screenFromPath(window.location.pathname));
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const activeScreen = (screen === "profile" || screen === "home") && !accessToken ? "signin" : screen;

  useEffect(() => {
    function handlePopState() {
      setScreen(screenFromPath(window.location.pathname));
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (activeScreen !== screen) {
      window.history.replaceState({}, "", "/signin");
    }
  }, [activeScreen, screen]);

  function navigate(next: Screen, replace = false) {
    const paths: Record<Screen, string> = {
      welcome: "/",
      signin: "/signin",
      signup: "/signup",
      profile: "/onboarding/profile",
      home: "/home",
    };
    window.history[replace ? "replaceState" : "pushState"]({}, "", paths[next]);
    setScreen(next);
  }

  function handleAuthenticated(token: string, isNewAccount: boolean) {
    setAccessToken(token);
    navigate(isNewAccount ? "profile" : "home");
  }

  if (activeScreen === "signin" || activeScreen === "signup") {
    return (
      <AuthScreen
        authBaseUrl={authBaseUrl}
        mode={activeScreen}
        onAuthenticated={handleAuthenticated}
        onModeChange={navigate}
      />
    );
  }

  if (activeScreen === "profile" && accessToken) {
    return (
      <ProfileOnboarding
        accessToken={accessToken}
        apiBaseUrl={apiBaseUrl}
        onComplete={(savedProfile) => {
          setProfile(savedProfile);
          navigate("home");
        }}
      />
    );
  }

  if (activeScreen === "home" && accessToken) {
    return (
      <main className="welcome-screen">
        <p className="eyebrow">Welcome to GraceSpring</p>
        <h1>{profile?.display_name || APP_NAME}</h1>
        <p>Your profile is ready. We’re glad you’re here.</p>
      </main>
    );
  }

  return (
    <main className="welcome-screen">
      <p className="eyebrow">GraceSpring Family Church</p>
      <h1>{APP_NAME}</h1>
      <p>Grow in faith and stay connected with your church family.</p>
      <div className="welcome-screen__actions">
        <button className="profile-onboarding__button" onClick={() => navigate("signup")} type="button">
          Create account
        </button>
        <button className="welcome-screen__signin" onClick={() => navigate("signin")} type="button">
          Sign in
        </button>
      </div>
    </main>
  );
}
