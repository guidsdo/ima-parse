export type CharCode = number | [start: number, end: number];

export const CharCodes = {
    tab: 9,
    newline: 10,
    space: 32,
    relevantChars: [33, 126],
    underscore: 95,
    lettersUpper: [65, 90],
    lettersLower: [97, 122],
    numbers: [48, 57]
} satisfies Record<string, CharCode>;

export const defaultWordChars: CharCode[] = [CharCodes.lettersUpper, CharCodes.lettersLower, CharCodes.underscore];
export const defaultNumberChars: CharCode[] = [CharCodes.numbers];
export const defaultValidChars: CharCode[] = [CharCodes.relevantChars];

export function matchCharCodes(input: number, ...nrRanges: CharCode[]) {
    for (const nrOrRange of nrRanges) {
        if (Array.isArray(nrOrRange) ? nrOrRange[0] <= input && input <= nrOrRange[1] : input === nrOrRange) return true;
    }

    return false;
}
