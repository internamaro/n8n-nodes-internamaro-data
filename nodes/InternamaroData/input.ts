import type { IDataObject } from 'n8n-workflow';
import type { OperationMeta } from './actors';

export const API_BASE_URL = 'https://api.apify.com';

export type BuildResult = { input: IDataObject; error?: undefined } | { input?: undefined; error: string };

/** "a, b\nc" -> ["a", "b", "c"]. Arrays pass through. */
export function toList(value: unknown): string[] {
	if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter((v) => v !== '');
	if (typeof value !== 'string') return [];
	return value
		.split(/[\n,]/)
		.map((v) => v.trim())
		.filter((v) => v !== '');
}

function isEmpty(v: unknown): boolean {
	if (v === undefined || v === null) return true;
	if (typeof v === 'string') return v.trim() === '';
	if (Array.isArray(v)) return v.length === 0;
	if (typeof v === 'object') return Object.keys(v as object).length === 0;
	return false;
}

/**
 * Turns node parameters (main fields + the Options collection) into the Actor input.
 * Returns a user-facing error message instead of the input when the input is unusable.
 */
export function buildActorInput(meta: OperationMeta, params: Record<string, unknown>): BuildResult {
	const input: IDataObject = {};
	for (const [paramName, value] of Object.entries(params)) {
		const field = meta.fields[paramName];
		if (!field) continue;
		let v: unknown = value;
		if (field.kind === 'list') {
			v = toList(value);
		} else if (field.kind === 'json' && typeof value === 'string') {
			if (value.trim() === '') continue;
			try {
				v = JSON.parse(value);
			} catch {
				return { error: `"${field.key}" is not valid JSON.` };
			}
		}
		if (v === undefined || v === null) continue;
		if (field.kind !== 'boolean' && field.kind !== 'integer' && field.kind !== 'number' && isEmpty(v)) {
			continue;
		}
		input[field.key] = v as IDataObject[keyof IDataObject];
	}
	const sourceKeys = meta.sources.map((s) => meta.fields[s].key);
	if (sourceKeys.every((k) => isEmpty(input[k]))) {
		return {
			error: `Fill in at least one of: ${sourceKeys.join(', ')}. An empty input would only run the Actor's built-in sample.`,
		};
	}
	return { input };
}

export function runUrl(actorId: string): string {
	return `${API_BASE_URL}/v2/acts/${actorId}/run-sync-get-dataset-items`;
}
