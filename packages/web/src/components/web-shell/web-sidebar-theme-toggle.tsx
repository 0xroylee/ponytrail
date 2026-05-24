import { Moon, Sun, SunMoon } from "lucide-react";
import type { ReactElement } from "react";

import type { ThemePreference } from "@/lib/theme/theme.types";

export function themeLabel(preference: ThemePreference): string {
	if (preference === "light") {
		return "Theme: Light";
	}
	if (preference === "dark") {
		return "Theme: Dark";
	}
	return "Theme: System";
}

export function ThemePreferenceIcon({
	preference,
}: {
	preference: ThemePreference;
}): ReactElement {
	if (preference === "light") {
		return <Sun size={15} />;
	}
	if (preference === "dark") {
		return <Moon size={15} />;
	}
	return <SunMoon size={15} />;
}
