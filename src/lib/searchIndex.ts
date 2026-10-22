import type { Product } from '../types';

export interface IngredientMeta {
  name: string;
  koreanName: string;
  description: string;
  benefits: string[];
  skinTypes: string[];
}

export const HANBANG_INGREDIENT_DATABASE: Record<string, IngredientMeta> = {
  'Centella Asiatica': {
    name: 'Centella Asiatica (Cica / 병풀)',
    koreanName: '병풀추출물',
    description: 'Legendary calming herb known as Tiger Grass. Rapidly soothes inflammation, repairs compromised skin barriers, and accelerates blemish healing.',
    benefits: ['Calming', 'Redness Reduction', 'Barrier Repair', 'Acne Soothing'],
    skinTypes: ['Sensitive', 'Acne-Prone', 'Irritated', 'All Skin Types']
  },
  'Korean Red Ginseng': {
    name: 'Korean Red Ginseng (홍삼)',
    koreanName: '6년근 홍삼',
    description: '6-year matured Ginseng rich in saponins and ginsenosides. Boosts microcirculation, firms skin elasticity, and provides deep cellular antioxidant defense.',
    benefits: ['Anti-Aging', 'Firming', 'Cellular Energy', 'Deep Radiance'],
    skinTypes: ['Mature', 'Dull', 'Tired', 'Dry']
  },
  'Rice Ferment Filtrate': {
    name: 'Rice Ferment Filtrate (Galactomyces / 쌀발효)',
    koreanName: '쌀겨추출발효물',
    description: 'Traditional royal Joseon court beauty secret. Packed with amino acids and minerals to soften texture, minimize pores, and impart glass-skin glow.',
    benefits: ['Pore Refining', 'Glass Skin Glow', 'Smoothing', 'Even Tone'],
    skinTypes: ['Uneven', 'Rough', 'Dull', 'Combination']
  },
  'Niacinamide 15%': {
    name: 'Niacinamide (Vitamin B3 / 나이아신아마이드)',
    koreanName: '고함량 나이아신아마이드',
    description: 'High-potency clinical Vitamin B3 that blocks melanin transfer, fades stubborn hyperpigmentation, and regulates sebum production.',
    benefits: ['Whitening & Brightening', 'Dark Spot Correction', 'Oil Balancing'],
    skinTypes: ['Hyperpigmented', 'Oily', 'Blemish-Prone']
  },
  'Ceramide NP': {
    name: '5-Ceramide Multi Complex (세라마이드)',
    koreanName: '고농축 5중 세라마이드',
    description: 'Skin-identical lipid molecules that lock in moisture and reinforce the stratum corneum barrier against environmental pollution.',
    benefits: ['Moisture Lock', 'Barrier Strengthening', 'Anti-Flaking'],
    skinTypes: ['Very Dry', 'Damaged Barrier', 'Dehydrated']
  },
  'Artemisia / Mugwort': {
    name: 'Ganghwa Mugwort (Artemisia / 쑥)',
    koreanName: '강화 약쑥',
    description: 'Fermented Ganghwa island Mugwort known for intensive skin purification, heat reduction, and balancing sensitive skin pH.',
    benefits: ['Purification', 'Skin Cooling', 'Anti-Inflammatory'],
    skinTypes: ['Sensitive', 'Reactive', 'Hot/Flushed Skin']
  },
  'Snail Mucin': {
    name: 'Black Snail Secretion Filtrate (달팽이 점액)',
    koreanName: '블랙 스네일 여과물',
    description: 'Ultra-nourishing bioactive mucin that boosts collagen synthesis, smooths fine lines, and promotes skin renewal.',
    benefits: ['Deep Hydration', 'Elasticity', 'Scar Fading'],
    skinTypes: ['Dehydrated', 'Post-Acne Marks', 'Aging']
  },
  'AHA BHA PHA': {
    name: 'Tri-Acid Exfoliant Complex (AHA BHA PHA)',
    koreanName: '저자극 3중 필링 복합체',
    description: 'Micro-dose resurfacing acids that dissolve blackheads, clear pore sebum, and lift dead cells without stripping the moisture barrier.',
    benefits: ['Gentle Exfoliation', 'Blackhead Clearing', 'Sebum Control'],
    skinTypes: ['Oily', 'Clogged Pores', 'Acne-Prone']
  },
  'Tranexamic Acid': {
    name: 'Tranexamic Acid + Glutathione (트라넥삼산)',
    koreanName: '트라넥삼산 & 글루타치온',
    description: 'Synergistic brightening complex that suppresses tyrosinase enzyme activity to visibly fade melasma, sun spots, and post-acne marks.',
    benefits: ['Melasma Defense', 'Hyperpigmentation Fade', 'Skin Brightening'],
    skinTypes: ['Dark Spots', 'Uneven Tone', 'Sun Damaged']
  },
  'Hyaluronic Acid 8D': {
    name: '8-Layer Multi-Molecular Hyaluronic Acid (히알루론산)',
    koreanName: '8중 복합 히알루론산',
    description: 'Cross-linked multi-weight hyaluronic acid penetrating through all dermis layers to replenish intra-cellular hydration reservoirs.',
    benefits: ['Deep Moisture Plumping', 'Dehydration Relief', 'Glass Skin Dew'],
    skinTypes: ['Dehydrated', 'Dry', 'Flaky', 'All Skin Types']
  },
  'Tea Tree Cica': {
    name: 'Jeju Tea Tree & Cica Complex (티트리)',
    koreanName: '제주 티트리 시카',
    description: 'Micro-distilled natural antimicrobial Australian tea tree combined with fermented Centella for instant acne calm without irritation.',
    benefits: ['Rapid Acne Relief', 'Pore Clarifying', 'Sebum Control'],
    skinTypes: ['Acne-Prone', 'Oily', 'Breakout Sensitive']
  }
};

export const POPULAR_SEARCH_KEYWORDS = [
  { term: 'Whitening', label: '✨ 28 Days Whitening', category: 'Whitening and Brightening Series' },
  { term: 'Centella', label: '🌿 Cica Barrier Calming', category: 'Ultimate Calming Solution Series' },
  { term: 'Ginseng', label: '🔥 Red Ginseng Firming', category: 'Ultra Repair Series' },
  { term: 'Toner', label: '🫧 Essence Toners', category: 'Toner' },
  { term: 'Serum', label: '🧪 VC Vitamin Serums', category: 'Serum' },
  { term: 'Acne', label: '⚡ Rapid Acne Relief', category: 'Rapid Acne Treatment Series' },
  { term: 'Cream', label: '💧 Ceramide Cream', category: 'Face Cream' },
  { term: 'Sunscreen', label: '☀️ Hanbang Sun Care', category: 'Sunscreen Series' }
];

export const SKIN_CONCERN_TABS = [
  { id: 'all', label: 'সব (All)' },
  { id: 'whitening', label: 'উজ্জ্বলতা (Whitening)' },
  { id: 'anti-aging', label: 'অ্যান্T-এজিং (Firming)' },
  { id: 'acne', label: 'ব্রণ ও দাগ (Acne & Spot)' },
  { id: 'calming', label: 'শান্ত ও সংবেদনশীল (Cica)' },
  { id: 'hydration', label: 'গভীর ময়েশ্চার (Hydration)' }
];

export interface SearchResult {
  product: Product;
  score: number;
  matchedField: 'title' | 'ingredient' | 'benefit' | 'category' | 'description' | 'skinType';
  matchedTerm: string;
  matchedIngredientMeta?: IngredientMeta;
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

const BENGALI_SYNONYMS: Record<string, string[]> = {
  'হোয়াইটনিং': ['whitening', 'brightening', 'radiance', 'glow', 'niacinamide', 'tranexamic'],
  'হোয়াইটনিং': ['whitening', 'brightening', 'radiance', 'glow', 'niacinamide', 'tranexamic'],
  'উজ্জ্বল': ['whitening', 'brightening', 'radiance', 'glow'],
  'উজ্জ্বলতা': ['whitening', 'brightening', 'radiance', 'glow'],
  'দাগ': ['dark spot', 'melasma', 'blemish', 'tranexamic', 'niacinamide', 'spot'],
  'ব্রণ': ['acne', 'tea tree', 'salicylic', 'cica', 'rapid acne', 'pore', 'treatment'],
  'একনি': ['acne', 'pimple', 'tea tree', 'cica'],
  'টনার': ['toner', 'essence', 'galactomyces', 'rice'],
  'সিরাম': ['serum', 'elixir', 'ampoule', 'vitamin'],
  'ক্রিম': ['cream', 'moisturizer', 'barrier', 'ceramide'],
  'ময়েশ্চারাইজার': ['moisturizer', 'cream', 'hyaluronic', 'hydration', 'ceramide'],
  'ময়েশ্চারাইজার': ['moisturizer', 'cream', 'hyaluronic', 'hydration', 'ceramide'],
  'সানস্ক্রিন': ['sunscreen', 'sunblock', 'spf', 'uv'],
  'ক্লিনজার': ['cleanser', 'foam', 'wash'],
  'ফেসওয়াশ': ['cleanser', 'foam', 'wash'],
  'ফেসওয়াশ': ['cleanser', 'foam', 'wash'],
  'জিনসেং': ['ginseng', 'red ginseng', 'firming', 'anti-aging'],
  'সিকা': ['cica', 'centella', 'calming', 'soothing'],
  'বয়স': ['anti-aging', 'firming', 'elasticity', 'ginseng', 'snail'],
  'বয়স': ['anti-aging', 'firming', 'elasticity', 'ginseng', 'snail']
};

export class ProductSearchEngine {
  private products: Product[] = [];
  private tokenMap = new Map<string, Set<string>>();

  constructor(products: Product[] = []) {
    this.setProducts(products);
  }

  public setProducts(products: Product[]) {
    this.products = products;
    this.buildIndex();
  }

  private buildIndex() {
    this.tokenMap.clear();

    for (const prod of this.products) {
      const textToTokenize = [
        prod.title || '',
        prod.category || '',
        prod.description || '',
        ...(prod.features || []),
        ...(prod.tags || [])
      ].join(' ').toLowerCase();

      const tokens = textToTokenize
        .replace(/[^a-z0-9\u0980-\u09FF\uAC00-\uD7AF\s]/gi, ' ')
        .split(/\s+/)
        .filter(t => t.length > 1);

      for (const t of tokens) {
        if (!this.tokenMap.has(t)) {
          this.tokenMap.set(t, new Set());
        }
        this.tokenMap.get(t)!.add(prod.id);
      }
    }
  }

  public search(query: string, concernFilter: string = 'all'): { 
    results: SearchResult[]; 
    matchingIngredient?: IngredientMeta; 
    queryTimeMs: number;
    totalAvailable: number;
  } {
    const start = performance.now();
    const cleanQuery = query.trim().toLowerCase();

    // Check if query contains Bengali aliases and expand them
    const expandedTokens = new Set<string>();
    if (cleanQuery) {
      cleanQuery.split(/\s+/).filter(Boolean).forEach(t => expandedTokens.add(t));
      for (const [bnWord, enEquivs] of Object.entries(BENGALI_SYNONYMS)) {
        if (cleanQuery.includes(bnWord)) {
          enEquivs.forEach(eq => expandedTokens.add(eq.toLowerCase()));
        }
      }
    }

    const queryTokens = Array.from(expandedTokens);

    // 1. Check for matching Hanbang Ingredient Meta (Exact or Fuzzy)
    let matchingIngredient: IngredientMeta | undefined = undefined;
    if (cleanQuery) {
      for (const [key, meta] of Object.entries(HANBANG_INGREDIENT_DATABASE)) {
        const keyLow = key.toLowerCase();
        const nameLow = meta.name.toLowerCase();
        if (
          keyLow.includes(cleanQuery) ||
          nameLow.includes(cleanQuery) ||
          meta.koreanName.includes(cleanQuery) ||
          meta.benefits.some(b => b.toLowerCase().includes(cleanQuery)) ||
          queryTokens.some(qt => keyLow.includes(qt) || nameLow.includes(qt))
        ) {
          matchingIngredient = meta;
          break;
        }

        // Fuzzy match on ingredient words
        const ingWords = keyLow.split(/\s+/);
        for (const iw of ingWords) {
          for (const qt of queryTokens) {
            if (Math.abs(iw.length - qt.length) <= 2 && levenshteinDistance(iw, qt) <= 2) {
              matchingIngredient = meta;
              break;
            }
          }
          if (matchingIngredient) break;
        }
        if (matchingIngredient) break;
      }
    }

    const scoreMap = new Map<string, { score: number; matchedField: SearchResult['matchedField']; matchedTerm: string }>();

    for (const prod of this.products) {
      const titleLower = (prod.title || '').toLowerCase();
      const catLower = (prod.category || '').toLowerCase();
      const descLower = (prod.description || '').toLowerCase();
      const tags = (prod.tags || []).map(t => t.toLowerCase());
      const features = (prod.features || []).map(f => f.toLowerCase());
      const allText = `${titleLower} ${catLower} ${descLower} ${tags.join(' ')} ${features.join(' ')}`;

      // Concern Filter Check
      if (concernFilter && concernFilter !== 'all') {
        const cf = concernFilter.toLowerCase();
        let matchesConcern = false;
        if (cf === 'whitening' && (allText.includes('whitening') || allText.includes('brightening') || allText.includes('glow') || allText.includes('niacinamide') || allText.includes('tranexamic'))) matchesConcern = true;
        if (cf === 'anti-aging' && (allText.includes('repair') || allText.includes('ginseng') || allText.includes('firming') || allText.includes('aging') || allText.includes('wrinkle') || allText.includes('snail'))) matchesConcern = true;
        if (cf === 'acne' && (allText.includes('acne') || allText.includes('spot') || allText.includes('blemish') || allText.includes('tea tree') || allText.includes('salicylic') || allText.includes('pore'))) matchesConcern = true;
        if (cf === 'calming' && (allText.includes('calming') || allText.includes('cica') || allText.includes('centella') || allText.includes('soothing') || allText.includes('redness') || allText.includes('barrier'))) matchesConcern = true;
        if (cf === 'hydration' && (allText.includes('hydration') || allText.includes('moisture') || allText.includes('hyaluronic') || allText.includes('ceramide') || allText.includes('toner') || allText.includes('cream'))) matchesConcern = true;

        if (!matchesConcern) continue;
      }

      if (!cleanQuery) {
        // When no search query, return products matching the concern filter with base score
        scoreMap.set(prod.id, { score: 10, matchedField: 'category', matchedTerm: prod.category || 'Formula' });
        continue;
      }

      let prodScore = 0;
      let bestField: SearchResult['matchedField'] = 'title';
      let bestTerm = '';

      // Direct full query match
      if (titleLower.includes(cleanQuery)) {
        prodScore += 200;
        bestField = 'title';
        bestTerm = cleanQuery;
      }

      if (catLower.includes(cleanQuery)) {
        prodScore += 120;
        if (prodScore <= 120) {
          bestField = 'category';
          bestTerm = prod.category;
        }
      }

      for (const tag of tags) {
        if (tag.includes(cleanQuery)) {
          prodScore += 90;
          if (prodScore <= 90) {
            bestField = 'ingredient';
            bestTerm = tag;
          }
        }
      }

      for (const feat of features) {
        if (feat.includes(cleanQuery)) {
          prodScore += 60;
          if (prodScore <= 60) {
            bestField = 'benefit';
            bestTerm = feat;
          }
        }
      }

      if (descLower.includes(cleanQuery)) {
        prodScore += 40;
        if (prodScore <= 40) {
          bestField = 'description';
          bestTerm = cleanQuery;
        }
      }

      // Token-level scoring
      for (const token of queryTokens) {
        if (token.length < 2) continue;

        if (titleLower.includes(token)) {
          prodScore += 60;
          if (!bestTerm) { bestField = 'title'; bestTerm = token; }
        }
        if (catLower.includes(token)) {
          prodScore += 40;
          if (!bestTerm) { bestField = 'category'; bestTerm = prod.category; }
        }
        for (const tag of tags) {
          if (tag.includes(token)) {
            prodScore += 30;
            if (!bestTerm) { bestField = 'ingredient'; bestTerm = tag; }
          }
        }
        for (const feat of features) {
          if (feat.includes(token)) {
            prodScore += 20;
            if (!bestTerm) { bestField = 'benefit'; bestTerm = feat; }
          }
        }
      }

      // Fuzzy Match (Typo Tolerance)
      if (prodScore === 0) {
        for (const token of queryTokens) {
          if (token.length < 3) continue;

          // Check fuzzy against title words
          const titleWords = titleLower.split(/\s+/);
          for (const tw of titleWords) {
            if (Math.abs(tw.length - token.length) <= 2) {
              const dist = levenshteinDistance(tw, token);
              if (dist <= 2) {
                prodScore += (40 - dist * 15);
                bestField = 'title';
                bestTerm = tw;
                break;
              }
            }
          }

          // Check fuzzy against tags and Hanbang ingredients
          for (const [ingKey, meta] of Object.entries(HANBANG_INGREDIENT_DATABASE)) {
            const ingWords = ingKey.toLowerCase().split(/\s+/);
            for (const iw of ingWords) {
              if (Math.abs(iw.length - token.length) <= 2) {
                const dist = levenshteinDistance(iw, token);
                if (dist <= 2) {
                  if (
                    titleLower.includes(ingKey.toLowerCase()) || 
                    descLower.includes(ingKey.toLowerCase()) || 
                    features.some(f => f.includes(ingKey.toLowerCase())) ||
                    tags.some(t => t.toLowerCase().includes(ingKey.toLowerCase()) || ingKey.toLowerCase().includes(t.toLowerCase()))
                  ) {
                    prodScore += (50 - dist * 10);
                    bestField = 'ingredient';
                    bestTerm = meta.name;
                    matchingIngredient = meta;
                    break;
                  }
                }
              }
            }
          }
        }
      }

      if (prodScore > 0) {
        scoreMap.set(prod.id, { score: prodScore, matchedField: bestField, matchedTerm: bestTerm });
      }
    }

    const results: SearchResult[] = [];
    scoreMap.forEach((meta, prodId) => {
      const prod = this.products.find(p => p.id === prodId);
      if (prod) {
        results.push({
          product: prod,
          score: meta.score,
          matchedField: meta.matchedField,
          matchedTerm: meta.matchedTerm,
          matchedIngredientMeta: matchingIngredient
        });
      }
    });

    results.sort((a, b) => b.score - a.score);

    const end = performance.now();
    return {
      results,
      matchingIngredient,
      queryTimeMs: Number((end - start).toFixed(2)),
      totalAvailable: this.products.length
    };
  }
}
