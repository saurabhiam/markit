<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';

// --- Search mode ---
const searchMode = ref<'keyword' | 'regex'>('keyword');
const searchTerm = ref('');
const regexFlags = ref('gi');

// --- Rendering options ---
const renderer = ref<'auto' | 'highlight-api' | 'dom' | 'overlay'>('auto');
const element = ref('mark');
const className = ref('markit-match');
const highlightName = ref('markit-highlight');

// --- Matching options ---
const caseSensitive = ref(false);
const ignoreDiacritics = ref(false);
const separateWordSearch = ref(false);
const acrossElements = ref(false);
const accuracy = ref<'partially' | 'exactly' | 'startsWith' | 'complementary'>('partially');

// --- Advanced options ---
const wildcards = ref<'disabled' | 'enabled' | 'withSpaces'>('disabled');
const ignoreJoiners = ref(false);
const ignorePunctuation = ref('');
const excludeSelectors = ref('');
const synonymsJson = ref('');

// --- Performance options ---
const debounceMs = ref(0);
const batchSize = ref(0);
const debugMode = ref(false);

// --- Sections visibility ---
const showRendering = ref(false);
const showAdvanced = ref(false);
const showPerformance = ref(false);
const showSynonyms = ref(false);

// --- State ---
const matchCount = ref(0);
const elapsedMs = ref(0);
const contentRef = ref<HTMLElement | null>(null);
const activeRenderer = ref('');
const synonymError = ref('');

let markitInstance: any = null;
let markitModule: any = null;

const sampleText = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

The café on the résumé was naïve about über-performance. JavaScript and TypeScript
developers love working with Angular, React, and Next.js frameworks for building
modern web applications.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
culpa qui officia deserunt mollit anim id est laborum.

Highlighting search terms is a common requirement in web applications. Whether it's
a documentation search, a code editor, or an e-commerce product filter, fast and
accurate text highlighting makes a significant difference in user experience.

Lorem ipsum dolor sit amet again for testing multiple matches. The quick brown fox
jumps over the lazy dog. Pack my box with five dozen liquor jugs.
`.trim();

const rendererLabel = computed(() => {
  switch (activeRenderer.value) {
    case 'highlight-api':
      return '✦ CSS Highlight API (zero DOM mutations)';
    case 'dom':
      return '⚙ DOM Wrapping (text node splitting)';
    case 'overlay':
      return '◻ Overlay (positioned divs)';
    default:
      return '';
  }
});

function parseSynonyms(): Record<string, string | string[]> | null {
  const raw = synonymsJson.value.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    synonymError.value = '';
    return parsed;
  } catch (e: any) {
    synonymError.value = e.message;
    return null;
  }
}

function parseIgnorePunctuation(): string[] {
  const raw = ignorePunctuation.value.trim();
  if (!raw) return [];
  return raw.split('').filter(Boolean);
}

function parseExclude(): string[] {
  const raw = excludeSelectors.value.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadMarkit() {
  if (markitModule) return;
  markitModule = await import('@markitjs/core');
}

async function applyHighlight() {
  await loadMarkit();
  if (!contentRef.value || !markitModule) return;

  if (markitInstance) {
    markitInstance.destroy();
    markitInstance = null;
  }

  if (!searchTerm.value) {
    matchCount.value = 0;
    elapsedMs.value = 0;
    activeRenderer.value = '';
    return;
  }

  markitInstance = markitModule.markit(contentRef.value);

  const synonyms = parseSynonyms();
  if (synonyms === null) return;

  const exclude = parseExclude();
  const punctuation = parseIgnorePunctuation();

  const opts: Record<string, any> = {
    renderer: renderer.value,
    caseSensitive: caseSensitive.value,
    ignoreDiacritics: ignoreDiacritics.value,
    accuracy: accuracy.value,
    separateWordSearch: separateWordSearch.value,
    acrossElements: acrossElements.value,
    wildcards: wildcards.value,
    ignoreJoiners: ignoreJoiners.value,
    element: element.value,
    className: className.value,
    highlightName: highlightName.value,
    debounce: debounceMs.value,
    batchSize: batchSize.value,
    debug: debugMode.value,
  };

  if (Object.keys(synonyms).length > 0) opts.synonyms = synonyms;
  if (exclude.length > 0) opts.exclude = exclude;
  if (punctuation.length > 0) opts.ignorePunctuation = punctuation;

  const start = performance.now();

  if (searchMode.value === 'regex') {
    try {
      const regex = new RegExp(searchTerm.value, regexFlags.value);
      markitInstance.markRegExp(regex, opts);
    } catch {
      matchCount.value = 0;
      elapsedMs.value = 0;
      return;
    }
  } else {
    markitInstance.mark(searchTerm.value, opts);
  }

  elapsedMs.value = Math.round((performance.now() - start) * 100) / 100;
  matchCount.value = markitInstance.getMatches().length;

  // Determine which renderer was actually used
  if (renderer.value === 'auto') {
    const hasHighlightApi = typeof CSS !== 'undefined' && 'highlights' in CSS;
    activeRenderer.value = hasHighlightApi ? 'highlight-api' : 'dom';
  } else {
    activeRenderer.value = renderer.value;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedHighlight() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    applyHighlight();
  }, 150);
}

watch(
  [
    searchTerm,
    searchMode,
    regexFlags,
    renderer,
    caseSensitive,
    ignoreDiacritics,
    accuracy,
    separateWordSearch,
    acrossElements,
    wildcards,
    ignoreJoiners,
    ignorePunctuation,
    excludeSelectors,
    synonymsJson,
    element,
    className,
    highlightName,
    debounceMs,
    batchSize,
    debugMode,
  ],
  () => {
    debouncedHighlight();
  },
);

onMounted(() => {
  loadMarkit();
});

onUnmounted(() => {
  if (markitInstance) markitInstance.destroy();
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="playground">
    <!-- Search bar -->
    <div class="controls">
      <div class="search-row">
        <div class="mode-toggle">
          <button :class="{ active: searchMode === 'keyword' }" @click="searchMode = 'keyword'">
            Keyword
          </button>
          <button :class="{ active: searchMode === 'regex' }" @click="searchMode = 'regex'">
            Regex
          </button>
        </div>
        <input
          v-model="searchTerm"
          type="text"
          :placeholder="searchMode === 'keyword' ? 'Type to search...' : 'Enter regex pattern...'"
          class="search-input"
        />
        <input
          v-if="searchMode === 'regex'"
          v-model="regexFlags"
          type="text"
          placeholder="gi"
          class="flags-input"
          title="Regex flags (e.g. gi, gim)"
        />
      </div>

      <div class="stats-row">
        <div class="stats">
          <span class="match-count">{{ matchCount }} matches</span>
          <span class="elapsed" v-if="elapsedMs > 0">{{ elapsedMs }}ms</span>
          <span class="renderer-badge" v-if="activeRenderer">{{ rendererLabel }}</span>
        </div>
      </div>

      <!-- Primary options row -->
      <div class="options-row primary">
        <label class="option">
          <span>Renderer</span>
          <select v-model="renderer">
            <option value="auto">Auto</option>
            <option value="highlight-api">Highlight API</option>
            <option value="dom">DOM</option>
            <option value="overlay">Overlay</option>
          </select>
        </label>

        <label class="option">
          <span>Accuracy</span>
          <select v-model="accuracy">
            <option value="partially">Partial</option>
            <option value="exactly">Exact</option>
            <option value="startsWith">Starts With</option>
            <option value="complementary">Complementary</option>
          </select>
        </label>

        <label class="option checkbox">
          <input type="checkbox" v-model="caseSensitive" />
          <span>Case Sensitive</span>
        </label>

        <label class="option checkbox">
          <input type="checkbox" v-model="ignoreDiacritics" />
          <span>Ignore Diacritics</span>
        </label>

        <label class="option checkbox">
          <input type="checkbox" v-model="separateWordSearch" />
          <span>Separate Words</span>
        </label>

        <label class="option checkbox">
          <input type="checkbox" v-model="acrossElements" />
          <span>Across Elements</span>
        </label>
      </div>

      <!-- Collapsible sections -->
      <div class="sections">
        <!-- Rendering section -->
        <div class="section">
          <button class="section-toggle" @click="showRendering = !showRendering">
            <span class="arrow" :class="{ open: showRendering }">▶</span>
            Rendering Options
          </button>
          <div v-if="showRendering" class="section-body">
            <label class="field">
              <span>Element tag</span>
              <input v-model="element" type="text" placeholder="mark" />
            </label>
            <label class="field">
              <span>CSS class</span>
              <input v-model="className" type="text" placeholder="markit-match" />
            </label>
            <label class="field">
              <span>Highlight name</span>
              <input v-model="highlightName" type="text" placeholder="markit-highlight" />
            </label>
          </div>
        </div>

        <!-- Advanced section -->
        <div class="section">
          <button class="section-toggle" @click="showAdvanced = !showAdvanced">
            <span class="arrow" :class="{ open: showAdvanced }">▶</span>
            Advanced Matching
          </button>
          <div v-if="showAdvanced" class="section-body">
            <label class="option">
              <span>Wildcards</span>
              <select v-model="wildcards">
                <option value="disabled">Disabled</option>
                <option value="enabled">Enabled</option>
                <option value="withSpaces">With Spaces</option>
              </select>
            </label>

            <label class="option checkbox">
              <input type="checkbox" v-model="ignoreJoiners" />
              <span>Ignore Joiners</span>
            </label>

            <label class="field">
              <span>Ignore Punctuation</span>
              <input
                v-model="ignorePunctuation"
                type="text"
                placeholder="e.g. :;.,-!?"
                title="Characters to ignore during matching"
              />
            </label>

            <label class="field">
              <span>Exclude Selectors</span>
              <input
                v-model="excludeSelectors"
                type="text"
                placeholder="e.g. .no-highlight, [data-skip]"
                title="Comma-separated CSS selectors to exclude"
              />
            </label>
          </div>
        </div>

        <!-- Synonyms section -->
        <div class="section">
          <button class="section-toggle" @click="showSynonyms = !showSynonyms">
            <span class="arrow" :class="{ open: showSynonyms }">▶</span>
            Synonyms
          </button>
          <div v-if="showSynonyms" class="section-body">
            <textarea
              v-model="synonymsJson"
              placeholder='{"JS": ["JavaScript", "TypeScript"]}'
              rows="3"
              class="json-input"
            ></textarea>
            <span v-if="synonymError" class="error-text">{{ synonymError }}</span>
            <span class="hint">JSON object mapping terms to synonym arrays</span>
          </div>
        </div>

        <!-- Performance section -->
        <div class="section">
          <button class="section-toggle" @click="showPerformance = !showPerformance">
            <span class="arrow" :class="{ open: showPerformance }">▶</span>
            Performance
          </button>
          <div v-if="showPerformance" class="section-body">
            <label class="field">
              <span>Debounce (ms)</span>
              <input v-model.number="debounceMs" type="number" min="0" step="50" />
            </label>
            <label class="field">
              <span>Batch size</span>
              <input v-model.number="batchSize" type="number" min="1" step="100" />
            </label>
            <label class="option checkbox">
              <input type="checkbox" v-model="debugMode" />
              <span>Debug (console logs)</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Content area -->
    <div ref="contentRef" class="content">
      <p v-for="(paragraph, i) in sampleText.split('\n\n')" :key="i">
        {{ paragraph }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.playground {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.controls {
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* --- Search row --- */
.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-toggle {
  display: flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.mode-toggle button {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.15s;
}

.mode-toggle button.active {
  background: var(--vp-c-brand-1);
  color: #fff;
}

.mode-toggle button:not(.active):hover {
  background: var(--vp-c-bg-mute);
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 14px;
  font-family: inherit;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.flags-input {
  width: 52px;
  padding: 8px 6px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 13px;
  font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  text-align: center;
}

.flags-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

/* --- Stats --- */
.stats-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.match-count {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.elapsed {
  color: var(--vp-c-text-3);
}

.renderer-badge {
  font-size: 11px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-mute);
  padding: 2px 8px;
  border-radius: 10px;
}

/* --- Options row --- */
.options-row.primary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.option {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.option select {
  padding: 4px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
}

.option.checkbox {
  cursor: pointer;
  user-select: none;
}

/* --- Collapsible sections --- */
.sections {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

.section-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: none;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: background 0.15s;
}

.section-toggle:hover {
  background: var(--vp-c-bg-mute);
}

.arrow {
  font-size: 9px;
  transition: transform 0.15s;
  display: inline-block;
}

.arrow.open {
  transform: rotate(90deg);
}

.section-body {
  padding: 10px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.field input {
  padding: 5px 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 13px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  width: 140px;
}

.field input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.field input[type='number'] {
  width: 90px;
}

.json-input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 12px;
  font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  resize: vertical;
}

.json-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.error-text {
  font-size: 11px;
  color: var(--vp-c-danger-1, #e53e3e);
}

.hint {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

/* --- Content area --- */
.content {
  padding: 20px;
  line-height: 1.7;
  font-size: 15px;
  color: var(--vp-c-text-1);
  max-height: 500px;
  overflow-y: auto;
  position: relative;
}

.content p {
  margin-bottom: 16px;
}

.content p:last-child {
  margin-bottom: 0;
}

/* DOM / Overlay renderer highlight styles */
:deep(.markit-match),
:deep([data-markit]) {
  background-color: #fef08a;
  color: #000;
  border-radius: 2px;
  padding: 1px 0;
}

:root.dark :deep(.markit-match),
:root.dark :deep([data-markit]) {
  background-color: #854d0e;
  color: #fef9c3;
}

/* CSS Custom Highlight API styles (::highlight must be global, not scoped) */
</style>

<style>
::highlight(markit-highlight) {
  background-color: #fef08a;
  color: #000;
}

:root.dark ::highlight(markit-highlight) {
  background-color: #854d0e;
  color: #fef9c3;
}
</style>
