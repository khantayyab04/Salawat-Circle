/* global jest, afterEach */
/**
 * Screens read safe-area insets, which normally come from a native provider.
 * Tests render components in isolation, so a fixed inset stands in for it and
 * keeps every screen test free of provider boilerplate.
 */
// Exercise React interaction and accessibility in Jest; the native animation
// runtime is verified in the development build on the simulator.
jest.mock("react-native-reanimated", () => {
  const native = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component) => Component,
      View: native.View,
    },
  };
});

// Native control events are a boundary: exercise the screen's value handling
// here, and the SwiftUI/Compose rendering in device checks.
jest.mock("@expo/ui", () => {
  const React = jest.requireActual("react");
  const { View, Pressable, Text } = jest.requireActual("react-native");
  const toggle = (role) => function NativeToggle({ value, onValueChange, label, disabled, testID }) { return
    React.createElement(Pressable, {
      testID, accessibilityRole: role, accessibilityLabel: label,
      accessibilityState: { checked: value, disabled }, disabled,
      onPress: () => onValueChange(!value),
    }, React.createElement(Text, null, label)); };
  return {
    Host: ({ children }) => React.createElement(View, null, children),
    Slider: (props) => {
      const modifiers = Object.fromEntries(
        (props.modifiers ?? []).map((modifier) => [modifier.$type, modifier]),
      );
      return React.createElement(View, {
        ...props,
        accessibilityRole: "adjustable",
        accessibilityLabel: modifiers.accessibilityLabel?.label,
        accessibilityHint: modifiers.accessibilityHint?.hint,
        accessibilityValue: {
          min: props.min,
          max: props.max,
          now: props.value,
          text: modifiers.accessibilityValue?.value,
        },
      });
    },
    Switch: toggle("switch"),
    Checkbox: toggle("checkbox"),
  };
});

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

// Native calendar UI is external; keep the app's date conversion and events real.
jest.mock("@expo/ui/community/datetime-picker", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return { __esModule: true, default: (props) => React.createElement(View, props) };
});

// The app uses expo-sqlite's Storage implementation on native. Tests use an
// in-memory Web Storage boundary instead of Node's experimental disk storage.
const testStorage = new Map();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: key => testStorage.get(String(key)) ?? null,
    setItem: (key, value) => testStorage.set(String(key), String(value)),
    removeItem: key => testStorage.delete(String(key)),
    clear: () => testStorage.clear(),
    key: index => [...testStorage.keys()][index] ?? null,
    get length() { return testStorage.size; },
  },
});
afterEach(() => testStorage.clear());
