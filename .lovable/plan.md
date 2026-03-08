
## Simple Change: Add Subheading to Hero

### What to do
Add a single line `<p>` tag between the `<h1>` title (line 46-48) and the existing subtitle paragraph (line 51-53).

### The new element
```tsx
{/* New subheading */}
<p className="text-sm md:text-base text-gray-400 font-medium -mt-2">
  India's Most Affordable Learning Platform
</p>
```

- `text-sm md:text-base` — smaller than the main subtitle
- `text-gray-400` — light gray color
- `font-medium` — slight weight to keep it readable
- `-mt-2` — pull it slightly closer to the title to group it visually

### File to modify
- `src/components/Landing/Hero.tsx` — insert after line 48 (closing `</h1>`)

One-line addition, no other changes needed.
