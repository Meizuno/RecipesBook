<script setup lang="ts">
type Tag = { id: number, label: string, color: string }
type Recipe = { id: number, title: string, tagIds: number[], updated_at: string, snippet?: string | null }
type Meta = { total: number, hasMore: boolean }

const LIMIT = 20

const route = useRoute()

// URL query params are the source of truth for filter state. Sync both
// directions: URL → refs on browser nav, refs → URL on user toggle.
const parseTags = (raw: unknown): string[] =>
  (Array.isArray(raw) ? raw : raw ? [raw] : []).map(s => String(s).trim()).filter(Boolean)
const search = ref(String(route.query.search || ''))
const activeTags = ref<string[]>(parseTags(route.query.tags))

// Persist result state across SPA navigations so going
// home → recipe → home is instant (no re-stream).
const recipes = useState<Recipe[]>('home-recipes', () => [])
const hasMore = useState<boolean>('home-has-more', () => false)
const total = useState<number>('home-total', () => 0)

const loading = ref(false)
const loadingMore = ref(false)
const sentinel = ref<HTMLElement | null>(null)

let controller: AbortController | null = null

// Tags still SSR-fetched: small, fits the initial payload, and the
// list is needed before any recipe cards render to color the chips.
const { data: tags } = await useFetch<Tag[]>('/api/tags', { key: 'tags' })
const tagById = computed(() => new Map(tags.value?.map(t => [t.id, t]) ?? []))

async function streamRecipes(offset = 0, append = false) {
  controller?.abort()
  controller = new AbortController()
  const signal = controller.signal

  if (append) loadingMore.value = true
  else loading.value = true

  try {
    const params = new URLSearchParams()
    params.set('limit', String(LIMIT))
    params.set('offset', String(offset))
    if (search.value) params.set('search', search.value)
    for (const t of activeTags.value) params.append('tags', t)

    const res = await fetch(`/api/recipes?${params}`, { signal })
    if (!res.ok || !res.body) {
      console.error('[home] stream HTTP', res.status)
      return
    }

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buffer = ''
    let metaSeen = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (signal.aborted) {
        await reader.cancel()
        return
      }
      buffer += dec.decode(value, { stream: true })

      let nl = buffer.indexOf('\n')
      while (nl >= 0) {
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        if (line) {
          try {
            const record = JSON.parse(line) as { meta?: Meta, item?: Recipe }
            if (record.meta) {
              total.value = record.meta.total
              hasMore.value = record.meta.hasMore
              // Clear/replace the list right when meta lands so we
              // don't flash stale results while items stream in.
              if (!append) recipes.value = []
              loading.value = false
              metaSeen = true
            }
            else if (record.item) {
              if (!metaSeen && !append) {
                // Defensive — server should always emit meta first.
                recipes.value = []
                loading.value = false
                metaSeen = true
              }
              recipes.value.push(record.item)
            }
          }
          catch { /* skip malformed line */ }
        }
        nl = buffer.indexOf('\n')
      }
    }
  }
  catch (e) {
    if ((e as Error).name === 'AbortError') return
    console.error('[home] stream failed:', e)
  }
  finally {
    if (!signal.aborted) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  streamRecipes(recipes.value.length, true)
}

// Pull URL → refs when query changes externally (browser back/forward,
// brand-link click clearing the query, etc.).
watch(() => route.query, (q) => {
  const urlSearch = String(q.search || '')
  const urlTags = parseTags(q.tags)
  if (urlSearch !== search.value) search.value = urlSearch
  if (urlTags.join(' ') !== activeTags.value.join(' ')) activeTags.value = urlTags
})

// Push refs → URL and re-stream on filter change.
watch([search, activeTags], () => {
  const q: Record<string, string | string[]> = {}
  if (search.value) q.search = search.value
  if (activeTags.value.length) q.tags = activeTags.value
  navigateTo({ query: q }, { replace: true })
  streamRecipes()
})

// Initial load (only if useState didn't already preserve a list from
// a previous SPA visit to this page).
onMounted(() => {
  if (!recipes.value.length) streamRecipes()
})

// Infinite scroll
if (import.meta.client) {
  onMounted(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '200px' }
    )
    watch(sentinel, (el) => {
      if (el) observer.observe(el)
    }, { immediate: true })
    onUnmounted(() => observer.disconnect())
  })
}

onBeforeUnmount(() => controller?.abort())

const { confirm } = useConfirm()

async function deleteRecipe(id: number) {
  const recipe = recipes.value.find(r => r.id === id)
  const ok = await confirm({
    title: 'Delete recipe?',
    description: recipe ? `"${recipe.title}" will be removed. This cannot be undone.` : 'This cannot be undone.',
    confirmLabel: 'Delete'
  })
  if (!ok) return
  await $fetch(`/api/recipes/${id}`, { method: 'DELETE' })
  recipes.value = recipes.value.filter(r => r.id !== id)
  total.value--
}

function toggleTag(label: string) {
  activeTags.value = activeTags.value.includes(label)
    ? activeTags.value.filter(t => t !== label)
    : [...activeTags.value, label]
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-4">
    <!-- Search + tag filter -->
    <div class="space-y-3 mb-4">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Search recipes…" />
      <div v-if="tags?.length" class="flex flex-wrap gap-1.5">
        <button
          v-for="tag in tags"
          :key="tag.id"
          class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
          :class="activeTags.includes(tag.label)
            ? `bg-${tag.color}-500 text-white`
            : `bg-${tag.color}-500/10 text-${tag.color}-600 dark:text-${tag.color}-400 hover:bg-${tag.color}-500/20`"
          @click="toggleTag(tag.label)"
        >
          {{ tag.label }}
        </button>
      </div>
      <p v-if="total > 0" class="text-xs text-muted">{{ total }} recipe{{ total === 1 ? '' : 's' }}</p>
    </div>

    <!-- Recipe list -->
    <div v-if="loading && !recipes.length" class="space-y-3">
      <USkeleton v-for="i in 5" :key="i" class="h-14 w-full rounded-xl" />
    </div>
    <div v-else class="space-y-2">
      <TransitionGroup name="card" tag="div" class="space-y-2">
        <NuxtLink
          v-for="recipe in recipes"
          :key="recipe.id"
          :to="`/recipes/${recipe.id}`"
          class="block rounded-xl border border-default p-4 hover:bg-elevated transition-colors card"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-sm truncate">{{ recipe.title }}</p>
              <p v-if="recipe.snippet" class="text-xs text-muted mt-1 line-clamp-2">{{ recipe.snippet }}</p>
              <div v-if="recipe.tagIds.length" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="id in recipe.tagIds"
                  :key="id"
                  class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                  :class="tagById.get(id) ? `bg-${tagById.get(id)!.color}-500/10 text-${tagById.get(id)!.color}-600 dark:text-${tagById.get(id)!.color}-400` : ''"
                >{{ tagById.get(id)?.label }}</span>
              </div>
            </div>
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click.prevent="deleteRecipe(recipe.id)"
            />
          </div>
        </NuxtLink>
      </TransitionGroup>

      <div ref="sentinel" class="h-1" />

      <div v-if="loadingMore" class="flex justify-center py-4">
        <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
      </div>

      <p v-if="!recipes.length && !loading" class="text-sm text-muted text-center py-12">
        No recipes found. Create your first one!
      </p>
    </div>
  </div>
</template>

<style scoped>
.card-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.card-enter-active {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}
</style>
