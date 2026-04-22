import "@testing-library/jest-dom/vitest";
import "@app/shared/styles/globals.css";

// Common mocks for browser environments
if (typeof window !== "undefined") {
  window.scrollTo = () => {};
}
