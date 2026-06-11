const MAX_SUMMARY_LENGTH = 280;

export function formatActionLabel(value: string): string {
	return value.replace(/[_-]+/g, " ").trim();
}

export function formatUntracked(count: number): string {
	if (count <= 0) return "";
	return `; ${count} untracked ${count === 1 ? "file" : "files"}`;
}

export function stepDetailText(value: string | null): string | null {
	if (!value?.trim()) return null;
	const parsed = parseDetailRecord(value);
	if (!parsed) return value.trim();
	for (const field of ["detail", "summary", "error"]) {
		const detail = parsed[field];
		if (typeof detail === "string" && detail.trim()) return detail.trim();
	}
	return value.trim();
}

export function readableSummarySnippet(value: string): string | null {
	const structuredText = structuredSummaryText(value);
	if (structuredText) return summarySnippet(structuredText);
	const snippet = summarySnippet(value);
	return isReadableSummaryText(snippet) ? snippet : null;
}

export function summarySnippet(value: string): string {
	const stripped = stripAnsi(value)
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find(Boolean);
	if (!stripped) return "";
	const cleaned = stripped.replace(/^(?:checkpoint|summary|result):\s*/i, "");
	const plainText = cleaned.replace(/^[-*]\s+/, "").replace(/`([^`]+)`/g, "$1");
	return plainText.length > MAX_SUMMARY_LENGTH
		? `${plainText.slice(0, MAX_SUMMARY_LENGTH - 1)}...`
		: plainText;
}

function structuredSummaryText(value: string): string | null {
	const record = parseDetailRecord(value.trim());
	if (!record) return null;
	return readStructuredText(record);
}

function readStructuredText(record: Record<string, unknown>): string | null {
	for (const field of ["text", "message", "summary", "detail", "error"]) {
		const value = record[field];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	for (const field of ["item", "data", "payload"]) {
		const nested = record[field];
		if (isRecord(nested)) {
			const text = readStructuredText(nested);
			if (text) return text;
		}
	}
	return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stripAnsi(value: string): string {
	let output = "";
	for (let index = 0; index < value.length; index += 1) {
		if (value.charCodeAt(index) !== 27) {
			output += value[index] ?? "";
			continue;
		}
		if (value[index + 1] !== "[") continue;
		index += 2;
		while (index < value.length && value[index] !== "m") {
			index += 1;
		}
	}
	return output;
}

function isReadableSummaryText(value: string): boolean {
	const trimmed = value.trim();
	if (!trimmed) return false;
	if (looksLikeJson(trimmed)) return false;
	return !trimmed.includes('"type":"turn.completed"');
}

function looksLikeJson(value: string): boolean {
	return value.startsWith("{") || value.startsWith("[");
}

function parseDetailRecord(value: string): Record<string, unknown> | null {
	try {
		const parsed: unknown = JSON.parse(value);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			return null;
		}
		return parsed as Record<string, unknown>;
	} catch {
		return null;
	}
}
