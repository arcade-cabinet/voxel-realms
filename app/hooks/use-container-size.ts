import type { ContainerSize } from "@shared";
import type { RefObject } from "react";
import { useEffect, useState } from "react";

const EMPTY_SIZE: ContainerSize = { width: 0, height: 0 };

export function useContainerSize<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [size, setSize] = useState<ContainerSize>(EMPTY_SIZE);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return undefined;
    }

    const update = () => {
      const width = element.clientWidth;
      const height = element.clientHeight;
      // Only setState if the dimensions actually changed. ResizeObserver
      // can fire frequently during layout; identity-stable updates keep
      // consumers from re-rendering on every pass.
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [ref]);

  return size;
}
