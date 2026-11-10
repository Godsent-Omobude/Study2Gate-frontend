import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import api from "../api/api";

// Fingerprint login for the native Android app.
//
// How it fits together:
//   - On enrol, the backend mints a random secret for this phone and we
//     keep it in the Android Keystore (via the plugin's credential store),
//     filed under SERVER below. username = device id, password = secret.
//   - On login, the fingerprint prompt must pass before we read the secret
//     back and send it to /auth/biometric/login. Every successful login
//     rotates the secret, and we save the new one straight away.
//   - Nothing here runs in a normal browser: every entry point checks for
//     the native app first, so the web build behaves exactly as before.

const SERVER = "com.study2gate.app.fingerprint";

// localStorage hints. The Login page needs to know "is fingerprint set up
// on this phone?" without triggering a prompt, and the Keystore can't be
// asked that for free. NOTE: logout calls localStorage.clear(), so it goes
// through clearLocalStorageKeepingFingerprint() below to keep these.
const ENROLLED_KEY = "fingerprintEnrolled";
const OFFER_DISMISSED_KEY = "fingerprintOfferDismissed";
const KEPT_KEYS = [ENROLLED_KEY, OFFER_DISMISSED_KEY];

// Codes from the plugin's BiometryErrorType that just mean "the person
// backed out" — not worth showing an error for.
const CANCEL_CODES = new Set(["15", "16", "17"]);
const LOCKOUT_CODES = new Set(["2", "4"]);

const isNative = () => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("NativeBiometric");
  } catch {
    return false;
  }
};

// True only inside the installed app, on a phone that has a fingerprint (or
// other biometric) enrolled, and on an app build that actually contains the
// plugin. The last part matters: this web code is served from Vercel, so
// people on an older APK will load it too.
export async function isFingerprintSupported() {
  if (!isNative()) return false;

  try {
    const result = await NativeBiometric.isAvailable({ useFallback: false });
    return Boolean(result?.isAvailable);
  } catch {
    return false;
  }
}

export const isFingerprintEnrolled = () => {
  try {
    return localStorage.getItem(ENROLLED_KEY) === "true";
  } catch {
    return false;
  }
};

export const wasFingerprintOfferDismissed = () => {
  try {
    return localStorage.getItem(OFFER_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

export const dismissFingerprintOffer = () => {
  try {
    localStorage.setItem(OFFER_DISMISSED_KEY, "true");
  } catch {
    // Non-fatal — the offer may simply show again next time.
  }
};

// Drop-in for localStorage.clear() on logout: wipes everything except the
// fingerprint hints, so signing out doesn't also switch fingerprint off.
export function clearLocalStorageKeepingFingerprint() {
  const kept = {};
  KEPT_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) kept[key] = value;
  });

  localStorage.clear();

  Object.entries(kept).forEach(([key, value]) => localStorage.setItem(key, value));
}

const deviceLabel = () => {
  const match = /Android [\d.]+; ([^;)]+?)(?: Build|[;)])/.exec(navigator.userAgent || "");
  return match?.[1]?.trim() || "Android app";
};

const errorCode = (error) => String(error?.code ?? "");

const readLocalCredentials = async () => {
  try {
    const credentials = await NativeBiometric.getCredentials({ server: SERVER });
    if (credentials?.username && credentials?.password) return credentials;
  } catch {
    // No saved credentials.
  }
  return null;
};

// The id of this phone's row on the backend, or null if not enrolled.
export async function getLocalDeviceId() {
  if (!isNative()) return null;
  const credentials = await readLocalCredentials();
  return credentials?.username || null;
}

// Forget fingerprint login on this phone only (does not touch the server).
export async function clearLocalFingerprint() {
  try {
    localStorage.removeItem(ENROLLED_KEY);
  } catch {
    // Ignore.
  }

  if (!isNative()) return;

  try {
    await NativeBiometric.deleteCredentials({ server: SERVER });
  } catch {
    // Nothing stored, or already gone.
  }
}

const promptFingerprint = async (reason) => {
  try {
    await NativeBiometric.verifyIdentity({
      reason,
      title: "Study2Gate",
      subtitle: reason,
      useFallback: false,
      maxAttempts: 3,
    });
  } catch (error) {
    const code = errorCode(error);
    const wrapped = new Error(
      LOCKOUT_CODES.has(code)
        ? "Too many fingerprint attempts. Try again shortly or use your password."
        : "Fingerprint not recognised."
    );
    wrapped.cancelled = CANCEL_CODES.has(code);
    throw wrapped;
  }
};

// Turns fingerprint login on for this phone. Needs the account password
// (the backend checks it). Prompts for a fingerprint first so a stranger
// holding an unlocked phone can't enrol, and so cancelling leaves no
// half-created device on the server.
export async function enrollFingerprint(password) {
  if (!isNative()) throw new Error("Fingerprint login is only available in the Study2Gate app.");

  await promptFingerprint("Confirm your fingerprint to turn this on");

  const response = await api.post("/auth/biometric/enroll", {
    password,
    deviceName: deviceLabel(),
  });
  const { deviceId, secret } = response.data || {};

  try {
    await NativeBiometric.setCredentials({
      username: deviceId,
      password: secret,
      server: SERVER,
    });
  } catch (error) {
    // Don't leave a server-side device that this phone can never use.
    await api.delete(`/auth/biometric/${deviceId}`).catch(() => {});
    throw new Error("Couldn't save fingerprint login on this phone.");
  }

  try {
    localStorage.setItem(ENROLLED_KEY, "true");
  } catch {
    // Non-fatal.
  }
}

// Fingerprint prompt -> secret -> /auth/biometric/login. Resolves with the
// same user object the password login returns. Throws:
//   - error.cancelled === true  → person backed out; show nothing
//   - an axios error            → let the caller handle it like a password
//                                 login failure (403 gates etc.)
//   - any other Error           → show error.message
export async function loginWithFingerprint() {
  await promptFingerprint("Sign in to Study2Gate");

  const credentials = await readLocalCredentials();
  if (!credentials) {
    await clearLocalFingerprint();
    throw new Error("Fingerprint login isn't set up on this phone any more. Please sign in with your password.");
  }

  let response;
  try {
    response = await api.post("/auth/biometric/login", {
      deviceId: credentials.username,
      secret: credentials.password,
    });
  } catch (error) {
    // The server no longer recognises this phone (password changed, device
    // removed, ...). Forget it locally so the button stops showing.
    if (error.response?.data?.code === "BIOMETRIC_INVALID") {
      await clearLocalFingerprint();
    }
    throw error;
  }

  const { biometricSecret, ...user } = response.data || {};

  if (biometricSecret) {
    try {
      await NativeBiometric.setCredentials({
        username: credentials.username,
        password: biometricSecret,
        server: SERVER,
      });
    } catch (error) {
      // Not fatal: the backend still accepts the previous secret once, so
      // the next fingerprint login works and tries saving again.
      console.error("Failed to save rotated fingerprint secret:", error);
    }
  }

  return user;
}

// Turns fingerprint login off for this phone: removes the server record
// (needs the normal session) and the local secret.
export async function disableFingerprint() {
  const deviceId = await getLocalDeviceId();

  if (deviceId) {
    await api.delete(`/auth/biometric/${deviceId}`);
  }

  await clearLocalFingerprint();
}
