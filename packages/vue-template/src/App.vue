<script setup lang="ts">
import RemoteCard from './RemoteCard/index.vue'
</script>

<template>
  <div class="app">
    <header class="appHeader">
      <span class="eyebrow">dev-to template</span>
      <h1>Component preview</h1>
      <p class="subtitle">
        Vite dev server with <code class="appCode">@dev-to/vue-plugin</code>
      </p>
    </header>

    <section class="preview">
      <div class="previewInner">
        <RemoteCard />
      </div>
    </section>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  text-align: center;
}

.appHeader {
  max-width: 720px;
}

.appHeader h1 {
  margin: 4px 0 6px;
  font-size: 32px;
  line-height: 1.2;
}

.eyebrow {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #4b5563;
}

.subtitle {
  font-size: 13px;
  color: #6b7280;
}

.appCode {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 12px;
}

.preview {
  width: min(720px, 94vw);
}

.previewInner {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 28px 22px;
}
</style>
