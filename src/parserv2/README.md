# Parser v2

This folder includes new code that does parsing totally differently. The goal is to be just as simple as the previous version, but to be able to handle ambiguous grammars.

How are ambiguous grammars handled?
1. There will be multi-branch parsing instead of the old optimistic first-match approach
1. In the grammar one can now define the characters instead of being forced to either keywords, words and numbers
