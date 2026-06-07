import type {
	ChatMissionDeliveryItem,
	ChatMissionPhase,
	ChatMissionPhaseStatus,
} from "./types/chat-mission-progress.types";

export function createMissionDeliveryItems({
	linkedPr,
	phases,
	taskStatus,
}: {
	linkedPr: string | null;
	phases: ChatMissionPhase[];
	taskStatus: string;
}): ChatMissionDeliveryItem[] {
	const items: ChatMissionDeliveryItem[] = [];
	const testing = phases.find((phase) => phase.id === "testing");
	const testingItem = createTestingDeliveryItem(testing?.status);
	if (testingItem) {
		items.push(testingItem);
	}
	const prUrl = linkedPr?.trim();
	if (prUrl) {
		items.push({
			href: prUrl,
			id: "pullRequest",
			label: "Pull request",
			tone: "success",
			value: formatPullRequestValue(prUrl, taskStatus),
		});
	}
	return items;
}

function createTestingDeliveryItem(
	status: ChatMissionPhaseStatus | undefined,
): ChatMissionDeliveryItem | null {
	if (!status || status === "pending") return null;
	if (status === "success") {
		return { id: "testing", label: "Testing", tone: status, value: "Passed" };
	}
	if (status === "failed") {
		return { id: "testing", label: "Testing", tone: status, value: "Failed" };
	}
	if (status === "warning") {
		return {
			id: "testing",
			label: "Testing",
			tone: status,
			value: "Needs attention",
		};
	}
	return { id: "testing", label: "Testing", tone: status, value: "Running" };
}

function formatPullRequestValue(prUrl: string, taskStatus: string): string {
	const match = prUrl.match(/\/pull\/(\d+)(?:\D*)?$/);
	const pullRequestLabel = match ? `PR #${match[1]}` : "Open PR";
	const statusLabel = formatTaskStatus(taskStatus);
	return statusLabel
		? `${pullRequestLabel} - ${statusLabel}`
		: pullRequestLabel;
}

function formatTaskStatus(status: string): string {
	return status
		.trim()
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((part, index) =>
			index === 0
				? `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`
				: part.toLowerCase(),
		)
		.join(" ");
}
