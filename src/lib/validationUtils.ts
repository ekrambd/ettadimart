/**
 * Validation utilities for Bangladeshi E-Commerce orders.
 * Handles BD phone number regex verification and delivery address quality checks.
 */

const BN_DIGIT_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

/**
 * Normalizes any Bengali digits in input to standard ASCII 0-9 digits.
 */
export function normalizeBanglaDigits(input: string): string {
  if (!input) return '';
  return input.replace(/[০-৯]/g, (ch) => BN_DIGIT_MAP[ch] || ch);
}

/**
 * Real-time phone input sanitizer for Bangladeshi numbers.
 * Strictly blocks alphabetic & non-numeric characters, strips unwanted symbols,
 * converts Bengali numerals (০-৯ -> 0-9), enforces standard 01[3-9] prefix,
 * and restricts input length to exactly 11 digits.
 */
export function sanitizeBDPhoneInput(raw: string): string {
  if (!raw) return '';

  // 1. Convert any Bengali numerals to English digits
  let val = normalizeBanglaDigits(raw);

  // 2. Strip anything that is NOT a digit (letters, symbols, punctuation)
  val = val.replace(/\D/g, '');

  // 3. Handle country code prefix (+8801..., 8801..., 880...)
  if (val.startsWith('8801')) {
    val = val.slice(2);
  } else if (val.startsWith('880')) {
    val = val.slice(2);
  } else if (val.startsWith('008801')) {
    val = val.slice(4);
  } else if (val.startsWith('88') && val.length > 2) {
    val = val.slice(2);
    if (!val.startsWith('0')) val = '0' + val;
  } else if (val === '88' || val === '8') {
    // 88 will not take by default
    return '';
  }

  // 4. If user typed 13-19 without the leading 0 (e.g. pasted 17XXXXXXXX or 13XXXXXXXX)
  if (/^1[3-9]/.test(val) && val.length <= 10) {
    val = '0' + val;
  }

  // 5. Enforce valid Bangladesh mobile prefix strictly:
  // Digit 1: Must be '0'
  if (val.length >= 1 && val[0] !== '0') {
    return '';
  }

  // Digit 2: Must be '1'
  if (val.length >= 2 && val[1] !== '1') {
    return '0';
  }

  // Digit 3: Must be 3, 4, 5, 6, 7, 8, or 9 (GP, Banglalink, Robi, Airtel, Teletalk)
  if (val.length >= 3 && !/[3-9]/.test(val[2])) {
    return '01';
  }

  // 6. Max length: Strictly 11 digits
  return val.slice(0, 11);
}

/**
 * Validates and normalizes Bangladesh mobile phone numbers.
 * Valid BD operators start with 013, 014, 015, 016, 017, 018, 019 and must be exactly 11 digits.
 */
export function validateBDPhone(rawPhone: string): { isValid: boolean; cleanedPhone: string; error?: string } {
  if (!rawPhone || !rawPhone.trim()) {
    return {
      isValid: false,
      cleanedPhone: '',
      error: 'অনুগ্রহ করে আপনার ১১ ডিজিটের মোবাইল নম্বর লিখুন।'
    };
  }

  // 1. Convert Bengali numbers to English
  const normalized = normalizeBanglaDigits(rawPhone.trim());

  // 2. Strip standard formatting characters (spaces, dashes, parens, plus)
  let digits = normalized.replace(/[\s\-\(\)\+]/g, '');

  // 3. Handle international country code variations: +8801, 8801, 008801
  if (digits.startsWith('008801') && digits.length === 15) {
    digits = digits.slice(4);
  } else if (digits.startsWith('8801') && digits.length === 13) {
    digits = digits.slice(2);
  } else if (digits.startsWith('880') && digits.length === 13) {
    digits = digits.slice(2);
  }

  // 4. Must be numeric only
  if (!/^\d+$/.test(digits)) {
    return {
      isValid: false,
      cleanedPhone: digits,
      error: 'মোবাইল নম্বরে শুধুমাত্র সংখ্যা দিন।'
    };
  }

  // 5. Length verification
  if (digits.length !== 11) {
    return {
      isValid: false,
      cleanedPhone: digits,
      error: `মোবাইল নম্বরটি ১১ ডিজিটের হতে হবে (বর্তমানে ${digits.length} ডিজিট)। যেমন: 017XXXXXXXX`
    };
  }

  // 6. Bangladesh standard operator regex: 01[3-9] followed by 8 digits
  const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
  if (!BD_PHONE_REGEX.test(digits)) {
    return {
      isValid: false,
      cleanedPhone: digits,
      error: 'সঠিক বাংলাদেশী মোবাইল নম্বর দিন (013-019 দিয়ে শুরু ১১ ডিজিট)।'
    };
  }

  return {
    isValid: true,
    cleanedPhone: digits
  };
}

/**
 * Validates delivery address to ensure it is authentic and deliverable by couriers.
 * Prevents single-word / fake entries like "adabor" or "dhaka".
 * Accepts:
 *   - Urban format with house/road/holding/basha + area/city (e.g. "house no 10, adabor, dhaka")
 *   - Rural/Town multi-tier format (e.g. "mongolbari, dhamoirhat, naogaon")
 *   - Bengali address equivalent (e.g. "বাসা ১০, রোড ২, আদাবর, ঢাকা" or "গ্রাম: মঙ্গলবাড়ি, থানা: ধামইরহাট, জেলা: নওগাঁ")
 */
export function validateDeliveryAddress(rawAddress: string): { isValid: boolean; cleanedAddress: string; error?: string } {
  if (!rawAddress || !rawAddress.trim()) {
    return {
      isValid: false,
      cleanedAddress: '',
      error: 'অনুগ্রহ করে সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন।'
    };
  }

  const cleaned = rawAddress.trim().replace(/\s+/g, ' ');

  // 1. Minimum character length check (BD address needs at least 8-10 chars for house/area)
  if (cleaned.length < 8) {
    return {
      isValid: false,
      cleanedAddress: cleaned,
      error: 'ঠিকানাটি খুব সংক্ষিপ্ত। সম্পূর্ণ বিস্তারিত ঠিকানা দিন (যেমন: বাসা নং ১০, আদাবর, ঢাকা অথবা গ্রাম, থানা, জেলা)।'
    };
  }

  // 2. Reject obvious fake / test words
  const lower = cleaned.toLowerCase();
  const fakeKeywords = ['test', 'fake', 'testing', 'demo', 'asdf', 'qwerty', 'dummy', 'nothing', 'null', 'undefined', 'n/a'];
  if (fakeKeywords.some(f => lower === f || lower === `${f} ${f}`)) {
    return {
      isValid: false,
      cleanedAddress: cleaned,
      error: 'অনুগ্রহ করে সঠিক ডেলিভারি ঠিকানা দিন।'
    };
  }

  // 3. Reject repetitive single character strings (e.g. "aaaaaaaa", "11111111")
  if (/(.)\1{5,}/.test(cleaned)) {
    return {
      isValid: false,
      cleanedAddress: cleaned,
      error: 'অনুগ্রহ করে সঠিক ডেলিভারি ঠিকানা দিন।'
    };
  }

  // 4. Tokenize by space, commas, hyphens, slashes, newlines
  const words = cleaned.split(/[\s,./\-\\|;:]+/).filter(w => w.trim().length > 0);
  if (words.length < 2) {
    return {
      isValid: false,
      cleanedAddress: cleaned,
      error: 'শুধু এলাকার নাম যথেষ্ট নয়। বাসা/রোড নম্বর বা সম্পূর্ণ ঠিকানা দিন (যেমন: বাসা নং ১০, আদাবর, ঢাকা অথবা গ্রাম, থানা, জেলা)।'
    };
  }

  // 5. Check for structural patterns:
  // Keyword pattern for House/Road/Holding/Sector/Block/Flat/Basha/Bari/Village/Thana/District in English and Bangla
  const houseRoadKeywordsRegex = /\b(house|holding|road|rd|lane|goli|sector|block|flat|apt|room|floor|basha|bari|vill|village|thana|upazila|dist|district|post|po|ward|para)\b|বাসা|বাড়ি|বাড়ি|হোল্ডিং|রোড|রাস্তা|সেক্টর|ব্লক|ফ্ল্যাট|ওয়ার্ড|ওয়ার্ড|গ্রাম|থানা|উপজেলা|জেলা|ডাকঘর|মহল্লা|তলা|বিল্ডিং|লেন|গলি|নং|নম্বর/i;
  const hasHouseRoadOrAdminKeyword = houseRoadKeywordsRegex.test(cleaned);

  // Check if address has house/holding/road digits or patterns like "10/A", "house 10", "road 4", "#12"
  const hasHouseOrHoldingNumber = /\b\d+([a-zA-Z]|\/\d+)?\b|[০-৯]+/.test(cleaned);

  // Check for multi-tier comma-separated segments (e.g. "mongolbari, dhamoirhat, naogaon")
  const commaSegments = cleaned.split(/[,;\n\/]+/).map(s => s.trim()).filter(s => s.length >= 2);
  const hasThreeTierSegments = commaSegments.length >= 3;

  // Evaluation:
  // Case A: Urban format with house/road/holding/basha keywords (or house number) AND at least 2 words
  // e.g. "house no 10, adabor, dhaka", "house 5, dhanmondi", "বাসা নং ১০, আদাবর, ঢাকা"
  if (hasHouseRoadOrAdminKeyword && words.length >= 2) {
    return { isValid: true, cleanedAddress: cleaned };
  }

  // Case B: Has house number with location parts (e.g. "10, adabor, dhaka" or "12/A, Dhanmondi, Dhaka")
  if (hasHouseOrHoldingNumber && words.length >= 3) {
    return { isValid: true, cleanedAddress: cleaned };
  }

  // Case C: Three-tier rural/town address (e.g. "mongolbari, dhamoirhat, naogaon" -> village, thana, district)
  if (hasThreeTierSegments && words.length >= 3) {
    return { isValid: true, cleanedAddress: cleaned };
  }

  // Case D: General detailed address with at least 4 meaningful words and length >= 16 chars
  if (words.length >= 4 && cleaned.length >= 16) {
    return { isValid: true, cleanedAddress: cleaned };
  }

  // If it's a single area or incomplete like "adabor" or "dhaka" or "adabor, dhaka" without house no or 3 tiers:
  return {
    isValid: false,
    cleanedAddress: cleaned,
    error: 'অনুগ্রহ করে বাসা/রোড নম্বর সহ সম্পূর্ণ ঠিকানা দিন (যেমন: বাসা নং ১০, আদাবর, ঢাকা) অথবা গ্রাম, থানা, জেলা উল্লেখ করুন (যেমন: মঙ্গলবাড়ি, ধামইরহাট, নওগাঁ)।'
  };
}
