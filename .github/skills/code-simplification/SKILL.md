---
name: code-simplification
description: 'Analyze and refactor code to achieve the same functionality with less complexity. Use for: reducing logic complexity (nested conditions, loops), eliminating code duplication, removing unnecessary abstractions and layers.'
argument-hint: 'Paste code or describe the section to simplify'
user-invocable: true
---

# Code Simplification

## When to Use

- You suspect code could be simpler but aren't sure how
- Looking for opportunities to reduce cognitive load
- Refactoring to improve maintainability
- Reviewing pull requests for unnecessary complexity
- Reducing nested conditions or deeply layered abstractions

## Important: Suggestions Only

This skill **never refactors code automatically**. It only:
- Analyzes code structure
- Identifies patterns and opportunities
- **Proposes** specific alternatives (with examples)
- Explains trade-offs

You review each suggestion and decide what to apply. You stay in complete control.

## Analysis Procedure

### 1. Gather Context (Codebase & Git History)

Before analyzing code, understand *why* it exists:

- **Git blame**: Check when this code was written and what problem it solved
  - Did recent commits in related files change the problem statement?
  - Has surrounding code evolved, making this pattern no longer necessary?
  - Was this a deliberate trade-off at the time?
- **Codebase patterns**: Search for similar patterns elsewhere
  - How is this problem solved in other parts of the codebase?
  - Is this inconsistent with project conventions?
  - Are there better examples to learn from?
- **Recent changes**: Look for commits that might have invalidated assumptions
  - New dependencies that replace manual logic?
  - Refactored related code that makes this approach redundant?
  - Breaking changes to contracts this code depends on?

### 2. Map the Current Logic
- **Identify the intent**: What problem is this code solving?
- **Trace the flow**: What's the entry point and exit conditions?
- **List transformations**: What data changes happen and in what order?
- **Note decision points**: Count conditionals, loops, and branching paths

### 3. Detect Complexity Patterns (With Context)

#### Logic Complexity
- **Nested conditionals**: Look for 3+ levels of `if/else` or `switch` statements
  - Can conditions be combined with boolean operators?
  - Can early returns eliminate nesting?
  - Are conditions checking mutually exclusive states?
  - *Check git*: Was this nesting added for a now-handled edge case?
- **Complex loop logic**: Multiple conditions, breaks, continues, or state mutations
  - Can the loop be split into two simpler loops?
  - Can a utility function (map, filter, reduce) replace it?
  - Are loop variables tracking multiple concerns?
  - *Check codebase*: Do newer parts of the code solve this differently?

#### Code Duplication
- **Repeated blocks**: Same logic appears 2+ times with minor variations
  - Can a function parameter extract the differences?
  - Should this be a helper function or utility?
  - Can a loop or map operation replace duplication?
  - *Check codebase*: Are there 3+ instances across different files? That's a strong signal.
- **Similar patterns**: Different variable names but identical structure
  - Common indicator of missing abstraction
  - *Check git*: Did multiple people solve the same problem independently?

#### Unnecessary Abstractions
- **Over-engineered helpers**: Functions with one call site
  - Does this add clarity or just indirection?
  - Could the logic be inlined?
  - *Check git*: Was this a helper extracted "just in case" but never used again?
- **Excessive layering**: Multiple thin wrapper functions
  - Each wrapper adds cognitive load; are they justified?
  - *Check codebase*: Are there recent refactors that made these layers redundant?
- **Premature generalization**: Generic code that only has one use case
  - Consider making it specific until a second use case emerges
  - *Check git*: Has the "planned second use" never materialized?

### 3. Identify Simplification Opportunities

For each pattern detected, ask:
- **Can logic be inverted?** Early returns/guards reduce nesting
- **Can conditions be combined?** Boolean operators may be clearer than nested statements
- **Can loops be replaced?** Functional patterns (map, filter, reduce) often reduce cognitive load
- **Can abstractions be removed?** Inline code that doesn't repeat
- **Can concerns be separated?** Split functions that do multiple things

### 4. Propose Alternatives (For Your Review)

For each opportunity identified:
- Show the current code (3-5 lines of context)
- Include git context: *When was this written? By whom? What was the problem?*
- Explain **why** it's complex (and whether it still needs to be)
- Note any similar patterns found elsewhere in the codebase
- Provide a simplified version **for you to evaluate**
- Note any trade-offs (performance, readability, scope changes)
- **You decide** whether to apply the change

### 5. Evaluate Trade-offs & Context

Before recommending change, consider:
- **Performance**: Does simplification help or hurt?
- **Readability**: Is the new version easier to understand?
- **Flexibility**: Does removal of abstraction limit future changes?
- **Test coverage**: Can tests be simplified too?
- **Historical context**: *Why was it written this way?* Use git blame to understand
  - If there's a reason it was complex, mention that context when suggesting change
  - If the reason no longer applies (stale comment, outdated dependency), point that out
  - Always provide context so the decision is informed, not just assumptive

## Checklist Before Accepting a Suggestion

When reviewing a simplification proposal:
- [ ] Do you understand why the current code is complex?
- [ ] Has the reason changed? (Check git history—did dependencies update? Did related code refactor?)
- [ ] Does the simplified version actually solve the stated problem?
- [ ] Are there codebase patterns that contradict this simplification?
- [ ] Are the trade-offs acceptable for your use case?
- [ ] Will the change break any contracts or APIs?
- [ ] Do tests still pass (or do you need to update them)?
- [ ] **Context-informed**: Did the suggestion include relevant git/codebase context so you understand the "why"?
- [ ] **Then decide**: Apply it, modify it, or skip it

## Anti-Patterns to Avoid

**Over-optimization for cleverness**: Clever code isn't simpler. If it takes domain knowledge to understand, it's probably complex.

**Over-caution with suggestions**: Don't hold back a valid suggestion just because the code was written for a reason. Always make the suggestion, but explain the context so the decision is informed.

**Removing abstractions that add domain meaning**: Sometimes the abstraction is valuable, even if code-level simpler. Surface this trade-off in context.

**Ignoring performance**: Simpler isn't always faster. Profile before and after if performance matters.
