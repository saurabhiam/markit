# Playground

Try MarkIt interactively. Type in the search box to see real-time highlighting.

<script setup>
import PlaygroundDemo from '../components/PlaygroundDemo.vue'
</script>

<PlaygroundDemo />

## What's Happening

1. **As you type**, the search term is debounced (150ms) and passed to the MarkIt core engine
2. **The text index** is built using `TreeWalker` over all text nodes in the content area
3. **Matches** are found against the virtual concatenated string in a single regex pass
4. **The renderer** applies highlights using the selected strategy (DOM wrapping by default)
5. **Match count and timing** are displayed in real-time

Try these searches:
- `Lorem` — multiple matches across paragraphs
- `cafe` with **Ignore Diacritics** enabled — matches "café"
- `the` with **Exact** accuracy — only matches the word "the", not "the" inside "other"
- `JavaScript TypeScript` with **Separate Words** — highlights each word independently
