import { InvalidArgumentError } from "commander";

export function parsePositiveInt(raw: string): number {
	const value = Number(raw);
	if (!Number.isInteger(value) || value <= 0) {
		throw new InvalidArgumentError("must be a positive integer");
	}
	return value;
}
