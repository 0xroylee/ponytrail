import { describe, expect, it } from "bun:test";

import {
	createMissionGoalAction,
	resolveMissionGoalActionStatus,
} from "../src/components/chat-room/chat-mission-goal-action";
import type { ChatMissionPhase } from "../src/components/chat-room/types/chat-mission-progress.types";
import {
	missionModel,
	missionModelWithSteps,
	progressStep,
} from "./chat-mission-progress-fixtures";

describe("chat mission goal action", () => {
	it("defines a goal action from the selected mission task", () => {
		const mission = missionModel();

		expect(mission.goalAction).toEqual({
			id: "goal",
			label: "Goal",
			title: "Show mission progress",
			description: null,
			status: "running",
			metadata: ["TASK-42", "Implementing"],
		});
	});

	it("prefers the planner success goal when workflow activity records it", () => {
		const mission = missionModelWithSteps({
			steps: [
				progressStep(1, "summary", "recorded", {
					kind: "summary",
					stage: "plan",
					successGoal: "Ship a mission action graph.",
				}),
			],
		});

		expect(mission.goalAction.title).toBe("Ship a mission action graph.");
		expect(mission.goalAction.description).toBe("Show mission progress");
	});

	it("maps terminal task state onto the goal action status", () => {
		expect(missionModel("succeeded", "done").goalAction.status).toBe("success");
		expect(missionModel("failed", "failed").goalAction.status).toBe("failed");
		expect(missionModel("canceled", "canceled").goalAction.status).toBe(
			"warning",
		);
	});

	it("marks a reviewed mission successful when every phase passed", () => {
		const mission = missionModel("succeeded", "in_review");

		expect(mission.phases.every((phase) => phase.status === "success")).toBe(
			true,
		);
		expect(mission.goalAction.status).toBe("success");
	});

	it("keeps non-terminal goals running once any workflow phase has started", () => {
		const phases: ChatMissionPhase[] = [
			{ id: "plan", label: "Planning", status: "success" },
			{ id: "implement", label: "Implementing", status: "pending" },
		];

		expect(resolveMissionGoalActionStatus("in_progress", phases)).toBe(
			"running",
		);
	});

	it("builds compact metadata without empty values", () => {
		const action = createMissionGoalAction({
			executions: [],
			latestResult: null,
			phases: [],
			statusLabel: " ",
			task: { status: "backlog", taskKey: "", title: "  " },
		});

		expect(action.title).toBe("Untitled task");
		expect(action.metadata).toEqual([]);
	});
});
