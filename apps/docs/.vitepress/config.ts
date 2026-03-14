import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
  defineConfig({
    title: 'MarkIt',
    description: 'High-performance text highlighting for the modern web',
    base: '/',
    cleanUrls: true,
    head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

    themeConfig: {
      search: {
        provider: 'local',
      },

      nav: [
        { text: 'Guide', link: '/guide/getting-started' },
        { text: 'API', link: '/guide/core-api' },
        { text: 'Playground', link: '/playground/' },
      ],

      sidebar: {
        '/guide/': [
          {
            text: 'Introduction',
            items: [
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Core API', link: '/guide/core-api' },
            ],
          },
          {
            text: 'Framework Integration',
            items: [
              { text: 'Angular', link: '/guide/angular' },
              { text: 'React / Next.js', link: '/guide/react' },
              { text: 'Framework lifecycles', link: '/guide/framework-lifecycles' },
            ],
          },
          {
            text: 'Advanced',
            items: [
              { text: 'Performance', link: '/guide/performance' },
              { text: 'Plugins', link: '/guide/plugins' },
            ],
          },
        ],
      },

      socialLinks: [{ icon: 'github', link: 'https://github.com/saurabhiam/markit' }],

      // Footer content is rendered via theme Layout.vue (layout-bottom slot) so it
      // appears on all pages including doc pages with sidebar. No themeConfig.footer.
    },
  }),
);
