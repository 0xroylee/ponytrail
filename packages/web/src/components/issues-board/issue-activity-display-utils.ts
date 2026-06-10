const LABELED_SAFE_FIELDS = ["result", "thinking", "planning"] as const;
const UNLABELED_SAFE_FIELDS = ["text", "message", "detail", "summary"] as const;
const MAX_FORMAT_DEPTH = 2;
const RAW_JSON_FIELD_LINE =
	/^"?(?:command|payload|arguments|args|input|parameters|recipient_name|tool_name|toolName|schema)"?\s*:/;

export function formatOperatorActivityText(rawText: string): string {
	return formatText(rawText, 0);
}

function formatText(rawText: string, depth: number): string {
	const trimmed = rawText.trim();
	if (!trimmed) return "";
	const structuredText = formatStructuredValue(parseJsonValue(trimmed), depth);
	if (structuredText !== null) return structuredText;
	return trimmed
		.split(/\r?\n/)
		.map((line) => formatLine(line, depth))
		.filter(Boolean)
		.join("\n");
}

function formatLine(line: string, depth: number): string {
	const trimmed = line.trim();
	if (!trimmed || isRawJsonDumpLine(trimmed)) return "";
	const structuredText = formatStructuredValue(parseJsonValue(trimmed), depth);
	return structuredText ?? trimmed;
}

function formatStructuredValue(value: unknown, depth: number): string | null {
	if (value === null) return null;
	if (Array.isArray(value)) {
		const lines = value
			.map((item) => formatStructuredValue(item, depth))
			.filter((line): line is string => Boolean(line));
		return lines.length > 0 ? lines.join("\n") : "";
	}
	if (!isRecord(value)) return null;
	const lines = [
		...LABELED_SAFE_FIELDS.flatMap((field) =>
			formatSafeField(value, field, depth, labelForField(field)),
		),
		...UNLABELED_SAFE_FIELDS.flatMap((field) =>
			formatSafeField(value, field, depth),
		),
	];
	const item = value.item;
	if (isRecord(item)) {
		const itemText = formatStructuredValue(item, depth);
		if (itemText) lines.push(itemText);
	}
	return uniqueLines(lines).join("\n");
}

function formatSafeField(
	record: Record<string, unknown>,
	field: string,
	depth: number,
	label?: string,
): string[] {
	const value = record[field];
	if (typeof value !== "string") return [];
	const text =
		depth >= MAX_FORMAT_DEPTH ? value.trim() : formatText(value, depth + 1);
	if (!text) return [];
	return [label ? `${label}: ${text}` : text];
}

function parseJsonValue(text: string): unknown {
	if (!looksLikeJson(text)) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return null;
	}
}

function looksLikeJson(text: string): boolean {
	return (
		(text.startsWith("{") && text.endsWith("}")) ||
		(text.startsWith("[") && text.endsWith("]"))
	);
}

function isRawJsonDumpLine(text: string): boolean {
	return (
		text === "{" ||
		text === "}" ||
		text === "[" ||
		text === "]" ||
		text === "}," ||
		text === "]," ||
		RAW_JSON_FIELD_LINE.test(text)
	);
}

function labelForField(field: string): string {
	return field.charAt(0).toUpperCase() + field.slice(1);
}

function uniqueLines(lines: string[]): string[] {
	const seen = new Set<string>();
	return lines.filter((line) => {
		if (seen.has(line)) return false;
		seen.add(line);
		return true;
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
