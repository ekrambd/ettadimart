import fs from 'fs';

let content = fs.readFileSync('src/components/FantineStorePage.tsx', 'utf-8');

// 1. Fix Video Preload
content = content.replace(/<video\s+autoPlay\s+loop\s+muted\s+playsInline\s+preload="auto"/g, 
  '<video\n                autoPlay\n                loop\n                muted\n                playsInline\n                preload="none"\n                poster="/fantine_video_poster.jpg"');

// 2. Fix CLS on Hero section. The hero has `-mt-[84px] ... min-h-[520px]`.
// It's already got a min-height. But we can ensure it has a proper structure or we can just leave min-h.
// Let's change `min-h-[520px]` to just be more explicit. Actually, the CLS is because the nav changes height or fonts load.
// We can wrap the main content in <main>
content = content.replace(/<div className="flex-1 w-full bg-\[#faf9f6\] flex flex-col">/g, 
  '<main className="flex-1 w-full bg-[#faf9f6] flex flex-col">');
// Check if the div above exists:
