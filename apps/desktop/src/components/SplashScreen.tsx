import { useEffect, useRef, useState } from "react";
import axControlBrand from "../assets/AX-control-Brand-vert.svg";

type SplashScreenProps = {
  version?: string;
};

const SPLASH_STATUS = "Conectando...";
const SPLASH_STEP_TIMINGS_MS = [150, 320, 540, 820, 1120, 1450, 1720, 2000];
const SPLASH_STEP_VALUES = [0.08, 0.18, 0.33, 0.5, 0.68, 0.82, 0.93, 1];

export function SplashScreen({ version = "1.0.0" }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current = SPLASH_STEP_TIMINGS_MS.map((delay, index) =>
      window.setTimeout(() => {
        setProgress(SPLASH_STEP_VALUES[index] ?? 1);
      }, delay)
    );

    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  return (
    <section className="startup-shell startup-shell--splash">
      <img className="startup-brand-lockup__logo startup-brand-lockup__logo--splash" src={axControlBrand} alt="AX Control" />

      <div className="startup-loader-block">
        <div className="startup-loader-status startup-loader-status--connected">
          <span>{SPLASH_STATUS}</span>
        </div>
        <div className="startup-loading-bar" aria-hidden="true">
          <div className="startup-loading-bar__fill" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <div className="startup-footer">V {version}</div>
      </div>
    </section>
  );
}
