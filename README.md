# ima parse

Another parser, but wait! it might be easy to use. The idea is that there are certain limits, that limit the complexity.
Perfect for parsing your own DSL or even an existing language, which requires only one Grammar JSON file to generate an AST.

# How does it work?

![alt](./assets/how-to-use.png)

## RuleMap

![alt](./assets/rulemap-overview.png)

## RuleParts

![alt](./assets/rule-definition-parts.png)

* **Keyword**: required phrase. Not relevant for the compiler
* **Modifiers**: list of phrases that can occur. Might be required and singular
* **Identifier**: Noun or variable word
* **Number**: Integers
* **Text**: Any char is allowed here. Useful for string literals/comments etc.
* **Paths**: Set of Simple parts (all above). Sort of like a mini-rule that tries multiple paths at once until one or none survives
* **Rules**: Reference to one or more rules. Might be required, singular and have a separator (like a comma)

## Examples
... todo

# Roadmap
* Add LSP support
* Allow choosing your own noun-characters (custom word chars, like a - and a $)
