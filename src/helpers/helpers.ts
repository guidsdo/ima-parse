import { DefinitionRules, RuleDefinition } from "../parser/ruleTypes";

export type ResultFailed<E> = { success: false; error: E };

export type ResultSuccess<R = {}> = R & { success: true };

export type Result<R = {}, E = string> = ResultSuccess<R> | ResultFailed<E>;

export type Cursor = { ln: number; col: number };

export type Position = { start: Cursor; end: Cursor };

export type PhraseKind = "chars" | "word" | "number";

/**
 * Assert that something will never happen. Useful in switch statements to check you've covered all cases
 */
export function assertNever(x: never): never {
    throw new Error("Unexpected object: " + JSON.stringify(x));
}

export function getRules(ruleReference: DefinitionRules): RuleDefinition[] {
    return typeof ruleReference.rules === "function" ? ruleReference.rules() : ruleReference.rules;
}
