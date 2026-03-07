import { Cursor, PhraseKind } from "../helpers/helpers";
import { CharCode, CharCodes, defaultNumberChars, defaultValidChars, defaultWordChars, matchCharCodes } from "../helpers/charCodeHelpers";
import { Grammar } from "./grammarTypes";
import type { Input } from "./definitionParsers";

/**
 * Handles character classification and phrase boundaries.
 * Consumes characters and produces Input objects when phrases are ready to parse.
 */
export class PhraseStream {
    private phrase = "";
    private phraseKind: PhraseKind = "chars";
    private cursor: Cursor = { ln: 1, col: 1 };

    private wordStartChars: CharCode[] = defaultWordChars;
    private wordChars: CharCode[] = defaultWordChars;

    private numberStartChars: CharCode[] = defaultNumberChars;
    private numberChars: CharCode[] = defaultNumberChars;

    private validChars: CharCode[] = defaultValidChars;

    constructor(grammar: Grammar) {
        if (grammar.wordChars) {
            if (Array.isArray(grammar.wordChars)) {
                this.wordChars = grammar.wordChars;
                this.wordStartChars = grammar.wordChars;
            } else {
                this.wordChars = grammar.wordChars.chars;
                this.wordStartChars = grammar.wordChars.start ?? grammar.wordChars.chars;
            }
        }

        if (grammar.numberChars) {
            if (Array.isArray(grammar.numberChars)) {
                this.numberChars = grammar.numberChars;
                this.numberStartChars = grammar.numberChars;
            } else {
                this.numberChars = grammar.numberChars.chars;
                this.numberStartChars = grammar.numberChars.start ?? grammar.numberChars.chars;
            }
        }

        if (grammar.validChars) this.validChars = grammar.validChars;
    }

    getCursor(): Cursor {
        return { ...this.cursor };
    }

    hasPhrase(): boolean {
        return this.phrase.length > 0;
    }

    /**
     * Returns the phrase kind that would accept this character, or undefined if the character
     * cannot extend or start a phrase.
     */
    canCreateOrContinuePhrase(charCode: number): PhraseKind | undefined {
        const matchChars = (chars: CharCode[]) => matchCharCodes(charCode, ...chars);

        const newPhrase = !this.phrase;
        const isWordStartChar = matchChars(this.wordStartChars);
        const isWordChar = matchChars(this.wordChars);

        if ((newPhrase && isWordStartChar) || (!newPhrase && this.phraseKind === "word" && isWordChar)) return "word";

        const isNumberStartChar = matchChars(this.numberStartChars);
        const isNumberChar = matchChars(this.numberChars);
        if ((newPhrase && isNumberStartChar) || (!newPhrase && this.phraseKind === "number" && isNumberChar)) return "number";

        const isValidNonWordChar = !isWordStartChar && !isNumberStartChar && matchChars(this.validChars);
        if (isValidNonWordChar && (newPhrase || this.phraseKind === "chars")) return "chars";

        return undefined;
    }

    /**
     * Add a character to the current phrase. Caller must ensure canCreateOrContinuePhrase returned a value.
     */
    addChar(char: string, phraseKind: PhraseKind): void {
        this.phrase += char;
        this.phraseKind = phraseKind;
        this.advanceCursor(false);
    }

    /**
     * Advance cursor without adding to phrase (e.g. for newlines).
     */
    advanceCursor(newline: boolean): void {
        if (newline) {
            this.cursor.col = 1;
            this.cursor.ln++;
        } else {
            this.cursor.col++;
        }
    }

    /**
     * Build an Input object for the current phrase. Returns undefined if phrase is empty.
     */
    getPhraseInput(): Input | undefined {
        if (!this.phrase) return undefined;

        const startPos: Cursor = {
            ln: this.cursor.ln,
            col: this.cursor.col - this.phrase.length
        };
        const endPos: Cursor = { ...this.cursor };

        return { chars: this.phrase, phraseKind: this.phraseKind, startPos, endPos };
    }

    /**
     * Clear the current phrase after it has been parsed.
     */
    clearPhrase(): void {
        this.phrase = "";
        this.phraseKind = "chars";
    }

    /**
     * Set a single character as the current phrase (for text mode).
     */
    setPhrase(char: string): void {
        this.phrase = char;
        this.phraseKind = "chars";
    }

    /**
     * Check if the given character code is whitespace (tab, space, newline).
     */
    isWhitespace(charCode: number): boolean {
        return matchCharCodes(charCode, CharCodes.tab, CharCodes.space, CharCodes.newline);
    }

    /**
     * Check if the given character code is a newline.
     */
    isNewline(charCode: number): boolean {
        return matchCharCodes(charCode, CharCodes.newline);
    }

    /**
     * Check if the character is invalid (not whitespace and not in validChars).
     */
    isInvalidChar(charCode: number): boolean {
        return !this.isWhitespace(charCode);
    }
}
