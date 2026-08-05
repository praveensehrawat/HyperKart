/**
 * Product Image Helper & High-Res Unsplash Preset Gallery
 * Provides dynamic high-resolution fallback images based on product categories & keywords.
 */

export const CATEGORY_PRESET_IMAGES = [
  {
    name: 'Artisan Coffee & Tea',
    category: 'Beverages',
    url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Fresh Artisan Bakery',
    category: 'Bakery',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Fresh Farm Produce',
    category: 'Fruits & Veggies',
    url: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Organic Milk & Dairy',
    category: 'Dairy',
    url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Gourmet Snacks & Chips',
    category: 'Snacks',
    url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Smart Gadgets & Electronics',
    category: 'Electronics',
    url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Daily Grocery Essentials',
    category: 'Grocery',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cold Refreshing Juices',
    category: 'Beverages',
    url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600&auto=format&fit=crop&q=80',
  },
]

/**
 * Returns a high-res image URL for any product object.
 * Falls back to category/keyword matching if no imageUrl is explicitly provided.
 */
export function getProductImage(product) {
  if (product?.imageUrl && product.imageUrl.trim().length > 5) {
    return product.imageUrl
  }

  const nameLower = (product?.name || '').toLowerCase()
  const catLower = (product?.category || '').toLowerCase()

  if (nameLower.includes('coffee') || nameLower.includes('latte') || nameLower.includes('tea') || catLower.includes('beverage')) {
    return 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80'
  }
  if (nameLower.includes('bread') || nameLower.includes('cake') || nameLower.includes('croissant') || catLower.includes('baker')) {
    return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80'
  }
  if (nameLower.includes('apple') || nameLower.includes('fruit') || nameLower.includes('mango') || nameLower.includes('banana') || catLower.includes('fruit')) {
    return 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600&auto=format&fit=crop&q=80'
  }
  if (nameLower.includes('milk') || nameLower.includes('butter') || nameLower.includes('paneer') || nameLower.includes('cheese') || catLower.includes('dairy')) {
    return 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&auto=format&fit=crop&q=80'
  }
  if (nameLower.includes('chip') || nameLower.includes('snack') || nameLower.includes('cookie') || catLower.includes('snack')) {
    return 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80'
  }
  if (nameLower.includes('phone') || nameLower.includes('gadget') || nameLower.includes('headphone') || catLower.includes('electronic')) {
    return 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80'
  }

  // General Grocery Default
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80'
}
