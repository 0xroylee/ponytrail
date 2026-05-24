"use client";

import {
	type ReactElement,
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import {
	applyThemeToDocument,
	getSystemTheme,
	nextThemePreference,
	readStoredThemePreference,
	resolveTheme,
	writeStoredThemePreference,
} from "@/lib/theme/theme";
import type {
	ResolvedTheme,
	ThemeController,
	ThemePreference,
} from "@/lib/theme/theme.types";

type Props = {
	children: ReactNode;
};

const ThemeContext = createContext<ThemeController | null>(null);

function getInitialThemeState(): {
	preference: ThemePreference;
	resolvedTheme: ResolvedTheme;
} {
	const preference = readStoredThemePreference(
		typeof window === "undefined" ? undefined : window.localStorage,
	);
	const systemTheme = getSystemTheme(
		typeof window === "undefined" ? undefined : window.matchMedia,
	);
	return {
		preference,
		resolvedTheme: resolveTheme(preference, systemTheme),
	};
}

export function ThemeProvider({ children }: Props): ReactElement {
	const [themeState, setThemeState] = useState(getInitialThemeState);

	useEffect(() => {
		applyThemeToDocument(document.documentElement, themeState.resolvedTheme);
	}, [themeState.resolvedTheme]);

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const syncSystemTheme = (): void => {
			setThemeState((current) => {
				if (current.preference !== "system") {
					return current;
				}
				const systemTheme = mediaQuery.matches ? "dark" : "light";
				return {
					preference: "system",
					resolvedTheme: systemTheme,
				};
			});
		};
		mediaQuery.addEventListener("change", syncSystemTheme);
		return () => {
			mediaQuery.removeEventListener("change", syncSystemTheme);
		};
	}, []);

	const setPreference = useCallback((preference: ThemePreference): void => {
		writeStoredThemePreference(window.localStorage, preference);
		const systemTheme = getSystemTheme(window.matchMedia);
		setThemeState({
			preference,
			resolvedTheme: resolveTheme(preference, systemTheme),
		});
	}, []);

	const cyclePreference = useCallback((): void => {
		setPreference(nextThemePreference(themeState.preference));
	}, [setPreference, themeState.preference]);

	const value = useMemo<ThemeController>(
		() => ({
			preference: themeState.preference,
			resolvedTheme: themeState.resolvedTheme,
			setPreference,
			cyclePreference,
		}),
		[
			themeState.preference,
			themeState.resolvedTheme,
			setPreference,
			cyclePreference,
		],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useThemeController(): ThemeController {
	const value = useContext(ThemeContext);
	if (!value) {
		throw new Error("useThemeController must be used within ThemeProvider");
	}
	return value;
}
