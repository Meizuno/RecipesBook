<script setup lang="ts">
type Tag = { id: number, label: string, color: string }

const title = ref('')
const content = ref('')
const selectedTagIds = ref<number[]>([])
const tags = ref<Tag[]>([])
const saving = ref(false)
const { editorProps } = useEditorPaste()

async function fetchTags() {
  tags.value = await $fetch<Tag[]>('/api/tags')
}

function toggleTag(id: number) {
  const idx = selectedTagIds.value.indexOf(id)
  if (idx >= 0) selectedTagIds.value.splice(idx, 1)
  else selectedTagIds.value.push(id)
}

async function save() {
  if (!title.value.trim() || saving.value) return
  saving.value = true
  try {
    const recipe = await $fetch<{ id: number }>('/api/recipes', {
      method: 'POST',
      body: { title: title.value, content: content.value, tagIds: selectedTagIds.value }
    })
    await navigateTo(`/recipes/${recipe.id}`)
  } finally { saving.value = false }
}

onMounted(fetchTags)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-xl font-bold">New recipe</h1>
      <UButton to="/" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" label="Back" />
    </div>

    <form class="space-y-4" @submit.prevent="save">
      <UInput v-model="title" placeholder="Recipe title" size="lg" />

      <!-- Tags -->
      <div v-if="tags.length" class="flex flex-wrap gap-1.5">
        <button
          v-for="tag in tags"
          :key="tag.id"
          type="button"
          class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
          :class="selectedTagIds.includes(tag.id)
            ? `bg-${tag.color}-500 text-white`
            : `bg-${tag.color}-500/10 text-${tag.color}-600 dark:text-${tag.color}-400 hover:bg-${tag.color}-500/20`"
          @click="toggleTag(tag.id)"
        >
          {{ tag.label }}
        </button>
      </div>

      <!-- Rich text editor -->
      <div class="rounded-xl border border-default overflow-hidden min-h-96">
        <UEditor
          v-model="content"
          content-type="markdown"
          placeholder="Write your recipe…"
          class="min-h-96"
          :image="{ allowBase64: true, inline: true }"
          :editor-props="editorProps"
        >
          <template #default="{ editor }">
            <UEditorToolbar :editor="editor" />
          </template>
        </UEditor>
      </div>

      <div class="flex justify-end gap-2">
        <UButton to="/" variant="ghost" color="neutral" label="Cancel" />
        <UButton type="submit" color="primary" icon="i-lucide-save" label="Save recipe" :loading="saving" :disabled="!title.trim()" />
      </div>
    </form>
  </div>
</template>
