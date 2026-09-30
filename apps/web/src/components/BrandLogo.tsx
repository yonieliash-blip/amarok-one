import type { CSSProperties } from "react";
import amarokServicePlatformLogo from "../assets/amarok-service-platform-logo.png";

interface BrandLogoProps {
  className?: string;
  size?: "default" | "large";
  variant?: "default" | "header";
}

export function BrandLogo({ className, size = "default", variant = "default" }: BrandLogoProps) {
  const classes = ["brand-logo", `brand-logo--${size}`, `brand-logo--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  if (variant === "header") {
    const logoMaskStyle = {
      "--brand-logo-mask": `url("${amarokServicePlatformLogo}")`,
    } as CSSProperties;

    return (
      <div className={classes}>
        <span
          className="brand-logo__image brand-logo__image--header"
          style={logoMaskStyle}
          role="img"
          aria-label="AMAROK Service Platform"
        >
          <span className="brand-logo__header-layer brand-logo__header-layer--wordmark" />
          <span className="brand-logo__header-layer brand-logo__header-layer--tagline" />
        </span>
      </div>
    );
  }

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
