<script setup lang="ts">
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
  htmlAttrs: { lang: 'en' }
})

useSeoMeta({ title: 'Cook Book' })

const route = useRoute()
const showHeader = computed(() => route.path !== '/login')

// Hydrate the shared auth state once at the app root. SSR-fetched so
// the header dropdown paints correctly on first byte, no client-side
// flicker. Skipped on /login — user is unauthenticated by definition.
const { user } = useAuth()
if (route.path !== '/login') {
  const { data } = await useFetch<{ user: AuthUser }>('/api/auth/me')
  user.value = data.value?.user ?? null
}
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <AppHeader v-if="showHeader" />
    <NuxtPage />
    <ConfirmDialog />
  </UApp>
</template>
