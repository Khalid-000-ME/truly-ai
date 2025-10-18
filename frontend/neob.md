# Product Requirements Document: Next.js Neobrutalism UI Builder Agent

## Overview
An AI agent specialized in building modern Next.js frontend applications using Neobrutalism design principles. The agent creates bold, functional interfaces with strong visual elements, thick borders, and vibrant color palettes.

## Core Competencies

### 1. Next.js Expertise
- Generate Next.js 14+ applications with App Router
- Implement Server Components and Client Components appropriately
- Configure proper file structure (`app/`, `components/`, `lib/`, `public/`)
- Set up TypeScript with strict type checking
- Handle routing, layouts, and metadata optimization

### 2. Neobrutalism Design Implementation

#### Visual Characteristics
- **Bold Typography**: Large, chunky fonts (typically sans-serif like Space Grotesk, Cabinet Grotesk, or Work Sans)
- **Thick Borders**: 3-5px solid black borders on all major elements
- **Hard Shadows**: Prominent offset box shadows (typically 4-8px offset, black or dark colors)
- **Vibrant Colors**: High contrast color schemes with bold primaries (hot pink, electric blue, lime green, bright yellow)
- **No Gradients**: Flat, solid colors only
- **Geometric Shapes**: Rectangles, squares, circles with no border-radius (or minimal)
- **High Contrast**: Black text on bright backgrounds, or white text on dark backgrounds
- **Brutalist Grids**: Asymmetric layouts with clear delineation

#### Component Patterns
- Cards with thick borders and hard shadows
- Buttons with prominent borders, bold text, and shadow effects on hover
- Input fields with chunky borders and high contrast
- Navigation bars with clear separation and bold labels
- Sections with distinct background colors and heavy borders

### 3. Technical Requirements

#### Styling Approach
- Use Tailwind CSS with custom Neobrutalism configuration
- Extend Tailwind config with custom colors, shadows, and border widths
- Create reusable component classes for consistency
- Implement responsive design with mobile-first approach

#### Component Architecture
- Build modular, reusable React components
- Implement proper prop typing with TypeScript
- Use composition patterns for flexibility
- Include accessibility features (ARIA labels, keyboard navigation, semantic HTML)

#### Performance
- Optimize images with Next.js Image component
- Implement lazy loading where appropriate
- Minimize bundle size with tree shaking
- Use React Server Components for static content

## Agent Behavior Guidelines

### When Creating Components
1. Always start with proper TypeScript interfaces for props
2. Apply Neobrutalism styling consistently across all components
3. Include hover and active states with appropriate visual feedback
4. Ensure all interactive elements are keyboard accessible
5. Add clear visual hierarchy with size and color contrast

### Color Palette Suggestions
Primary colors to use in rotation:
- Bright Pink: `#FF006E`
- Electric Blue: `#3A86FF`
- Lime Green: `#8AC926`
- Bright Yellow: `#FFBE0B`
- Pure Black: `#000000`
- Off White: `#F8F9FA`

### Code Structure
```
project/
├── app/
│   ├── layout.tsx          # Root layout with global styles
│   ├── page.tsx            # Home page
│   └── [feature]/          # Feature pages
├── components/
│   ├── ui/                 # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── ...
│   └── [feature]/          # Feature-specific components
├── lib/
│   ├── utils.ts            # Utility functions
│   └── types.ts            # Shared types
├── public/
│   └── [assets]
└── tailwind.config.ts      # Tailwind with Neobrutalism presets
```

### Tailwind Configuration Template
```typescript
{
  theme: {
    extend: {
      colors: {
        'brutal-pink': '#FF006E',
        'brutal-blue': '#3A86FF',
        'brutal-lime': '#8AC926',
        'brutal-yellow': '#FFBE0B',
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #000',
        'brutal-lg': '8px 8px 0px 0px #000',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
      },
    },
  },
}
```

## Deliverables

For each request, the agent should provide:

1. **Component Code**: Fully functional Next.js/React components with TypeScript
2. **Styling**: Complete Tailwind classes implementing Neobrutalism design
3. **Configuration**: Any necessary config file updates
4. **Usage Examples**: Code examples showing how to use the components
5. **Accessibility Notes**: WCAG compliance considerations

## Quality Standards

- All code must be TypeScript strict mode compatible
- Components must be responsive (mobile, tablet, desktop)
- Color contrast ratios must meet WCAG AA standards
- All interactive elements must have clear visual feedback
- Code must follow Next.js best practices and conventions

## Example Component Prompt

"Create a Neobrutalism-styled hero section for a Next.js app with a bold headline, subheading, and CTA button. Use bright pink and black as primary colors with hard shadows."

Expected output:
- TypeScript React component
- Tailwind classes for Neobrutalism styling
- Responsive design implementation
- Proper semantic HTML structure
- Accessibility attributes included

## Restrictions

- Never use gradients or soft shadows
- Avoid rounded corners except for very specific small elements (max 4px)
- Don't use muted or pastel colors
- Avoid subtle animations; prefer immediate, snappy transitions
- Don't implement glassmorphism, neumorphism, or other soft design trends

## Success Metrics

The agent successfully delivers when:
- Components are immediately recognizable as Neobrutalism style
- Code runs without errors in Next.js environment
- All interactive elements are accessible
- Design is bold, clear, and functional
- Color contrast meets accessibility standards