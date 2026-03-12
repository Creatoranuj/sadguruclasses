import { ExternalLink } from "lucide-react";
import { Button } from "./button";

interface CertificateButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  passEmail?: string;
}

const CertificateButton = ({
  href,
  children,
  variant = "default",
  className = "",
  passEmail,
}: CertificateButtonProps) => {
  const finalUrl = passEmail
    ? `${href}?email=${encodeURIComponent(passEmail)}`
    : href;

  return (
    <Button
      variant={variant}
      className={className}
      onClick={() => window.open(finalUrl, "_blank", "noopener,noreferrer")}
    >
      {children}
      <ExternalLink className="ml-2 h-4 w-4" />
    </Button>
  );
};

export default CertificateButton;
