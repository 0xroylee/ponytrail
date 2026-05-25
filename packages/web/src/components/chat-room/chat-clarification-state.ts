"use client";

import { type Dispatch, type SetStateAction, useState } from "react";

import {
	buildClarificationAnswers,
	resolveClarificationStep,
	updateClarificationAnswer,
} from "@/components/clarification/clarification-queue-utils";
import type { ChatSessionRecord } from "@/lib/api";
import type { ChatAnswerPayload } from "./types/chat-room.types";

interface UseChatClarificationStateInput {
	pendingAnswers: string[];
	pendingQuestionIndex: number;
	selectedSession: ChatSessionRecord | null;
	sendAnswers(input: {
		sessionId: string;
		content: string;
		answers: ChatAnswerPayload;
	}): Promise<void>;
}

export function useChatClarificationState(): {
	answerDrafts: Record<string, string[]>;
	answerStepBySession: Record<string, number>;
	setAnswerDrafts: Dispatch<SetStateAction<Record<string, string[]>>>;
	setAnswerStepBySession: Dispatch<SetStateAction<Record<string, number>>>;
	submitAnswers(input: UseChatClarificationStateInput): Promise<void>;
	updateAnswerDraft(sessionId: string, index: number, value: string): void;
} {
	const [answerDrafts, setAnswerDrafts] = useState<Record<string, string[]>>(
		{},
	);
	const [answerStepBySession, setAnswerStepBySession] = useState<
		Record<string, number>
	>({});

	function updateAnswerDraft(
		sessionId: string,
		index: number,
		value: string,
	): void {
		setAnswerDrafts((current) => ({
			...current,
			[sessionId]: updateClarificationAnswer(
				current[sessionId] ?? [],
				index,
				value,
			),
		}));
	}

	async function submitAnswers({
		pendingAnswers,
		pendingQuestionIndex,
		selectedSession,
		sendAnswers,
	}: UseChatClarificationStateInput): Promise<void> {
		if (!selectedSession?.pendingQuestions.length) return;
		const step = resolveClarificationStep(
			selectedSession.pendingQuestions,
			pendingQuestionIndex,
		);
		if (!step.currentQuestion || !pendingAnswers[step.currentIndex]?.trim()) {
			return;
		}
		if (!step.isFinalStep) {
			setAnswerStepBySession((current) => ({
				...current,
				[selectedSession.id]: step.currentIndex + 1,
			}));
			return;
		}
		const answers = buildClarificationAnswers(
			selectedSession.pendingQuestions,
			pendingAnswers,
		);
		await sendAnswers({
			sessionId: selectedSession.id,
			content: answers.map((answer) => answer.answer).join("\n"),
			answers,
		});
		setAnswerDrafts((current) => ({ ...current, [selectedSession.id]: [] }));
		setAnswerStepBySession((current) => ({
			...current,
			[selectedSession.id]: 0,
		}));
	}

	return {
		answerDrafts,
		answerStepBySession,
		setAnswerDrafts,
		setAnswerStepBySession,
		submitAnswers,
		updateAnswerDraft,
	};
}
