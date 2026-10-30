import { useEffect, useRef, useState, type FormEvent } from "react";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  ministry: string | null;
  role: string;
};

type ApiEnvelope<T> = { data: T };
type ApiError = { error?: { message?: string } };

type ProfileOnboardingProps = {
  accessToken: string;
  apiBaseUrl?: string;
  mode?: "onboarding" | "edit";
  onCancel?: () => void;
  onComplete: (profile: Profile) => void;
};

const MAX_AVATAR_SIZE = 10 * 1024 * 1024;

export function ProfileOnboarding({
  accessToken,
  apiBaseUrl = "",
  mode = "onboarding",
  onCancel,
  onComplete,
}: ProfileOnboardingProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [ministry, setMinistry] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarPreviewRef = useRef<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBaseUrl}/v1/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        const body = (await response.json()) as ApiEnvelope<Profile> & ApiError;
        if (!response.ok) {
          throw new Error(body.error?.message ?? "We couldn’t load your profile.");
        }
        setProfile(body.data);
        setDisplayName(body.data.display_name);
        setBio(body.data.bio ?? "");
        setMinistry(body.data.ministry ?? "");
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "We couldn’t load your profile.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadProfile();
    return () => controller.abort();
  }, [accessToken, apiBaseUrl, loadAttempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !displayName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/v1/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim(),
          ministry: ministry.trim(),
        }),
      });
      const body = (await response.json()) as ApiEnvelope<Profile> & ApiError;
      if (!response.ok) {
        throw new Error(body.error?.message ?? "We couldn’t save your profile.");
      }
      let savedProfile = body.data;
      if (avatar) {
        const formData = new FormData();
        formData.set("file", avatar);
        const avatarResponse = await fetch(`${apiBaseUrl}/v1/me/avatar`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        const avatarBody = (await avatarResponse.json()) as ApiEnvelope<Profile> & ApiError;
        if (!avatarResponse.ok) {
          throw new Error(avatarBody.error?.message ?? "Your details saved, but the photo upload failed.");
        }
        savedProfile = avatarBody.data;
      }
      onComplete(savedProfile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn’t save your profile.");
    } finally {
      setSaving(false);
    }
  }

  function chooseAvatar(file: File | undefined) {
    setError(null);
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current);
    avatarPreviewRef.current = null;
    setAvatarPreview(null);
    if (!file) {
      setAvatar(null);
      return;
    }
    if (!(["image/jpeg", "image/png"] as string[]).includes(file.type)) {
      setError("Choose a JPEG or PNG photo.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError("Choose a photo that is 10 MB or smaller.");
      return;
    }
    const previewURL = URL.createObjectURL(file);
    avatarPreviewRef.current = previewURL;
    setAvatarPreview(previewURL);
    setAvatar(file);
  }

  if (loading) {
    return (
      <main className="profile-onboarding" aria-busy="true">
        <div className="profile-onboarding__skeleton" aria-hidden="true" />
        <p role="status">Loading your profile…</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="profile-onboarding">
        <p className="eyebrow">{mode === "edit" ? "Your account" : "Your profile"}</p>
        <h1>{mode === "edit" ? "Your profile" : "Let’s get you started"}</h1>
        <p className="profile-onboarding__intro">We couldn’t load your profile right now.</p>
        {error && <p className="profile-onboarding__error" role="alert">{error}</p>}
        <button className="profile-onboarding__button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} type="button">
          Try again
        </button>
      </main>
    );
  }

  return (
    <main className="profile-onboarding">
      <p className="eyebrow">{mode === "edit" ? "Your account" : "One last step"}</p>
      <h1>{mode === "edit" ? "Your profile" : "Make yourself at home"}</h1>
      <p className="profile-onboarding__intro">
        {mode === "edit" ? "Manage the details your church family sees." : "Tell your church family a little about you. You can change these details any time."}
      </p>
      {mode === "edit" && <p className="profile-onboarding__email">Signed in as <strong>{profile.email ?? "Email unavailable"}</strong></p>}
      {mode === "edit" && onCancel && <button className="profile-onboarding__back" onClick={onCancel} type="button">← Back to home</button>}

      <form className="profile-onboarding__form" onSubmit={submit}>
        <label className="profile-onboarding__photo">
          <span className="profile-onboarding__avatar" aria-hidden="true">
            {avatarPreview || profile.avatar_url ? (
              <img src={avatarPreview ?? profile.avatar_url ?? undefined} alt="" />
            ) : (
              <span>{displayName.trim().charAt(0).toUpperCase() || "＋"}</span>
            )}
          </span>
          <span className="profile-onboarding__photo-copy">
            <strong>Add a profile photo</strong>
            <small>JPEG or PNG, up to 10 MB</small>
          </span>
          <input
            accept="image/jpeg,image/png"
            aria-label="Choose a profile photo"
            onChange={(event) => chooseAvatar(event.currentTarget.files?.[0])}
            type="file"
          />
        </label>

        <label className="profile-onboarding__field">
          <span>Your name</span>
          <input
            autoComplete="name"
            maxLength={80}
            onChange={(event) => setDisplayName(event.currentTarget.value)}
            required
            value={displayName}
          />
        </label>

        <label className="profile-onboarding__field">
          <span>Ministry <small>Optional</small></span>
          <input
            autoComplete="organization-title"
            maxLength={120}
            onChange={(event) => setMinistry(event.currentTarget.value)}
            placeholder="e.g. Worship, Youth, Welcome team"
            value={ministry}
          />
        </label>

        <label className="profile-onboarding__field">
          <span>A little about you <small>Optional</small></span>
          <textarea
            maxLength={160}
            onChange={(event) => setBio(event.currentTarget.value)}
            placeholder="Share a little about your faith or what brings you joy."
            rows={4}
            value={bio}
          />
          <small className="profile-onboarding__count">{bio.length}/160</small>
        </label>

        {error && <p className="profile-onboarding__error" role="alert">{error}</p>}

        <button className="profile-onboarding__button" disabled={saving} type="submit">
          {saving ? "Saving your profile…" : mode === "edit" ? "Save changes" : "Continue to GraceSpring"}
        </button>
      </form>
    </main>
  );
}
