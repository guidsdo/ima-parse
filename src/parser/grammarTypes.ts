import { CharCode } from "../helpers/charCodeHelpers";

type DefinitionPartBase = {
    type: string;
    key?: string;
    description?: string;
    optional?: boolean;
};

/**
 * Basically // comments and "texts"
 */
export type DefinitionText = DefinitionPartBase & {
    type: "text";
    key: string;
    startPhrase: string;
    endPhrase: string;
};

/**
 * Modifiers where the order doesn't matter. If the order matters, use separate definitions.
 */
export type DefinitionModifiers = DefinitionPartBase & {
    type: "modifiers";
    phrases: string[];
    singular?: boolean;
    key?: never;
};

/**
 * Alternative paths that can only contain simple definition parts. This is to allow more flexibility but still restrict the complexity.
 * The parts of all the paths will be added to the typings of the containing rule with optionality.
 */
export type DefinitionPaths = DefinitionPartBase & {
    type: "paths";
    paths: SimpleDefinitionPart[][];
    key?: never;
};

/**
 * A required keyword/character that provides structure to the rule that's being defined.
 * Optional? No, always required.
 */
export type DefinitionKeyword = DefinitionPartBase & {
    type: "keyword";
    phrase: string;
    optional?: false;
    key?: never;
};

/**
 * A number definition. Need other types of characters in front or behind? Use paths and/or modifiers.
 * Optional? No, always required.
 */
export type DefinitionNumber = DefinitionPartBase & {
    type: "number";
    key: string;
    optional?: false;
};

/**
 * Identifier that can be a word that contains letters, numbers and underscores.
 * Optional? No, always required.
 */
export type DefinitionIdentifier = DefinitionPartBase & {
    type: "identifier";
    key: string;
    optional?: false;
};

/**
 * Rules that always are a child of another rule.
 */
export type DefinitionRules = DefinitionPartBase & {
    type: "rules";
    key: string;
    rules: GrammarRule[] | (() => GrammarRule[]);
    optional: boolean;
    /** Only allow one of the rules once */
    singular?: boolean;
    /** Phrase that separates the rules */
    separatorPhrase?: string;
    /* Unfortunately this is something encountered */
    separatorOptional?: boolean;
};

export type SimpleDefinitionPart = DefinitionIdentifier | DefinitionModifiers | DefinitionKeyword | DefinitionText | DefinitionNumber;

export type DefinitionPart = SimpleDefinitionPart | DefinitionRules | DefinitionPaths;

/**
 * Define a 'rule' that can be referred to from other rules (where you allow it). Make sure that the definition parts within are
 * NON-ambiguous! All array definitions are parsed in order, so take that into account when defining.
 */
export type GrammarRule = { name: string; definition: DefinitionPart[] };

export type Grammar = {
    TopLevel: GrammarRule;
    global: DefinitionRules;
    wordChars?: CharCode[];
    numberChars?: CharCode[];
    validChars?: CharCode[];
};
