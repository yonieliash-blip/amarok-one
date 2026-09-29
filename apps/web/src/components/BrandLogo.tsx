import amarokServicePlatformLogo from "../assets/amarok-service-platform-logo.png";

interface BrandLogoProps {
  className?: string;
  size?: "default" | "large";
}

export function BrandLogo({ className, size = "default" }: BrandLogoProps) {
  const classes = ["brand-logo", `brand-logo--${size}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <img
        className="brand-logo__image"
        src={amarokServicePlatformLogo}
        alt="AMAROK Service Platform"
      />
    </div>
  );
}
