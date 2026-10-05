export {};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    /** Set true only after Meta Pixel init under granted consent. */
    __byggelloMetaReady?: boolean;
  }
}
