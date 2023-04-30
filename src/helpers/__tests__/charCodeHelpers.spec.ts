import { CharCodes, matchCharCodes } from "../charCodeHelpers";

describe("matchCharCodes", () => {
    it("should match lowercase letters", () => {
        expect(matchCharCodes("a".charCodeAt(0), CharCodes.lettersLower)).toStrictEqual(true);
        expect(matchCharCodes("n".charCodeAt(0), CharCodes.lettersLower)).toStrictEqual(true);
        expect(matchCharCodes("z".charCodeAt(0), CharCodes.lettersLower)).toStrictEqual(true);
    });

    it("should match uppercase letters", () => {
        expect(matchCharCodes("A".charCodeAt(0), CharCodes.lettersUpper)).toStrictEqual(true);
        expect(matchCharCodes("N".charCodeAt(0), CharCodes.lettersUpper)).toStrictEqual(true);
        expect(matchCharCodes("Z".charCodeAt(0), CharCodes.lettersUpper)).toStrictEqual(true);
    });

    it("should match numbers", () => {
        expect(matchCharCodes("0".charCodeAt(0), CharCodes.numbers)).toStrictEqual(true);
        expect(matchCharCodes("5".charCodeAt(0), CharCodes.numbers)).toStrictEqual(true);
        expect(matchCharCodes("9".charCodeAt(0), CharCodes.numbers)).toStrictEqual(true);
    });

    it("should multiple character types", () => {
        const matchers = [CharCodes.tab, CharCodes.numbers, CharCodes.lettersUpper, CharCodes.lettersLower];
        expect(matchCharCodes("5".charCodeAt(0), ...matchers)).toStrictEqual(true);
        expect(matchCharCodes("N".charCodeAt(0), ...matchers)).toStrictEqual(true);
        expect(matchCharCodes("n".charCodeAt(0), ...matchers)).toStrictEqual(true);
        expect(matchCharCodes("\t".charCodeAt(0), ...matchers)).toStrictEqual(true);
    });

    it("should return false when giving a non matching input", () => {
        const matchers = [CharCodes.tab, CharCodes.numbers, CharCodes.lettersUpper, CharCodes.lettersLower];
        expect(matchCharCodes("5".charCodeAt(0), CharCodes.lettersUpper, CharCodes.lettersLower)).toStrictEqual(false);
        expect(matchCharCodes("N".charCodeAt(0), CharCodes.tab, CharCodes.numbers)).toStrictEqual(false);
        expect(matchCharCodes("n".charCodeAt(0), CharCodes.lettersUpper, CharCodes.numbers)).toStrictEqual(false);
        expect(matchCharCodes("\t".charCodeAt(0), CharCodes.lettersUpper, CharCodes.numbers)).toStrictEqual(false);
    });
});
