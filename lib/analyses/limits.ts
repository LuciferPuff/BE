import "server-only";

/** HttpOnly cookie that ties anonymous analyses to a browser. */
export const ANON_ANALYSIS_COOKIE = "byggello_anon_sid";

export const ANON_ANALYSIS_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export const FREE_ANALYSES_LIMIT = 3;
