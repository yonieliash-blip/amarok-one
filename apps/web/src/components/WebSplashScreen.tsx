import amarokServicePlatformLogo from "../assets/amarok-service-platform-logo.png";

interface WebSplashScreenProps {
  onLogoLoad: () => void;
}

export function WebSplashScreen({ onLogoLoad }: WebSplashScreenProps) {
  return (
    <main className="web-splash" aria-label="AMAROK ONE">
      <img
        className="web-splash__mark"
        src={amarokServicePlatformLogo}
        alt="AMAROK Service Platform"
        onLoad={onLogoLoad}
      />
    </main>
  );
}
