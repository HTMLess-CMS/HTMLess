# HTMLess — Admin UI Design

_Last updated: 2026-04-02_

## Design Philosophy

**Cleaner than Strapi. Faster than WordPress.**

The admin UI is the product. Content editors spend hours in it daily. Every interaction must feel instant. Every screen must be self-explanatory. No documentation needed for basic operations.

## Core Design Principles

1. **Zero-config first impression** — New users see a schema builder, not a settings maze
2. **Keyboard-first** — Power users never touch the mouse
3. **Instant feedback** — Every action responds in <100ms (optimistic UI)
4. **Progressive disclosure** — Simple by default, powerful on demand
5. **Dark mode native** — Dark is default, light is the option

## Navigation Structure

```
┌─────────────────────────────────────────────────┐
│  HTMLess                          [Space ▼] [👤] │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│  Content │  Main workspace area                 │
│  Schema  │                                      │
│  Media   │  Changes based on active section     │
│  ───────-│                                      │
│  Webhooks│                                      │
│  Tokens  │                                      │
│  Users   │                                      │
│  Settings│                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

## Key Screens

### 1. Schema Builder (THE Killer Feature)

The schema builder must feel like **Notion + Airtable combined**:
- Drag-and-drop field ordering
- Click-to-add field types from a palette
- Inline field configuration (no modals for simple settings)
- Live preview of the content editor as you build
- Visual relationship mapping between types

```
┌─────────────────────────────────────────────────┐
│  Schema: Article                    [Save Draft] │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌─ title ──────────────────── Text (required) ┐│
│  │  Single line                                 ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌─ slug ───────────────────── Slug (auto)     ┐│
│  │  Generated from: title                       ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌─ body ───────────────────── Blocks          ┐│
│  │  Allowed: paragraph, heading, image, callout ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌─ author ─────────────────── Reference       ┐│
│  │  → User                                      ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  ┌─ categories ─────────────── Taxonomy        ┐│
│  │  → Category (multiple)                       ││
│  └──────────────────────────────────────────────┘│
│                                                  │
│  [+ Add Field]                                   │
│                                                  │
│  Field Types: Text | Number | Boolean | Date |   │
│  Rich Text | Blocks | Media | Reference |        │
│  Taxonomy | Enum | JSON | Slug                   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 2. Content Editor

Block-based, split between metadata sidebar and content area:

```
┌─────────────────────────────────────────────────┐
│  Edit: Hello World               [Draft ▼] [⚡] │
├────────────────────────────┬────────────────────┤
│                            │  Status: Draft     │
│  Hello World               │  Author: Jane      │
│  ════════════              │  Categories: [Tech] │
│                            │  Slug: hello-world  │
│  [¶] This is the first     │  ─────────────────  │
│  paragraph of the article. │  Created: Apr 2     │
│                            │  Modified: Apr 2    │
│  [H2] Why HTMLess          │  ─────────────────  │
│                            │  [Preview]          │
│  [¶] Because structured    │  [Save Draft]       │
│  content matters.          │  [Publish]          │
│                            │  [Schedule...]      │
│  [img] hero.jpg            │  ─────────────────  │
│        alt: "Hero image"   │  Versions (3)       │
│                            │  ├─ v3 draft (now)  │
│  [callout:info]            │  ├─ v2 published    │
│  This is important.        │  └─ v1 draft        │
│                            │                     │
│  [+ Add block]             │                     │
│                            │                     │
└────────────────────────────┴────────────────────┘
```

### 3. Media Library

Grid view with instant search and drag-to-upload:

```
┌─────────────────────────────────────────────────┐
│  Media Library              [Search...] [Upload] │
├─────────────────────────────────────────────────┤
│  Filter: [All ▼] [Images ▼] [Sort: Recent ▼]   │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ 📷     │ │ 📷     │ │ 📷     │ │ 📄     │   │
│  │        │ │        │ │        │ │        │   │
│  │hero.jpg│ │logo.png│ │bg.webp │ │doc.pdf │   │
│  │1.2 MB  │ │45 KB   │ │890 KB  │ │2.1 MB  │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐              │
│  │ 📷     │ │ 📷     │ │ 📷     │              │
│  │        │ │        │ │        │              │
│  │team.jpg│ │icon.svg│ │banner. │              │
│  │3.5 MB  │ │12 KB   │ │1.8 MB  │              │
│  └────────┘ └────────┘ └────────┘              │
│                                                  │
│  Drop files here to upload                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Tech Stack (Admin)

| Layer        | Choice          | Why                                    |
|--------------|-----------------|----------------------------------------|
| Framework    | Next.js 15      | App router, RSC, fast navigation       |
| Styling      | Tailwind CSS    | Utility-first, consistent, fast builds |
| Components   | Radix UI        | Accessible primitives, unstyled        |
| State        | Zustand         | Simple, no boilerplate                 |
| Data fetching| TanStack Query  | Cache, optimistic updates, pagination  |
| Editor       | TipTap / Custom | Block-based rich text                  |
| DnD          | dnd-kit         | Schema builder drag-and-drop           |
| Icons        | Lucide          | Clean, consistent icon set             |

## Color System

```
Background:    #0a0a0a (dark) / #ffffff (light)
Surface:       #141414 / #f8f9fa
Border:        #262626 / #e2e8f0
Text Primary:  #ffffff / #1a202c
Text Secondary:#a0aec0 / #718096
Accent:        #6366f1 (indigo-500)
Success:       #22c55e
Warning:       #f59e0b
Danger:        #ef4444
```
