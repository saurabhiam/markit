import type { MarkitPlugin, MarkitOptions, MatchResult, ResolvedMatch } from '../types.js';

/**
 * Central plugin bus that manages the plugin lifecycle.
 * Plugins are executed in registration order for each hook.
 */
export class PluginBus {
  private plugins: MarkitPlugin[] = [];

  register(plugin: MarkitPlugin): void {
    if (this.plugins.some((p) => p.name === plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }
    this.plugins.push(plugin);
  }

  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  beforeSearch(term: string, options: MarkitOptions): string {
    let result = term;
    for (const plugin of this.plugins) {
      if (plugin.beforeSearch) {
        result = plugin.beforeSearch(result, options);
      }
    }
    return result;
  }

  afterMatch(matches: MatchResult[], options: MarkitOptions): MatchResult[] {
    let result = matches;
    for (const plugin of this.plugins) {
      if (plugin.afterMatch) {
        result = plugin.afterMatch(result, options);
      }
    }
    return result;
  }

  beforeRender(matches: ResolvedMatch[], options: MarkitOptions): void {
    for (const plugin of this.plugins) {
      if (plugin.beforeRender) {
        plugin.beforeRender(matches, options);
      }
    }
  }

  afterRender(matchCount: number, options: MarkitOptions): void {
    for (const plugin of this.plugins) {
      if (plugin.afterRender) {
        plugin.afterRender(matchCount, options);
      }
    }
  }
}
