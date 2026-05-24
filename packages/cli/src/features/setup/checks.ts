import {
	renderCliHeading,
	renderStatusLine,
	renderSummaryBox,
} from "../../utils/terminal-format";
import { collectSetupChecks } from "./checks-collection";
import { GITHUB_CLI_INSTALL_URL, RTK_INSTALL_URL } from "./constants";
import type { SetupCheck } from "./types/setup.types";

export { collectSetupChecks };

export function formatSetupChecks(checks: SetupCheck[]): string {
	const passed = checks.filter((check) => check.status === "pass").length;
	const failed = checks.length - passed;
	return [
		renderSummaryBox("Summary", [
			{ count: passed, label: "passed", tone: "success" },
			{ count: failed, label: "failed", tone: "danger" },
		]),
		"",
		...checks.map((check) =>
			renderStatusLine(check.status, check.name, check.message),
		),
		"",
		failed === 0
			? renderCliHeading("All checks passed!")
			: renderCliHeading(
					`${failed} check${failed === 1 ? "" : "s"} failed`,
					"danger",
				),
		"",
	].join("\n");
}

export async function runSetupCheck(cwd: string): Promise<void> {
	const checks = await collectSetupChecks(cwd);
	process.stdout.write(formatSetupChecks(checks));
	if (checks.some((check) => check.status === "fail")) {
		throw new Error("Setup check failed");
	}
}

export function renderSetupRtkInstallPrompt(): string {
	return `RTK is required for devos.ing agent workflow commands.\nInstall RTK before running workflows: ${RTK_INSTALL_URL}\n`;
}

export function renderSetupGitHubInstallPrompt(): string {
	return `GitHub CLI auth is required for devos.ing GitHub workflow commands.\nInstall GitHub CLI: ${GITHUB_CLI_INSTALL_URL}\nThen authenticate: gh auth login\n`;
}
