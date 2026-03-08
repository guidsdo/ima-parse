/**
 * ()    literal
 * []    union
 * [ ]   escaping a special grammar char, for example: QUESTION_MARK = [?]
 * ...   0 or more
 * ?     optional
 * !     strict: allow no ignored (often whitespace) characters inbetween the literal values
 * *     literally anything, including ignore chars
 * #     comment
 * @     settings, for example: @ignore [\n, \r, \t]
 *
 *
 */

type gChars = {
    type: "chars";
    value: string;
};

type gUnion = {
    type: "union";
    value: (gUnion | gChars | gLiteral)[];

    /** 1 or more */
    repeat: boolean;

    /** 0 or 0 or more if 'repeat' is true */
    optional: boolean;
};

type gLiteral = {
    type: "literal";
    value: (gUnion | gChars | gLiteral)[];

    /** Allow no ignored (often whitespace) characters inbetween the literal values */
    strict: boolean;
};
