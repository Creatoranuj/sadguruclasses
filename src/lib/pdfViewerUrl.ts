/** Shared PDF embed URL builder — single source of truth */

/** Use Mozilla CDN with pagemode=none for faster initial render */
const PDFJS_VIEWER = "https://mozilla.github.io/pdf.js/web/viewer.html";

/** Google Drive file URL → preview embed */
export const isGoogleDrive = (url: string) => /drive\.google\.com/.test(url);

/** Google Docs document URL */
export const isGoogleDocs = (url: string) => /docs\.google\.com\/document/.test(url);

/** jsDelivr CDN URL (direct PDF hosting) */
export const isJsDelivrCdn = (url: string) => /cdn\.jsdelivr\.net/i.test(url);

/** GitHub Storages CDN viewer (already a viewer page) */
export const isGithubStoragesCdn = (url: string) =>
  /github-storages-cdn\.vercel\.app/i.test(url);

/** Sadguru Classes Storage viewer (already a viewer page) */
export const isMahimaAcademyStorage = (url: string) =>
  /storage-naveenbharat-recording\.vercel\.app/i.test(url);

/** Extract Google Drive file ID */
export const extractDriveFileId = (url: string): string | null => {
  const m1 = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m1?.[1] || m2?.[1] || null;
};

/** Extract Google Docs document ID */
export const extractDocsId = (url: string): string | null => {
  const m = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1] || null;
};

/** Build PDF.js CDN viewer URL (fast, client-side rendering) */
export const pdfJsViewerUrl = (fileUrl: string): string =>
  `${PDFJS_VIEWER}?file=${encodeURIComponent(fileUrl)}#toolbar=0&navpanes=0&pagemode=none`;

/**
 * Resolve the best embed URL for any document URL.
 * Returns { embedUrl, openUrl, isDrive }
 */
export function resolveEmbedUrl(url: string): {
  embedUrl: string;
  openUrl: string;
  isDrive: boolean;
} {
  // Google Drive
  if (isGoogleDrive(url)) {
    const fileId = extractDriveFileId(url);
    if (fileId) {
      return {
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        openUrl: `https://drive.google.com/file/d/${fileId}/view`,
        isDrive: true,
      };
    }
  }

  // Google Docs
  if (isGoogleDocs(url)) {
    const docId = extractDocsId(url);
    if (docId) {
      return {
        embedUrl: `https://docs.google.com/document/d/${docId}/preview`,
        openUrl: `https://docs.google.com/document/d/${docId}/edit`,
        isDrive: false,
      };
    }
  }

  // Custom viewer pages — embed directly
  if (isGithubStoragesCdn(url) || isMahimaAcademyStorage(url)) {
    return { embedUrl: url, openUrl: url, isDrive: false };
  }

  // Everything else → Google Docs viewer (handles CORS for cross-origin PDFs)
  return {
    embedUrl: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`,
    openUrl: url,
    isDrive: false,
  };
}
