<script setup lang="ts">
import { computed, ref } from 'vue'
import devtoLogo from '../assets/devto.svg'
import vueLogo from '../assets/vue.svg'

const props = defineProps<{ title?: string }>()
const count = ref(0)
const title = computed(() => props.title || 'DevTo + Vite + Vue')
</script>

<template>
  <div class="component">
    <div class="logoRow">
      <a href="https://github.com/YangYongAn/dev-to" target="_blank" rel="noreferrer">
        <img :src="devtoLogo" class="logoDevto" alt="dev-to logo" />
      </a>
      <a href="https://vuejs.org" target="_blank" rel="noreferrer">
        <img :src="vueLogo" class="logo" alt="Vue logo" />
      </a>
    </div>
    <h1>{{ title }}</h1>
    <p class="subtitle">
      Remote component served by <code class="code">@dev-to/vue-plugin</code>
    </p>
    <div class="counterCard">
      <button type="button" @click="count += 1">
        count is {{ count }}
      </button>
      <p>
        Edit <code class="code">src/RemoteCard/index.vue</code> to test HMR
      </p>
    </div>
  </div>
</template>

<style scoped>
.component {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px 12px 28px;
  text-align: center;
}

.logoRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 18px;
}

.logo,
.logoDevto {
  height: 48px;
}

.logoDevto {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.35);
}

.subtitle {
  margin: 8px auto 18px;
  max-width: 520px;
  font-size: 13px;
  color: #6b7280;
}

.counterCard {
  margin: 18px auto;
  padding: 20px 18px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.counterCard button {
  border: 1px solid rgba(15, 118, 110, 0.5);
  border-radius: 999px;
  padding: 8px 22px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  background: linear-gradient(135deg, #10b981, #0ea5a0 55%, #0d9488);
  cursor: pointer;
}

.counterCard p {
  margin: 14px 0 0;
  font-size: 11px;
  color: #64748b;
}

.code {
  background: #e2e8f0;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}
</style>
