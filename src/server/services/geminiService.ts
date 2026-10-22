import { circuitBreakerRegistry } from './circuitBreaker';

export interface SkincareProductContext {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  ingredients?: string;
  benefits?: string[];
  benefitsHighlights?: string;
  howToUseIt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SkincareAnalysisRequest {
  messages: ChatMessage[];
  selectedProducts?: SkincareProductContext[];
  skinType?: 'all' | 'dry' | 'oily' | 'combination' | 'sensitive' | 'acne-prone';
  skinConcern?: string;
  language?: 'bn' | 'en';
}

const SYSTEM_INSTRUCTION = `You are "Dr. Fantine (AI Korean Skincare Specialist & Serum Consultant)" for Fantine Laboratory / Fantine BD (a premium Korean Skincare brand).

STRICT SCOPE & TOPIC GUARDRAILS (CRITICAL & MANDATORY):
1. You are STRICTLY AND EXCLUSIVELY an AI Korean Skincare & Serum Specialist for this website.
2. You are ONLY ALLOWED to answer questions related to:
   - Skin types (Dry, Oily, Sensitive, Combination, Acne-prone, Normal)
   - Skin concerns & treatments (Acne, dark spots, hyperpigmentation, melasma, barrier repair, sun damage, wrinkles, pores, redness, dullness)
   - Korean serums, essences, toners, creams, cleansers, sunscreens, and skincare formulations
   - Skincare active ingredients (Peptides, Vitamin C/Ascorbic Acid, Niacinamide, Tranexamic Acid, Salicylic Acid/BHA, Centella Asiatica, Hyaluronic Acid, Ceramides, Retinol, Panthenol, Glutathione, Ferulic Acid, Hanbang botanicals, etc.)
   - AM/PM application sequence, layering order, formulation compatibility, routine builder, safety precautions, and Fantine website products/orders.

3. PRODUCT CONTEXT ACCURACY & AWARENESS (HIGH PRIORITY):
   - When [CURRENTLY VIEWED / SELECTED PRODUCT CONTEXT] is provided, this represents the EXACT product the customer is viewing or consulting about on the website (e.g. Botox anti-wrinkle essence, Vitamin C Serum, Hanbang Cream, etc.).
   - ALWAYS leverage the provided product details (Title, Category, Price, Description, Benefits Highlights, Ingredients, How To Use) to provide precise, accurate, and tailored answers.
   - Accurately explain its key actives, how it targets specific skin issues (e.g. anti-wrinkle peptides for lifting/elasticity, Niacinamide for dark spots), the best AM/PM layering order, and whether it pairs well with other serums or sunscreens.

4. STRICT REFUSAL POLICY FOR OFF-TOPIC QUERIES:
   - If the user asks about ANY topic outside of skincare, beauty routines, and Fantine products (such as coding, general knowledge, politics, maths, news, history, sports, recipes, non-dermal medical advice, jokes, essays, random conversations):
   - You MUST REFUSE politely and immediately redirect them to skincare.
   - Example Bengali refusal:
     "দুঃখিত, আমি শুধুমাত্র Fantine কোরিয়ান স্কিনকেয়ার, সিরাম ও ত্বকের যত্ন সম্পর্কিত পরামর্শ দিতে পারি। আপনার ত্বক, দাগ, ব্রণ বা স্কিনকেয়ার রুTন নিয়ে কোনো প্রশ্ন থাকলে আমাকে জানাতে পারেন! 🧴✨"
   - Example English refusal:
     "I specialize exclusively in Korean skincare, active serums, and personalized dermal routines. Please feel free to ask about your skin type, concerns, or our product formulations!"

CORE SKINCARE EXPERTISE:
- When analyzing serums or skincare products (especially when 1, 2, 3, or 4 products are selected), always provide:
  - **Formula Breakdown & Key Ingredients**
  - **Comparison Matrix & Star Ratings (⭐⭐⭐⭐⭐)**
  - **Ranking (🥇, 🥈, 🥉)** for specific goals (e.g., Pigmentation, Barrier, Glow, Anti-aging)
  - **Step-by-Step AM (Morning) & PM (Night) Routine** (Cleanser -> Toner -> Actives -> Hydrating Serum -> Cream -> SPF)
  - **Doctor's Note / Safety Warnings (⚠️)** (e.g., Daytime SPF 50 sunscreen requirement when using Vitamin C / Salicylic Acid / Retinol)

LANGUAGE & TONE:
- Default to clear, natural, and medically sound Bengali (Bangla) if the user speaks Bengali or Banglish. If the user asks in English, respond in polished English.
- GREETING RULE (STRICT): ALWAYS use "👋 হ্যালো! আমি Fantine AI Skincare Doctor." or "হ্যালো!". NEVER use "নমস্কার", "নমস্কার!", or any religious/traditional salutations. ALWAYS greet with "হ্যালো!".
- Be empathetic, respectful, and authoritative like an experienced dermatologist.`;

export class GeminiSkincareService {
  private getApiKey(): string {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      ''
    ).trim();
  }

  /**
   * Main consultation endpoint utilizing Gemini 2.0 / 1.5 Flash
   */
  public async consultSkincareDoctor(req: SkincareAnalysisRequest): Promise<{ reply: string; model: string }> {
    return circuitBreakerRegistry.geminiAI.execute(
      async () => {
        const apiKey = this.getApiKey();
        
        // Build product context if provided
        let productContextText = '';
        if (req.selectedProducts && req.selectedProducts.length > 0) {
          productContextText = `\n\n[CURRENTLY VIEWED / SELECTED PRODUCT CONTEXT]:\n` +
            req.selectedProducts.map((p, idx) => 
              `Product ${idx + 1}: ${p.title}\nCategory: ${p.category || 'Skincare'}\nPrice: ৳${p.price || ''}\nDescription: ${p.description || ''}\nBenefits Highlights: ${p.benefitsHighlights || (Array.isArray(p.benefits) ? p.benefits.join(', ') : '') || ''}\nHow To Use: ${p.howToUseIt || ''}\nIngredients/Actives: ${p.ingredients || ''}`
            ).join('\n---\n');
        }

        if (req.skinType) {
          productContextText += `\n[Customer Skin Type]: ${req.skinType}`;
        }
        if (req.skinConcern) {
          productContextText += `\n[Customer Primary Skin Concern]: ${req.skinConcern}`;
        }

        // If API key is not present, use our advanced local skincare engine
        if (!apiKey) {
          const fallbackReply = this.generateDeterministicConsultation(req);
          return { reply: fallbackReply, model: 'fantine-expert-skincare-engine' };
        }

        // Format conversation for Gemini API
        const contents = req.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

        // Append system instruction & context into the conversation or systemInstruction parameter
        const lastIndex = contents.length - 1;
        if (lastIndex >= 0 && contents[lastIndex].role === 'user') {
          contents[lastIndex].parts[0].text += productContextText;
        } else {
          contents.push({
            role: 'user',
            parts: [{ text: `Customer inquiry:${productContextText}` }]
          });
        }

        const models = [
          'gemini-3.7-flash',
          'gemini-3.6-flash',
          'gemini-3.5-flash',
          'gemini-flash-latest',
          'gemini-2.0-flash',
          'gemini-1.5-flash'
        ];

        for (const model of models) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: SYSTEM_INSTRUCTION }]
                },
                contents,
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 2048,
                  topP: 0.95
                }
              })
            });

            if (!response.ok) {
              const errBody = await response.text();
              console.warn(`[Gemini API] ${model} failed with ${response.status}:`, errBody);
              continue; // try next model
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textResponse) {
              return { reply: textResponse, model };
            }
          } catch (err) {
            console.error(`[Gemini API] Error contacting ${model}:`, err);
          }
        }

        // If network/rate limit failed all models, fallback gracefully
        const fallbackReply = this.generateDeterministicConsultation(req);
        return { reply: fallbackReply, model: 'fantine-fallback-engine' };
      },
      () => {
        // Fallback when circuit is OPEN
        const fallbackReply = this.generateDeterministicConsultation(req);
        return { reply: fallbackReply, model: 'fantine-circuit-fallback' };
      }
    );
  }

  /**
   * Deterministic Dermatologist Knowledge Engine for Korean Serums & Actives
   */
  private generateDeterministicConsultation(req: SkincareAnalysisRequest): string {
    const lastUserMessage = (req.messages[req.messages.length - 1]?.content || '').toLowerCase();
    const products = req.selectedProducts || [];

    // Skincare domain keywords
    const skincareKeywords = [
      'skin', 'serum', 'cream', 'toner', 'cleanser', 'face', 'routine', 'am', 'pm',
      'vitamin', 'niacinamide', 'acne', 'spot', 'pigment', 'barrier', 'dry', 'oily',
      'sensitive', 'glow', 'sunscreen', 'spf', 'bha', 'aha', 'hyaluronic', 'centella',
      'ত্বক', 'স্কিন', 'সিরাম', 'দাগ', 'ব্রণ', 'মেছতা', 'রুTন', 'মুখ', 'ক্রিম', 'টোনার',
      'ড্রাই', 'অয়েলি', 'তৈলাক্ত', 'উজ্জ্বল', 'সানস্ক্রিন', 'ব্যবহার', 'ফর্মুলা', 'পরামর্শ', 'ডক্টর'
    ];

    const isSkincareRelated = 
      products.length > 0 ||
      skincareKeywords.some((kw) => lastUserMessage.includes(kw)) ||
      lastUserMessage.length < 5;

    // Strict refusal for unrelated off-topic queries
    if (!isSkincareRelated) {
      return `দুঃখিত, আমি শুধুমাত্র **Fantine কোরিয়ান স্কিনকেয়ার, সিরাম ও ত্বকের যত্ন সম্পর্কিত** বিষয়ে সাহায্য করতে পারি। 

আপনার ত্বক, মেছতার দাগ, ব্রণ বা সকাল ও রাতের স্কিনকেয়ার রুTন নিয়ে কোনো প্রশ্ন থাকলে আমাকে জানাতে পারেন! 🧴✨`;
    }

    if (products.length === 1) {
      const p = products[0];
      return `✨ **${p.title} — ডক্টরস ফর্মুলা ও ব্যবহারবিধি পরামর্শ:**

---

### 🧬 **১. ফর্মুলা ও active উপাদানের কার্যকারিতা:**
${p.benefitsHighlights || p.description || 'কোরিয়ান ক্লিনিক্যাল অ্যাক্Tভ উপাদান সমৃদ্ধ প্রিমিয়াম স্কিনকেয়ার ফর্মুলেশন।'}

---

### 🥣 **২. সঠিক প্রয়োগ ও রুTন ফ্লোচার্ট (AM / PM Application Flow):**
- **সকালের রুTন (Morning):**
  1. মাইল্ড ফেস ওয়াশ দিয়ে মুখ ধুয়ে নিন।
  2. ব্যালেন্সিং টোনার দিন।
  3. **${p.title}**-এর ২-৩ ফোঁটা পুRo মুখে ও গলায় আলতোভাবে ড্যাব করে লাগান।
  4. হালকা ময়েশ্চারাইজার ও দিনের বেলা অবশ্যই **SPF 50 সানস্ক্রিন** প্রয়োগ করুন।

- **রাতের রুTন (Night):**
  1. ডাবল ক্লিনজিং দিয়ে ত্বক পরিষ্কার করুন।
  2. প্রশান্তিদায়ক টোনার।
  3. **${p.title}** পুRo মুখে সমানভাবে মেখে ত্বকের গভীরে শোষিত হতে ১ মিনিট অপেক্ষা করুন।
  4. স্কিন ব্যারিয়ার সিল করার জন্য নাইট ক্রিম বা ময়েশ্চারাইজার লাগান।

---

### 💡 **৩. ব্যবহারের নিয়ম ও বিশেষ পরামর্শ:**
${p.howToUseIt ? `- **ব্যবহারবিধি:** ${p.howToUseIt}` : '- সিরাম লাগানোর সময় জোরে ঘষবেন না, হাতের তালু বা আঙুলের ডগা দিয়ে আলতোভাবে ট্যাপ করুন।'}
- নিয়মিত ব্যবহারে ত্বক সতেজ, মসৃণ ও প্রাণবন্ত হয়ে ওঠে।

এই ফর্মুলা সম্পর্কে আরও কিছু জানতে বা অন্য কোনো স্কিন সমস্যার ব্যাপারে down লিখুন!`;
    }

    if (products.length >= 2 || lastUserMessage.includes('formula') || lastUserMessage.includes('সিরাম') || lastUserMessage.includes('রুTন') || lastUserMessage.includes('তুলনা')) {
      return `✨ **Fantine Skincare Routine & Formula Analysis:**

---

### 🧬 **নির্বাচিত ফর্মুলাগুলোর কার্যকারিতা তুলনা:**

| লক্ষ্য / স্কিন কনসার্ন | সেরা পছন্দ | কার্যকারিতা রেTং |
| :--- | :--- | :--- |
| 🌑 **Dark Spots & Pigmentation** | Niacinamide + Tranexamic Acid Active Serum | ⭐⭐⭐⭐⭐ |
| ✨ **Overall Brightening & Glow** | Pure Vitamin C (Ascorbic Acid) + Ferulic Acid | ⭐⭐⭐⭐⭐ |
| 🛡️ **Skin Barrier & Hydration** | Centella + Hyaluronic Acid + Panthenol | ⭐⭐⭐⭐⭐ |
| 🧼 **Pores & Oil Control** | BHA / Salicylic Acid + Tea Tree Formulation | ⭐⭐⭐⭐ |
| 🔴 **Sensitive Skin Soothing** | Hanbang Rice Ferment + Aloe & Centella | ⭐⭐⭐⭐⭐ |

---

### ☀️ **১. সকালের রুTন (Morning / AM Routine):**
1. **Step 1 (Cleanse):** Gentle Low-pH Cleanser দিয়ে মুখ ধুয়ে নিন।
2. **Step 2 (Tone):** Soothing Balancing Toner দিয়ে স্কিনের pH ব্যালেন্স করুন।
3. **Step 3 (Active Protection):** **Formula (Vitamin C + Ferulic Acid)** — দিনের বেলার ফ্রি-র‌্যাডিক্যাল ও সান ড্যামেজ প্রতিRoধে ৩-৪ ফোঁটা মুখে ড্যাব করে লাগান।
4. **Step 4 (Hydrate):** **Hydrating / Soothing Serum** (Hyaluronic Acid / Barrier Serum)।
5. **Step 5 (Lock & Protect):** Lightweight Moisturizing Cream And অবশ্যই **SPF 50+ Sunscreen** (ভিটামিন সি ব্যবহারের পর সানস্ক্রিন দেওয়া অত্যন্ত গুরুত্বপূর্ণ)।

---

### 🌙 **২. রাতের রুTন (Night / PM Routine):**
1. **Step 1 (Double Cleanse):** Cleanser দিয়ে সারাদিনের ধুলোবালি ও সানস্ক্রিন পরিষ্কার করুন।
2. **Step 2 (Prep):** Calming Toner।
3. **Step 3 (Targeted Treatment):** **Formula (Niacinamide + Tranexamic Acid + Glutathione)** — ত্বকের গভীরে থাকা মেছতা, ব্রণের দাগ ও পিগমেন্টেশন রিমুভ করার জন্য।
4. **Step 4 (Repair & Nourish):** Deep Calming Hanbang Cream দিয়ে ময়েশ্চার লক করুন।

---

### ⚠️ **বিশেষ সতর্কতা (Safety Note):**
- এক সাথে এক স্টেপেই উচ্চমাত্রার Vitamin C And অন্যান্য স্ট্রং এক্সফোলিয়েTং এসিড না মিশিয়ে **একT সকালে ও একT রাতে** ব্যবহার করলে স্কিন ব্যারিয়ার সম্পূর্ণ সুরক্ষিত থাকবে।
- নতুন কোনো সিরাম শুরু করলে প্রথমে কানের পাশে সামান্য দিয়ে প্যাচ টেস্ট (Patch Test) করে নেওয়া নিরাপদ।`;
    }

    if (lastUserMessage.includes('দাগ') || lastUserMessage.includes('পিগমেন্ট') || lastUserMessage.includes('spot') || lastUserMessage.includes('মেছতা')) {
      return `🌑 **দাগ ও পিগমেন্টেশন দূর করার সেরা সমাধান:**

ত্বকের গভীরের জেদি কালো দাগ, মেছতা বা ব্রণের দাগ দূর করার জন্য **Formula 2 (Niacinamide + Tranexamic Acid + Glutathione)** সবচেয়ে কার্যকর।

💡 **ব্যবহারবিধি:**
- প্রতিদিন রাতে ডাবল ক্লিনজিং ও টোনারের পর ৩-৪ ফোঁটা মুখে লাগান।
- দিনের বেলা ভিটামিন সি সিরাম And অবশ্যই **SPF 50 সানস্ক্রিন** ব্যবহার করুন।`;
    }

    if (lastUserMessage.includes('ড্রাই') || lastUserMessage.includes('dry') || lastUserMessage.includes('ব্যারিয়ার') || lastUserMessage.includes('barrier') || lastUserMessage.includes('শুষ্ক')) {
      return `🛡️ **শুষ্ক ও ডিহাইড্রেটেড ত্বকের জন্য যত্ন:**

শুষ্ক ও সংবেদনশীল ত্বকে আর্দ্রতা ধরে রাখতে **Formula 1 (Calming & Barrier)** অথবা **Formula 3 (Deep Hydration)** সেরা পছন্দ। এতে থাকা Centella, Panthenol And Hyaluronic Acid ত্বকের সুরক্ষা ব্যারিয়ার দ্রুত মেরামত করে।

💡 **রুTন:**
- সকাল ও রাতে ক্লিনজিংয়ের পর টোনার দিয়ে ভেজা মুখে এই সিরামT লাগান And ওপরে ময়েশ্চারাইজার দিয়ে লক করুন।`;
    }

    return `👋 **হ্যালো! আমি Fantine AI Skincare Doctor.**

আপনার ত্বকের সঠিক যত্ন ও কোরিয়ান সিরাম ব্যবহারের নিয়ম জানতে আমি সাহায্য করতে পারি। 

আপনি চাইলে:
1. above থাকা **১ from ৪T সিরাম সিলেক্ট করতে পারেন**—আমি সাথে সাথে সকাল ও রাতের সঠিক ব্যবহারবিধি (AM/PM Routine) তৈরি করে দেব।
2. আপনার স্কিন Type (Dry, Oily, Sensitive বা Combination) And সমস্যা (দাগ, ব্রণ, সানট্যান ইত্যাদি) লিখে বা মাইকে মুখে বলে জানাতে পারেন।

আমি আপনাকে কীভাবে সাহায্য করতে পারি?`;
  }
}

export const geminiSkincareService = new GeminiSkincareService();
