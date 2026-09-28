/** Initial page size for dashboard list queries (analyses, documents, events). */
export const DASHBOARD_PAGE_SIZE = 20;

/**
 * Hard cap on document rows per property (storage growth control).
 * Enforced on upload; keeps folder/metadata queries bounded.
 */
export const MAX_DOCUMENTS_PER_PROPERTY = 100;
