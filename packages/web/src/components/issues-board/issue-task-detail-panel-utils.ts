import type { TokenUsageRecord } from "@/lib/api";

export function summarizeTokenUsage(records: TokenUsageRecord[]): {
	inputTokens: number;
	outputTokens: number;
	totalTokens: number;
	runs: number;
} {
	const runIds = new Set<string>();
	const totals = records.reduce(
		(summary, record) => {
			runIds.add(record.runId);
			return {
				inputTokens: summary.inputTokens + record.inputTokens,
				outputTokens: summary.outputTokens + record.outputTokens,
				totalTokens: summary.totalTokens + record.totalTokens,
			};
		},
		{ inputTokens: 0, outputTokens: 0, totalTokens: 0 },
	);
	return { ...totals, runs: runIds.size };
}

export function formatTokenCount(value: number): string {
	return new Intl.NumberFormat(undefined, {
		maximumFractionDigits: value >= 1000 ? 1 : 0,
		notation: "compact",
	}).format(value);
}

export function formatDueDate(value: string | null): string {
	if (!value) {
		return "No due date";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}
	return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
		date,
	);
}
