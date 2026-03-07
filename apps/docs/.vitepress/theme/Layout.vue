<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-bottom>
      <footer class="VPFooter docs-global-footer">
        <div class="footer-content">
          <p class="footer-message">
            ©2026,
            <a href="https://saurabhsharma.me" target="_blank" rel="noopener">Saurabh Sharma</a>
            · All rights reserved. Released under the
            <a
              href="https://github.com/saurabhiam/markit/blob/main/LICENSE"
              target="_blank"
              rel="noopener"
              >MIT License</a
            >.
            <br />
            <span class="footer-india">
              <a href="https://madewithloveinindia.org" target="_blank" rel="noopener"
                >Made with <span aria-label="Love" class="footer-heart">&hearts;</span> in India</a
              >
            </span>
          </p>
        </div>
      </footer>
    </template>
  </DefaultTheme.Layout>
</template>

<style scoped>
.docs-global-footer {
  padding: 1rem 24px;
  text-align: center;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.footer-content {
  max-width: var(--vp-screen-max-width);
  margin: 0 auto;
}

.footer-message {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.footer-message a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 500;
}

.footer-message a:hover {
  text-decoration: underline;
}

.footer-india {
  margin-left: 0.5rem;
}

.footer-india a {
  color: var(--vp-c-text-2) !important;
}

.footer-india a:hover {
  color: var(--vp-c-text-1) !important;
}

.footer-heart {
  color: #f43f5e;
}
</style>
