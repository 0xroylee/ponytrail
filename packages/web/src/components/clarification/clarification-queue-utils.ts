import type { TaskClarificationQuestion, TaskCreateAnswer } from "@/lib/api";

export interface ClarificationStep {
	currentIndex: number;
	currentQuestion: TaskClarificationQuestion | null;
	isFinalStep: boolean;
	totalQuestions: number;
}

export function resolveClarificationStep(
	questions: TaskClarificationQuestion[],
	requestedIndex: number,
): ClarificationStep {
	const totalQuestions = questions.length;
	if (totalQuestions === 0) {
		return {
			currentIndex: 0,
			currentQuestion: null,
			isFinalStep: true,
			totalQuestions,
		};
	}
	const currentIndex = Math.min(
		Math.max(requestedIndex, 0),
		totalQuestions - 1,
	);
	return {
		currentIndex,
		currentQuestion: questions[currentIndex] ?? null,
		isFinalStep: currentIndex >= totalQuestions - 1,
		totalQuestions,
	};
}

export function updateClarificationAnswer(
	answers: string[],
	index: number,
	value: string,
): string[] {
	const next = [...answers];
	next[index] = value;
	return next;
}

export function hasClarificationAnswer(
	answers: string[],
	index: number,
): boolean {
	return (answers[index] ?? "").trim().length > 0;
}

export function buildClarificationAnswers(
	questions: TaskClarificationQuestion[],
	answers: string[],
): TaskCreateAnswer[] {
	return questions.map((question, index) => ({
		question: question.question,
		answer: answers[index]?.trim() ?? "",
	}));
}
