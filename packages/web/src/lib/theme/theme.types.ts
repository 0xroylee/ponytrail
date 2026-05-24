export type ThemePreference = "light" | "dark" | "system";

export type ResolvedTheme = "light" | "dark";

export type ThemeSnapshot = {
	preference: ThemePreference;
	resolvedTheme: ResolvedTheme;
};

export type ThemeController = ThemeSnapshot & {
	setPreference: (preference: ThemePreference) => void;
	cyclePreference: () => void;
};
