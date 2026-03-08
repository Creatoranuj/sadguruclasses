import { memo, useMemo, useState } from "react";
import { ExternalLink, Download, Maximize, Minimize, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFile, extractArchiveId, extractDocsId, getArchiveDownloadUrl } from "@/utils/fileUtils";
import { toast } from "sonner";
import sadguruLogo from "@/assets/branding/logo_icon_web.png";

interface DriveEmbedViewerProps {
  url: string;
  title?: string;
}

const DriveEmbedViewer = memo(({ url, title }: DriveEmbedViewerProps) => {
  const [downloading, setDownloading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { embedUrl, openUrl, canRender, isArchive, archiveId } = useMemo(() => {
    // Google Drive
    if (/drive\.google\.com/.test(url)) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = fileIdMatch?.[1] || idParamMatch?.[1];
      if (fileId) {
        return {
          embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
          openUrl: `https://drive.google.com/file/d/${fileId}/view`,
          canRender: true,
          isArchive: false,
          archiveId: null,
        };
      }
    }

    // Google Docs
    const docsId = extractDocsId(url);
    if (docsId) {
      return {
        embedUrl: `https://docs.google.com/document/d/${docsId}/preview`,
        openUrl: `https://docs.google.com/document/d/${docsId}/edit`,
        canRender: true,
        isArchive: false,
        archiveId: null,
      };
    }

    // Archive.org
    const aid = extractArchiveId(url);
    if (aid) {
      return {
        embedUrl: `https://archive.org/embed/${aid}`,
        openUrl: `https://archive.org/details/${aid}`,
        canRender: true,
        isArchive: true,
        archiveId: aid,
      };
    }

    // Direct PDF
    if (/\.pdf($|\?)/i.test(url)) {
      return { embedUrl: url, openUrl: url, canRender: true, isArchive: false, archiveId: null };
    }

    return { embedUrl: url, openUrl: url, canRender: false, isArchive: false, archiveId: null };
  }, [url]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (isArchive && archiveId) {
        // Use metadata API to find the real PDF file
        toast.info("Finding PDF file…");
        const directUrl = await getArchiveDownloadUrl(archiveId);
        await downloadFile(directUrl, title ? `${title}.pdf` : `${archiveId}.pdf`);
      } else {
        await downloadFile(url, title ? `${title}.pdf` : undefined);
      }
      toast.success("Download started");
    } catch {
      toast.error("Download failed — try opening in a new tab");
    } finally {
      setDownloading(false);
    }
  };

  if (!canRender) return null;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-[100] bg-background flex flex-col"
          : "relative w-full h-full min-h-[70vh] rounded-xl overflow-hidden border border-border bg-card flex flex-col"
      }
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border shrink-0">
        <FileText className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {title || "Document"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={handleDownload}
            disabled={downloading}
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
            <span className="ml-1 hidden sm:inline text-xs">
              {downloading ? "Finding…" : "Download"}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="relative flex-1 min-h-0">
        {/* Archive.org top branding suppression overlay */}
        {isArchive && (
          <div
            className="absolute top-0 left-0 right-0 h-9 z-10 flex items-center px-3 gap-2 select-none pointer-events-none"
            style={{ background: "hsl(var(--card))" }}
          >
            <img src={refreshLogo} alt="" className="h-5 w-5 rounded" draggable={false} />
            <span className="text-xs font-semibold text-foreground tracking-wide">
              Sadguru Coaching Classes
            </span>
          </div>
        )}

        {/* Archive.org left-side controls panel overlay */}
        {isArchive && (
          <div
            className="absolute top-9 left-0 bottom-8 w-11 z-10 select-none pointer-events-none"
            style={{ background: "hsl(var(--card))" }}
          />
        )}

        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          style={isArchive ? { marginTop: "36px", height: "calc(100% - 36px)" } : undefined}
          title={title || "Document Preview"}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
          loading="eager"
          allowFullScreen
        />

        {/* Bottom branding gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-1.5 select-none pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
        >
          <img src={refreshLogo} alt="" className="h-5 w-5 rounded" draggable={false} />
          <span className="text-white text-xs font-semibold tracking-wide">
            Sadguru Coaching Classes
          </span>
        </div>
      </div>
    </div>
  );
});

DriveEmbedViewer.displayName = "DriveEmbedViewer";

export default DriveEmbedViewer;
