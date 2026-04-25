import "@testing-library/jest-dom/vitest";
import "@app/styles/globals.css";

// Common mocks for browser environments
if (typeof window !== "undefined") {
  window.__VOXEL_REALMS_TEST__ = true;
  window.scrollTo = () => {};
}
