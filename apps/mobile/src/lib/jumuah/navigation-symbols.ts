export function tabSymbols(isJumuah: boolean) {
  return {
    today: isJumuah ? "sparkles" : "calendar",
    progress: "chart.bar.fill",
    groups: "person.3.fill",
  } as const;
}
