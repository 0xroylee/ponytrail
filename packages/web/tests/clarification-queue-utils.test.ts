import { describe, expect, it } from "bun:test";

import {
	buildClarificationAnswers,
	resolveClarificationStep,
	updateClarificationAnswer,
} from "../src/components/clarification/clarification-queue-utils";
import type { TaskClarificationQuestion } from "../src/lib/api";

describe("clarification queue utilities", () => {
	it("selects one current question from a legacy multi-question payload", () => {
		const questions = buildQuestions();

		expect(resolveClarificationStep(questions, 0)).toMatchObject({
			currentIndex: 0,
			currentQuestion: questions[0],
			isFinalStep: false,
			totalQuestions: 2,
		});
		expect(resolveClarificationStep(questions, 1)).toMatchObject({
			currentIndex: 1,
			currentQuestion: questions[1],
			isFinalStep: true,
			totalQuestions: 2,
		});
	});

	it("records option selections and custom answers into payload order", () => {
		const questions = buildQuestions();
		const withOption = updateClarificationAnswer([], 0, "codex");
		const withCustom = updateClarificationAnswer(
			withOption,
			1,
			"Only for the web app",
		);

		expect(buildClarificationAnswers(questions, withCustom)).toEqual([
			{ question: "Which agent?", answer: "codex" },
			{ question: "What scope?", answer: "Only for the web app" },
		]);
	});
});

function buildQuestions(): TaskClarificationQuestion[] {
	return [
		{
			question: "Which agent?",
			options: [
				{ label: "Codex", value: "codex" },
				{ label: "Claude", value: "claude" },
			],
		},
		{ question: "What scope?" },
	];
}
