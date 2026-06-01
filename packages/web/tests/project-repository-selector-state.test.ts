import { describe, expect, it } from "bun:test";
import { resolveRepositorySelectorState } from "../src/components/projects/project-create-dialog-fields";
import type {
	RepositorySelectorState,
	RepositorySelectorStateInput,
} from "../src/components/projects/types/projects-panel.types";

const connected = {
	isConfigured: true,
	isConnected: true,
	login: "octo",
	unavailableReason: null,
};
const CONNECTION_UNAVAILABLE =
	"GitHub connection unavailable; manual entry is still available.";
const OAUTH_UNCONFIGURED =
	"GitHub OAuth is not configured; manual entry is still available.";
const REPOSITORIES_UNAVAILABLE =
	"GitHub repositories unavailable; manual entry is still available.";
const NO_REPOSITORIES =
	"No repositories found; manual entry is still available.";

describe("project repository selector state", () => {
	it("resolves GitHub connection and repository loading states", () => {
		expectSelectorStatus(
			{ connection: undefined, isConnectionError: true },
			CONNECTION_UNAVAILABLE,
			{ shouldShowRetry: true },
		);
		expectSelectorStatus({ connection: disconnected() }, OAUTH_UNCONFIGURED);
		expectSelectorStatus(
			{ connection: { ...connected, isConnected: false, login: null } },
			"Connect GitHub to list repositories.",
			{ shouldShowConnect: true },
		);
		expectSelectorStatus(
			{ isRepositoryLoading: true },
			"Loading repositories.",
		);
		expectSelector(
			{ hasRepositoryOptions: true },
			{ canSelectRepository: true },
		);
		expectSelectorStatus(
			{ isRepositoryError: true },
			REPOSITORIES_UNAVAILABLE,
			{ shouldShowRetry: true },
		);
		expectSelectorStatus({}, NO_REPOSITORIES);
	});
});

function expectSelector(
	inputOverrides: Partial<RepositorySelectorStateInput>,
	expectedOverrides: Partial<RepositorySelectorState>,
): void {
	expect(resolveRepositorySelectorState(selectorInput(inputOverrides))).toEqual(
		selectorState(expectedOverrides),
	);
}

function expectSelectorStatus(
	inputOverrides: Partial<RepositorySelectorStateInput>,
	statusMessage: string,
	expectedOverrides: Partial<RepositorySelectorState> = {},
): void {
	expectSelector(inputOverrides, { ...expectedOverrides, statusMessage });
}

function disconnected(): RepositorySelectorStateInput["connection"] {
	return {
		isConfigured: false,
		isConnected: false,
		login: null,
		unavailableReason: "GitHub OAuth is not configured",
	};
}

function selectorInput(
	overrides: Partial<RepositorySelectorStateInput>,
): RepositorySelectorStateInput {
	return {
		connection: connected,
		hasRepositoryOptions: false,
		isConnectionError: false,
		isConnectionLoading: false,
		isRepositoryLoading: false,
		isRepositoryError: false,
		repositoryUnavailableReason: null,
		...overrides,
	};
}

function selectorState(
	overrides: Partial<RepositorySelectorState>,
): RepositorySelectorState {
	return {
		canSelectRepository: false,
		shouldShowConnect: false,
		shouldShowRetry: false,
		statusMessage: null,
		...overrides,
	};
}
