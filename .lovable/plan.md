
## Visual Improvement Plan: Hero + Subjects Sections

### Files to modify
1. `src/components/Landing/Hero.tsx`
2. `src/components/Landing/Subjects.tsx`

---

### Hero.tsx Changes

**1. Title ("Welcome to Sadguru Coaching Classes")**
- Bump size: `text-4xl md:text-5xl lg:text-6xl` → `text-4xl md:text-6xl lg:text-7xl`
- Add gradient color: `bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent`

**2. Subheading ("India's Most Affordable Learning Platform")**
- Current: `text-sm md:text-base text-muted-foreground/70 font-medium -mt-2`
- New: `text-base md:text-lg text-primary font-semibold tracking-wide`
- Makes it pop as a value proposition line in brand color

**3. "Get Started →" Button**
- Current: plain `bg-primary` button
- New: add `rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 font-semibold`
- Add gradient: `bg-gradient-to-r from-primary to-primary/80`

**4. Stats Cards ("500+ Students", "50+ Courses")**
- Currently plain dividers — wrap each stat in a proper card
- New: `bg-card rounded-2xl px-6 py-4 shadow-md border border-border text-center`
- The number: `text-3xl font-bold text-primary`
- The label: `text-sm font-medium text-muted-foreground`
- Remove the plain vertical divider, replace with flex gap between two cards

---

### Subjects.tsx Changes

**Replace the static image with a proper icon grid**

Current implementation uses a single PNG image (`subject_icons_set.png`) which has alignment/quality issues.

Replace with a hand-coded responsive grid of subject cards using Lucide icons + emoji to represent:
- 📐 Maths → `Calculator` icon
- 🔬 Science → `FlaskConical` icon  
- 📚 English → `BookOpen` icon
- 💻 Computer → `Monitor` icon
- 🎨 Arts → `Palette` icon

Each card:
```
bg-card rounded-2xl p-6 shadow-md border border-border
flex flex-col items-center gap-3
hover:shadow-lg hover:scale-105 transition-all duration-200
```

Grid layout: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 max-w-4xl mx-auto`

Icon: colored circle bg with Lucide icon inside (matching subject color)
Subject name: `text-sm font-semibold text-foreground`

Subject color accents:
- Maths: `bg-blue-100 text-blue-600`
- Science: `bg-green-100 text-green-600`
- English: `bg-yellow-100 text-yellow-600`
- Computer: `bg-purple-100 text-purple-600`
- Arts: `bg-pink-100 text-pink-600`

---

### Mobile Responsiveness
- Stats: `flex-wrap gap-4` so they stack gracefully on very small screens
- Subject grid: 2 columns on mobile → 3 on sm → 5 on md+
- Button: `w-full sm:w-auto` already set, keep it
- Title: responsive font sizes handle themselves

---

### Summary of changes
| Item | Before | After |
|------|--------|-------|
| Title size | 4xl→6xl | 4xl→7xl + gradient |
| Subheading | muted/small | primary color, larger |
| CTA button | flat rounded | rounded-full + shadow + hover scale |
| Stats | plain text divider | white cards with shadow |
| Subject icons | single PNG image | 5-column card grid with Lucide icons |
