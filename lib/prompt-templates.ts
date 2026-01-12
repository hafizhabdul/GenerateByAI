/**
 * Prompt Templates Library
 * Curated prompts for quick start generation
 * Categories: Nusantara, Portrait, Product, Landscape, Abstract
 */

export interface PromptTemplate {
    id: string;
    title: string;
    prompt: string;
    category: PromptCategory;
    tags: string[];
    preview?: string; // Preview image URL (optional)
    popular?: boolean;
}

export type PromptCategory =
    | "nusantara"
    | "portrait"
    | "product"
    | "landscape"
    | "abstract"
    | "anime"
    | "fantasy";

export const CATEGORY_LABELS: Record<PromptCategory, string> = {
    nusantara: "Nusantara",
    portrait: "Portrait",
    product: "Product",
    landscape: "Landscape",
    abstract: "Abstract",
    anime: "Anime",
    fantasy: "Fantasy",
};

export const CATEGORY_ICONS: Record<PromptCategory, string> = {
    nusantara: "mingcute:leaf-3-fill",
    portrait: "mingcute:user-4-fill",
    product: "mingcute:box-3-fill",
    landscape: "mingcute:mountain-2-fill",
    abstract: "mingcute:palette-fill",
    anime: "mingcute:star-fill",
    fantasy: "mingcute:magic-1-fill",
};

/**
 * Curated prompt templates
 */
export const PROMPT_TEMPLATES: PromptTemplate[] = [
    // === NUSANTARA ===
    {
        id: "batik-modern",
        title: "Batik Modern",
        prompt: "Modern batik pattern with geometric shapes, traditional Javanese motifs, earthy brown and copper colors, seamless textile design, high detail",
        category: "nusantara",
        tags: ["batik", "pattern", "traditional"],
        popular: true,
    },
    {
        id: "wayang-hero",
        title: "Wayang Hero",
        prompt: "Epic wayang kulit shadow puppet character, Indonesian mythology hero, intricate golden details, dramatic lighting, dark background with mystical aura",
        category: "nusantara",
        tags: ["wayang", "mythology", "hero"],
        popular: true,
    },
    {
        id: "raja-ampat",
        title: "Raja Ampat Paradise",
        prompt: "Stunning aerial view of Raja Ampat islands, crystal clear turquoise water, lush green islands, coral reefs visible, cinematic photography, golden hour lighting",
        category: "nusantara",
        tags: ["landscape", "indonesia", "ocean"],
    },
    {
        id: "borobudur-sunrise",
        title: "Borobudur Sunrise",
        prompt: "Majestic Borobudur temple at sunrise, misty atmosphere, volcanic mountains in background, ancient Buddhist stupas, dramatic golden light, National Geographic style",
        category: "nusantara",
        tags: ["temple", "sunrise", "heritage"],
    },
    {
        id: "rendang-plating",
        title: "Rendang Gourmet",
        prompt: "Beautifully plated beef rendang, traditional Padang cuisine, garnished with fried shallots and lime leaves, rustic wooden plate, food photography, warm lighting",
        category: "nusantara",
        tags: ["food", "culinary", "padang"],
    },

    // === PORTRAIT ===
    {
        id: "portrait-cinematic",
        title: "Cinematic Portrait",
        prompt: "Professional portrait photography, dramatic rim lighting, shallow depth of field, neutral background, sharp focus on eyes, magazine quality",
        category: "portrait",
        tags: ["photography", "professional", "lighting"],
        popular: true,
    },
    {
        id: "portrait-artistic",
        title: "Artistic Portrait",
        prompt: "Artistic portrait with creative makeup, avant-garde fashion, studio lighting with colored gels, high fashion editorial style, Vogue magazine aesthetic",
        category: "portrait",
        tags: ["fashion", "editorial", "creative"],
    },
    {
        id: "portrait-natural",
        title: "Natural Light Portrait",
        prompt: "Beautiful natural light portrait, golden hour sunlight, soft bokeh background, candid expression, warm skin tones, lifestyle photography",
        category: "portrait",
        tags: ["natural", "golden hour", "candid"],
    },

    // === PRODUCT ===
    {
        id: "product-cosmetic",
        title: "Luxury Cosmetic",
        prompt: "Luxury cosmetic product photography, elegant packaging, soft gradient background, studio lighting with reflections, premium beauty brand aesthetic, high-end commercial",
        category: "product",
        tags: ["cosmetic", "luxury", "commercial"],
        popular: true,
    },
    {
        id: "product-tech",
        title: "Tech Product",
        prompt: "Sleek technology product floating in space, minimalist design, dramatic lighting, dark background with subtle glow, Apple-style product photography",
        category: "product",
        tags: ["technology", "minimalist", "floating"],
    },
    {
        id: "product-food",
        title: "Food Product",
        prompt: "Appetizing food product photography, fresh ingredients scattered around, rustic wooden surface, natural lighting, Instagram-worthy composition",
        category: "product",
        tags: ["food", "fresh", "rustic"],
    },
    {
        id: "product-fashion",
        title: "Fashion Flatlay",
        prompt: "Stylish fashion flatlay, premium clothing items arranged aesthetically, minimalist white marble background, soft shadows, e-commerce product photography",
        category: "product",
        tags: ["fashion", "flatlay", "ecommerce"],
    },

    // === LANDSCAPE ===
    {
        id: "landscape-mountain",
        title: "Mountain Majesty",
        prompt: "Breathtaking mountain landscape, snow-capped peaks, dramatic clouds, golden hour lighting, ultra wide angle, National Geographic quality, 8K resolution",
        category: "landscape",
        tags: ["mountain", "nature", "epic"],
        popular: true,
    },
    {
        id: "landscape-forest",
        title: "Enchanted Forest",
        prompt: "Mystical forest with sunlight streaming through trees, morning mist, lush green foliage, magical atmosphere, fantasy nature photography",
        category: "landscape",
        tags: ["forest", "mystical", "nature"],
    },
    {
        id: "landscape-ocean",
        title: "Ocean Sunset",
        prompt: "Dramatic ocean sunset, vibrant orange and purple sky, silky smooth water long exposure effect, rocky coastline, seascape photography masterpiece",
        category: "landscape",
        tags: ["ocean", "sunset", "dramatic"],
    },

    // === ABSTRACT ===
    {
        id: "abstract-fluid",
        title: "Fluid Art",
        prompt: "Abstract fluid art, vibrant swirling colors, metallic gold accents, marble texture, luxury aesthetic, 4K wallpaper quality",
        category: "abstract",
        tags: ["fluid", "colorful", "luxury"],
        popular: true,
    },
    {
        id: "abstract-geometric",
        title: "Geometric Shapes",
        prompt: "Modern geometric abstract art, clean lines, bold primary colors, Bauhaus inspired, minimalist composition, contemporary art gallery piece",
        category: "abstract",
        tags: ["geometric", "modern", "minimalist"],
    },
    {
        id: "abstract-neon",
        title: "Neon Dreams",
        prompt: "Abstract neon light trails, vibrant pink and cyan colors, futuristic cyber aesthetic, long exposure effect, dark background with glowing elements",
        category: "abstract",
        tags: ["neon", "futuristic", "cyber"],
    },

    // === ANIME ===
    {
        id: "anime-character",
        title: "Anime Character",
        prompt: "Beautiful anime character, detailed eyes, flowing hair, dynamic pose, studio ghibli inspired, soft pastel colors, high quality illustration",
        category: "anime",
        tags: ["character", "illustration", "ghibli"],
        popular: true,
    },
    {
        id: "anime-scene",
        title: "Anime Scene",
        prompt: "Stunning anime landscape scene, cherry blossom trees, traditional Japanese architecture, sunset sky with clouds, Makoto Shinkai style, cinematic composition",
        category: "anime",
        tags: ["landscape", "japanese", "shinkai"],
    },
    {
        id: "anime-mecha",
        title: "Mecha Robot",
        prompt: "Epic mecha robot, highly detailed mechanical design, battle pose, dramatic lighting, anime style, Gundam inspired, explosive background",
        category: "anime",
        tags: ["mecha", "robot", "action"],
    },

    // === FANTASY ===
    {
        id: "fantasy-dragon",
        title: "Majestic Dragon",
        prompt: "Majestic dragon flying over mountain peaks, detailed scales, massive wings spread, fire breath, epic fantasy art, dramatic storm clouds, cinematic lighting",
        category: "fantasy",
        tags: ["dragon", "epic", "mythical"],
        popular: true,
    },
    {
        id: "fantasy-castle",
        title: "Fantasy Castle",
        prompt: "Magnificent fantasy castle on floating island, magical crystals, waterfalls, ethereal lighting, concept art quality, detailed architecture, dreamlike atmosphere",
        category: "fantasy",
        tags: ["castle", "magical", "floating"],
    },
    {
        id: "fantasy-wizard",
        title: "Mystical Wizard",
        prompt: "Powerful wizard casting spell, magical energy swirling, ancient robes and staff, mystical runes glowing, dark fantasy art, dramatic composition",
        category: "fantasy",
        tags: ["wizard", "magic", "dark"],
    },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: PromptCategory): PromptTemplate[] {
    return PROMPT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get popular templates
 */
export function getPopularTemplates(): PromptTemplate[] {
    return PROMPT_TEMPLATES.filter(t => t.popular);
}

/**
 * Get all categories with count
 */
export function getCategoriesWithCount(): { category: PromptCategory; count: number; label: string; icon: string }[] {
    const categories = Object.keys(CATEGORY_LABELS) as PromptCategory[];
    return categories.map(category => ({
        category,
        count: PROMPT_TEMPLATES.filter(t => t.category === category).length,
        label: CATEGORY_LABELS[category],
        icon: CATEGORY_ICONS[category],
    }));
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): PromptTemplate[] {
    const q = query.toLowerCase();
    return PROMPT_TEMPLATES.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.prompt.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
    );
}

/**
 * Get random templates
 */
export function getRandomTemplates(count: number = 4): PromptTemplate[] {
    const shuffled = [...PROMPT_TEMPLATES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
