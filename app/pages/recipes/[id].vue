<script setup lang="ts">
type Tag = { id: number, label: string, color: string }
type RecipeTag = { tag_id: number, tag: Tag }
type Recipe = { id: number, title: string, content: string, tags: RecipeTag[], updated_at: string }

const route = useRoute()
const id = Number(route.params.id)

const recipe = ref<Recipe | null>(null)
const allTags = ref<Tag[]>([])
const editing = ref(false)
const editTitle = ref('')
const editContent = ref('')
const editTagIds = ref<number[]>([])
const saving = ref(false)
const { editorProps } = useEditorPaste()

async function fetchRecipe() {
  recipe.value = await $fetch<Recipe>(`/api/recipes/${id}`)
}

async function fetchTags() {
  allTags.value = await $fetch<Tag[]>('/api/tags')
}

function startEdit() {
  if (!recipe.value) return
  editTitle.value = recipe.value.title
  editContent.value = recipe.value.content
  editTagIds.value = recipe.value.tags.map(rt => rt.tag_id)
  editing.value = true
}

function toggleTag(tagId: number) {
  const idx = editTagIds.value.indexOf(tagId)
  if (idx >= 0) editTagIds.value.splice(idx, 1)
  else editTagIds.value.push(tagId)
}

async function saveEdit() {
  if (!editTitle.value.trim() || saving.value) return
  saving.value = true
  try {
    await $fetch(`/api/recipes/${id}`, {
      method: 'PUT',
      body: { title: editTitle.value, content: editContent.value, tagIds: editTagIds.value }
    })
    await fetchRecipe()
    editing.value = false
  } finally { saving.value = false }
}

async function deleteRecipe() {
  await $fetch(`/api/recipes/${id}`, { method: 'DELETE' })
  await navigateTo('/')
}

onMounted(() => { fetchRecipe(); fetchTags() })
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 py-8">
    <!-- Loading -->
    <div v-if="!recipe" class="space-y-4">
      <USkeleton class="h-8 w-64 rounded" />
      <USkeleton class="h-64 w-full rounded-xl" />
    </div>

    <!-- Edit mode -->
    <template v-else-if="editing">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold">Edit recipe</h1>
        <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" label="Cancel" @click="editing = false" />
      </div>

      <form class="space-y-4" @submit.prevent="saveEdit">
        <UInput v-model="editTitle" placeholder="Recipe title" size="lg" />

        <div v-if="allTags.length" class="flex flex-wrap gap-1.5">
          <button
            v-for="tag in allTags"
            :key="tag.id"
            type="button"
            class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
            :class="editTagIds.includes(tag.id)
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
            v-model="editContent"
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
          <UButton variant="ghost" color="neutral" label="Cancel" @click="editing = false" />
          <UButton type="submit" color="primary" icon="i-lucide-save" label="Save" :loading="saving" :disabled="!editTitle.trim()" />
        </div>
      </form>
    </template>

    <!-- View mode -->
    <template v-else>
      <div class="flex items-center justify-between mb-4">
        <UButton to="/" icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" label="Back" />
        <div class="flex gap-1">
          <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="sm" @click="startEdit" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm" @click="deleteRecipe" />
        </div>
      </div>

      <h1 class="text-2xl font-bold mb-3">{{ recipe.title }}</h1>

      <div v-if="recipe.tags.length" class="flex flex-wrap gap-1.5 mb-6">
        <span
          v-for="rt in recipe.tags"
          :key="rt.tag_id"
          class="px-2.5 py-1 rounded-full text-xs font-medium"
          :class="`bg-${rt.tag.color}-500/10 text-${rt.tag.color}-600 dark:text-${rt.tag.color}-400`"
        >{{ rt.tag.label }}</span>
      </div>

      <div class="prose prose-sm dark:prose-invert max-w-none">
        <MDC v-if="recipe.content" :value="recipe.content" />
        <p v-else class="text-muted italic">No content yet. Click edit to add a recipe.</p>
      </div>

      <p class="text-xs text-muted mt-8">
        Last updated: {{ new Date(recipe.updated_at).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' }) }}
      </p>
    </template>
  </div>
</template>
