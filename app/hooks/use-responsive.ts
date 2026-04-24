import { useEffect, useState } from "react";

export interface ViewportInfo {
  width: number;
  height: number;
  aspectRatio: number;
  isPortrait: boolean;
  isMobile: boolean;
}

export function useResponsive(): ViewportInfo {
  const [info, setInfo] = useState<ViewportInfo>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    aspectRatio: typeof window !== "undefined" ? window.innerWidth / window.innerHeight : 1,
    isPortrait: typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false,
    isMobile: typeof window !== "undefined" ? window.innerWidth < 768 : false,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const next: ViewportInfo = {
        width,
        height,
        aspectRatio: width / height,
        isPortrait: height > width,
        isMobile: width < 768,
      };
      // Only setState when a meaningful field changed. resize can fire
      // many times during momentum scroll on mobile; identity-stable
      // state keeps consumers from re-rendering for no reason.
      setInfo((prev) =>
        prev.width === next.width &&
        prev.height === next.height &&
        prev.isPortrait === next.isPortrait &&
        prev.isMobile === next.isMobile
          ? prev
          : next
      );
    };

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return info;
}
