/** After customer sign-in, send returning shoppers home — not the profile editor. */
export function customerPostLoginPath(next: string | null | undefined) {
  const target = (next ?? "").trim();
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("://")) {
    return "/";
  }
  if (target.startsWith("/admin")) return "/";
  if (target === "/account" || target === "/account/" || target.startsWith("/account/login")) {
    return "/";
  }
  return target;
}
