/** Readable device kind from a browser user-agent. No network lookup. */
export function describeDevice(userAgent: string | null | undefined): string {
  const ua = String(userAgent || "");
  if (!ua.trim()) return "Unknown device";

  let kind = "Computer";
  if (/iPad/i.test(ua)) kind = "iPad";
  else if (/iPhone|iPod/i.test(ua)) kind = "iPhone";
  else if (/Android/i.test(ua) && /Mobile/i.test(ua)) kind = "Android phone";
  else if (/Android/i.test(ua)) kind = "Android tablet";
  else if (/CrOS/i.test(ua)) kind = "Chromebook";
  else if (/Windows/i.test(ua)) kind = "Windows PC";
  else if (/Macintosh|Mac OS X/i.test(ua)) kind = "Mac";
  else if (/Linux/i.test(ua)) kind = "Linux PC";

  let browser = "";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = "Safari";

  return browser ? `${kind} · ${browser}` : kind;
}
