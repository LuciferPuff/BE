export const AUTH_NEXT_COOKIE = "byggello_auth_next";

export const authNextCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 15,
  path: "/",
};
