/**
 * Screens read safe-area insets, which normally come from a native provider.
 * Tests render components in isolation, so a fixed inset stands in for it and
 * keeps every screen test free of provider boilerplate.
 */
jest.mock("react-native-safe-area-context", () => {
  const insets = { top: 47, bottom: 34, left: 0, right: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: ({ children }) => children,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});
