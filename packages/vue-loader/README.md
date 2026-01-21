# @dev-to/vue-loader

Vue host-side loader that mounts remote Vue components served by a DevTo-enabled Vite server.

## Usage

```vue
<script setup lang="ts">
import { VueLoader } from '@dev-to/vue-loader'
</script>

<template>
  <VueLoader
    origin="http://localhost:5173"
    name="MyCard"
    :component-props="{ title: 'Hello' }"
  />
</template>
```
