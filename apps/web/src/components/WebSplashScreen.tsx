import amarokServicePlatformLogo from "../assets/amarok-service-platform-logo.png";

export function WebSplashScreen() {
  return (
    <main className="web-splash" aria-label="AMAROK ONE">
      <img
        className="web-splash__mark"
        src={amarokServicePlatformLogo}
        alt="AMAROK Service Platform"
      />
    </main>
  );
}
