import type { ParsedPart } from "./definitionParsers";

/**
 * Immutable list of ParsedPart with structural sharing.
 * Uses readonly array - append returns a new array that shares references to existing parts.
 */
export type ParsedPartList = readonly ParsedPart[];

export const empty: ParsedPartList = [];

/** Append a part to the list. Returns a new list (structural sharing of prefix). */
export function append(list: ParsedPartList, part: ParsedPart): ParsedPartList {
    return [...list, part];
}

/** Replace the last part (for overrideSamePart). Returns a new list. */
export function replaceLast(list: ParsedPartList, part: ParsedPart): ParsedPartList {
    if (list.length === 0) return [part];
    return [...list.slice(0, -1), part];
}

/** Last part in the list, or undefined. */
export function last(list: ParsedPartList): ParsedPart | undefined {
    return list.length > 0 ? list[list.length - 1] : undefined;
}

/** Convert to array (for iteration, compatibility). */
export function toArray(list: ParsedPartList): ParsedPart[] {
    return [...list];
}
