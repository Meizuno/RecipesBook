import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const USER_ID = 'seed-user'

async function main() {
  // Clean existing seed data
  await db.recipeTag.deleteMany({ where: { recipe: { user_id: USER_ID } } })
  await db.recipe.deleteMany({ where: { user_id: USER_ID } })
  await db.tag.deleteMany({ where: { user_id: USER_ID } })

  // Tags
  const tags = await Promise.all([
    db.tag.create({ data: { user_id: USER_ID, label: 'Breakfast', color: 'amber', position: 0 } }),
    db.tag.create({ data: { user_id: USER_ID, label: 'Lunch', color: 'emerald', position: 1 } }),
    db.tag.create({ data: { user_id: USER_ID, label: 'Dinner', color: 'violet', position: 2 } }),
    db.tag.create({ data: { user_id: USER_ID, label: 'Dessert', color: 'pink', position: 3 } }),
    db.tag.create({ data: { user_id: USER_ID, label: 'Quick', color: 'cyan', position: 4 } }),
    db.tag.create({ data: { user_id: USER_ID, label: 'Vegetarian', color: 'lime', position: 5 } }),
    db.tag.create({ data: { user_id: USER_ID, label: 'Czech', color: 'rose', position: 6 } }),
  ])

  const [breakfast, lunch, dinner, dessert, quick, vegetarian, czech] = tags

  // Recipes
  const recipes = [
    {
      title: 'Classic Pancakes',
      tags: [breakfast, quick],
      content: `## Ingredients

- 200g all-purpose flour
- 2 eggs
- 300ml milk
- 2 tbsp sugar
- 1 tsp baking powder
- Pinch of salt
- Butter for frying

## Instructions

1. Whisk flour, sugar, baking powder and salt in a bowl
2. Make a well in the center, add eggs and milk
3. Whisk until smooth — a few lumps are fine
4. Heat butter in a pan over medium heat
5. Pour ~60ml batter per pancake
6. Cook until bubbles form on surface, flip and cook 1 more minute

## Notes

- Serve with maple syrup, fresh berries, or Nutella
- Batter rests 10 min for fluffier pancakes`
    },
    {
      title: 'Svíčková na smetaně',
      tags: [dinner, czech],
      content: `## Ingredients

### Meat
- 800g beef sirloin
- Salt, pepper

### Sauce
- 2 carrots
- 1 parsley root
- 1/2 celeriac
- 1 onion
- 200ml heavy cream
- 100ml beef broth
- 2 tbsp flour
- 2 bay leaves
- 5 allspice berries
- 1 tsp sugar
- 2 tbsp vinegar
- 50g butter

### Sides
- 8 bread dumplings (knedlíky)
- Cranberry sauce
- Lemon slice

## Instructions

1. Season beef with salt and pepper, sear on all sides in butter
2. Dice all vegetables, add to pot with the meat
3. Add bay leaves, allspice, broth, and enough water to cover
4. Simmer covered for **2 hours** until tender
5. Remove meat, blend vegetables into smooth sauce
6. Add cream, flour mixed with cold water, sugar, and vinegar
7. Simmer sauce for 15 minutes, strain if needed
8. Slice meat, pour sauce over, serve with dumplings

## Notes

- Traditional Czech Sunday dish
- The sauce should be thick and creamy
- Always serve with a slice of lemon and cranberry sauce on the side`
    },
    {
      title: 'Greek Salad',
      tags: [lunch, quick, vegetarian],
      content: `## Ingredients

- 4 ripe tomatoes, cut into chunks
- 1 cucumber, sliced
- 1 red onion, thinly sliced
- 200g feta cheese, cubed
- 100g Kalamata olives
- 1 green bell pepper, sliced
- 3 tbsp extra virgin olive oil
- 1 tbsp red wine vinegar
- 1 tsp dried oregano
- Salt and pepper

## Instructions

1. Combine tomatoes, cucumber, onion, pepper, and olives in a bowl
2. Top with feta cubes
3. Drizzle with olive oil and vinegar
4. Sprinkle with oregano, salt, and pepper
5. **Do not toss** — serve as is

## Notes

- Best with summer tomatoes
- No lettuce in authentic Greek salad
- Pairs well with crusty bread`
    },
    {
      title: 'Banana Bread',
      tags: [dessert, vegetarian],
      content: `## Ingredients

- 3 ripe bananas, mashed
- 80g melted butter
- 150g sugar
- 1 egg
- 1 tsp vanilla extract
- 1 tsp baking soda
- Pinch of salt
- 190g all-purpose flour
- Optional: 60g walnuts or chocolate chips

## Instructions

1. Preheat oven to **175°C**
2. Mix mashed bananas with melted butter
3. Add sugar, egg, and vanilla, stir well
4. Add baking soda and salt
5. Fold in flour until just combined — do not overmix
6. Add walnuts or chocolate chips if using
7. Pour into greased loaf pan
8. Bake for **55–65 minutes** until toothpick comes out clean
9. Cool in pan for 10 minutes, then transfer to wire rack

## Notes

- The riper the bananas, the better the flavor
- Keeps well wrapped for 3–4 days
- Great for using up overripe bananas`
    },
    {
      title: 'Garlic Butter Pasta',
      tags: [dinner, quick, vegetarian],
      content: `## Ingredients

- 400g spaghetti
- 6 cloves garlic, thinly sliced
- 80g butter
- 1/4 tsp red pepper flakes
- 60g Parmesan, grated
- Fresh parsley, chopped
- Salt and pepper
- Reserved pasta water

## Instructions

1. Cook spaghetti in salted water until al dente, **reserve 1 cup pasta water**
2. In a large pan, melt butter over medium-low heat
3. Add sliced garlic, cook until golden (not brown!) — about 2 minutes
4. Add red pepper flakes
5. Toss in drained pasta with 1/2 cup pasta water
6. Add Parmesan, toss until creamy — add more pasta water if needed
7. Season with salt, pepper, and fresh parsley

## Notes

- Total time: **15 minutes**
- The key is slicing garlic thin and not burning it
- Add a squeeze of lemon for brightness`
    },
    {
      title: 'Trdelník',
      tags: [dessert, czech],
      content: `## Ingredients

- 500g all-purpose flour
- 7g dry yeast
- 200ml warm milk
- 80g sugar
- 80g butter, softened
- 2 egg yolks
- 1 tsp vanilla extract
- Pinch of salt

### Coating
- 100g sugar
- 50g ground walnuts
- 1 tsp cinnamon

## Instructions

1. Dissolve yeast in warm milk with 1 tsp sugar, let sit 10 min
2. Mix flour, sugar, salt in a bowl
3. Add yeast mixture, egg yolks, vanilla, and softened butter
4. Knead for 10 minutes until smooth and elastic
5. Cover, let rise for **1 hour**
6. Roll dough into long strips (~2cm wide)
7. Wrap strips around a wooden or metal cylinder
8. Grill or bake at **190°C** for 15–20 minutes, rotating
9. While hot, roll in cinnamon-walnut-sugar mixture

## Notes

- Traditional Czech street food, popular at Christmas markets
- Can fill with Nutella, ice cream, or whipped cream
- Best eaten warm and fresh`
    },
  ]

  for (const { title, content, tags: recipeTags } of recipes) {
    const recipe = await db.recipe.create({
      data: { user_id: USER_ID, title, content }
    })
    for (const tag of recipeTags) {
      await db.recipeTag.create({ data: { recipe_id: recipe.id, tag_id: tag.id } })
    }
  }

  console.log(`Seeded ${tags.length} tags and ${recipes.length} recipes`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
