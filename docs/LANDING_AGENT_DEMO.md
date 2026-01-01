# Landing Agent Demo Component

## Overview

Created `LandingAgentDemo.tsx` - a Cursor-style agent/workspace window demo for the Briki landing page. This component showcases Briki's AI-powered policy analysis capabilities in a professional, enterprise-grade interface.

## Component Structure

### Three-Column Layout

1. **Left Activity Sidebar** (224px width)
   - "En progreso" section with active tasks
   - Progress indicators with animated loaders
   - "Listo" section showing completed tasks
   - Compact, Cursor-style density

2. **Main Conversation Panel** (flex-1)
   - Header with policy type and client info
   - Agent conversation messages (user + assistant)
   - Cursor-style result rows showing analysis outputs
   - File-change-like rows with icons and status indicators

3. **Right Results Panel** (288px width)
   - Structured output summary
   - Four key sections:
     - Riesgos identificados (Risks)
     - Cobertura principal (Coverage)
     - Exclusiones clave (Key Exclusions)
     - Próximos pasos (Next Steps)
   - Action button for generating proposals

## Design Principles Applied

### Typography & Density
- **UI text**: 9-11px (matching LandingDashboardDemo)
- **Headers**: 11-12px
- **Tight line-height**: `leading-tight` throughout
- **Compact padding**: 2-3 spacing units (8-12px)

### Color Philosophy
- **Ultra-muted chips**: No saturated colors
- **Hairline borders**: 0.5px with low alpha (0.04-0.08)
- **Subtle backgrounds**: rgba(255, 255, 255, 0.02-0.08)
- **Status colors**: Low opacity (0.55-0.7) for professional look
  - Success: `rgba(34, 197, 94, 0.6)`
  - Warning: `rgba(251, 191, 36, 0.6)`
  - Error: `rgba(239, 68, 68, 0.6)`
  - Primary: `var(--briki-primary)`

### Visual Elements
- **Progress bars**: 4px height, smooth transitions
- **Icons**: 14-16px (3.5-4 units), strokeWidth 2
- **Avatars**: 24px, gradient backgrounds
- **Rounded corners**: 6-8px for cards, 4px for buttons
- **Shadows**: Layered, subtle (matching dashboard demo)

### Interactive States
- **Hover**: Subtle background lift (0.03 → 0.05 alpha)
- **Active**: Primary tint with border
- **Transitions**: All smooth, 150-300ms

## Content Strategy

### Neutral, Professional Names
- ✅ "Briki Team" / "Equipo comercial"
- ✅ "Cliente corporativo"
- ✅ "Briki Agent"
- ❌ No personal names (e.g., "Nicolas Duarte")

### Insurance-Specific Content
- Policy analysis workflow
- Coverage summaries
- Risk identification
- Exclusions and recommendations
- Professional insurance terminology

## Technical Details

### Component Type
- Client component (`'use client'`)
- Static demo (no API calls, no routing, no state management)
- Pure presentation component

### Dependencies
- `lucide-react` icons
- Briki CSS variables (`var(--briki-*)`)
- No external state stores

### Responsive Behavior
- Fixed layout optimized for demo window
- Designed for 1200px max-width container
- All panels maintain proportions

## Integration

The component is integrated into `LandingShowcase.tsx`:

```tsx
import { LandingAgentDemo } from './demos/LandingAgentDemo';

// Inside showcase section
<div className="relative z-10 w-full h-full flex items-center justify-center p-4">
  <LandingAgentDemo />
</div>
```

## Visual Consistency

Matches `LandingDashboardDemo.tsx` in:
- Typography scale
- Border alpha values
- Padding/spacing system
- Color muting strategy
- Hover/active states
- Shadow layering
- Icon sizing

## Result

A professional, enterprise-grade demo that:
- Feels like a real Briki product screen
- Maintains Cursor-level density and polish
- Uses muted, sophisticated colors
- Showcases AI agent capabilities
- Demonstrates policy analysis workflow
- Avoids childish or playful aesthetics
- Uses neutral, professional labeling



