import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'MarkIt',
  description: 'High-performance text highlighting for the modern web',
  base: '/markit/',

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

  themeConfig: {
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

    footer: {
      message:
        'Released under the MIT License. <span class="footer-india"><a href="https://madewithloveinindia.org" target="_blank">Made with <span aria-label="Love" style="color: #f43f5e">&hearts;</span> in India</a></span>',
    },
  },
});
