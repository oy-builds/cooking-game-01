// recipes.js — every ingredient, broth and bowl recipe of Lantern Ramen.
// An ingredient is raw until a station preps it; a bowl is a set of prepped
// items plus one broth. Recipes never name a real-world restaurant dish.
export const BROTHS = {
  shoyu: { id: 'shoyu', name: 'Shoyu', color: '#8a5a2b', dark: '#5e3a17' },
  miso: { id: 'miso', name: 'Miso', color: '#b5772e', dark: '#7d4f16' },
  spicy: { id: 'spicy', name: 'Spicy', color: '#c0392b', dark: '#7e1f14' },
};

// ingredient: where it is prepped, how long, what it becomes, its draw colour.
export const INGREDIENTS = {
  noodles: { id: 'noodles', name: 'Noodles', station: 'pot', prepTime: 4, color: '#f2d38a', icon: 'noodle' },
  chashu: { id: 'chashu', name: 'Chashu', station: 'grill', prepTime: 4, color: '#d98a5f', icon: 'chashu' },
  egg: { id: 'egg', name: 'Egg', station: 'board', prepTime: 2, color: '#fdf3d0', icon: 'egg' },
  corn: { id: 'corn', name: 'Corn', station: 'board', prepTime: 2, color: '#ffd94d', icon: 'corn' },
  mushroom: { id: 'mushroom', name: 'Mushroom', station: 'grill', prepTime: 3, color: '#c9a37e', icon: 'mushroom' },
  greens: { id: 'greens', name: 'Greens', station: 'board', prepTime: 2, color: '#7ec850', icon: 'greens' },
};

export const CRATE_ORDER = ['noodles', 'chashu', 'egg', 'corn', 'mushroom', 'greens'];

// A recipe is a broth plus the prepped items a bowl must hold. Order of
// adding does not matter; extra items make the bowl wrong.
export const RECIPES = [
  {
    id: 'shoyu-classic', name: 'Shoyu Classic', broth: 'shoyu',
    items: ['noodles', 'chashu', 'egg'], price: 14, color: '#e8b04b',
  },
  {
    id: 'miso-corn', name: 'Miso Corn', broth: 'miso',
    items: ['noodles', 'chashu', 'corn'], price: 15, color: '#d98a2b',
  },
  {
    id: 'spicy-tantan', name: 'Spicy Tan-Tan', broth: 'spicy',
    items: ['noodles', 'chashu', 'greens'], price: 16, color: '#e0523d',
  },
  {
    id: 'forest-veggie', name: 'Forest Veggie', broth: 'miso',
    items: ['noodles', 'mushroom', 'greens'], price: 13, color: '#8fbf5a',
  },
];

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

// True when a bowl's broth and item set equal the recipe exactly.
export function bowlMatchesRecipe(bowl, recipe) {
  if (!bowl || bowl.broth !== recipe.broth) return false;
  if (bowl.items.length !== recipe.items.length) return false;
  const have = [...bowl.items].sort().join(',');
  const want = [...recipe.items].sort().join(',');
  return have === want;
}

// The recipe a finished bowl matches, or null when it matches nothing.
export function recipeForBowl(bowl) {
  if (!bowl || !bowl.broth) return null;
  return RECIPES.find((r) => bowlMatchesRecipe(bowl, r)) || null;
}

// Which recipe an order ticket asks for, given the ticket's recipe id.
export function ticketRecipe(ticket) {
  return recipeById(ticket.recipeId);
}
