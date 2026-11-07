
export const CREDITS_UPDATED_EVENT = "study2gate-credits-updated";

export function broadcastDownloadCredits(credits) {
  if (credits === null || credits === undefined) return;
  window.dispatchEvent(
    new CustomEvent(CREDITS_UPDATED_EVENT, { detail: { credits: Number(credits) } })
  );
}

export async function readDownloadErrorPayload(error) {
  const data = error?.response?.data;
  if (!data) return null;

  if (typeof data === "object" && !(data instanceof Blob)) {
    return data;
  }

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  return null;
}
