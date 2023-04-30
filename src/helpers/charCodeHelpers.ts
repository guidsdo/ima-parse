export const CharCodes = {
    tab: 9,
    newline: 10,
    space: 32,
    relevantChars: [33, 126],
    underscore: 95,
    lettersUpper: [65, 90],
    lettersLower: [97, 122],
    numbers: [48, 57]
} satisfies Record<string, [start: number, end: number] | number>;

export function matchCharCodes(input: number, ...nrRanges: (number | [number, number])[]) {
    for (const nrOrRange of nrRanges) {
        if (Array.isArray(nrOrRange) ? nrOrRange[0] <= input && input <= nrOrRange[1] : input === nrOrRange) return true;
    }

    return false;
}
