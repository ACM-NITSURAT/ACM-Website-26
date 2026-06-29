# Admin Panel

ACM SVNIT — `acm-nit-surat` project.

Access restricted to `core` and `adviser` roles. Enforced in `src/app/admin/layout.tsx`.

---

## Routes

| Route | Purpose |
|---|---|
| `/admin` | Dashboard — quick-access cards |
| `/admin/events` | Events list with pagination |
| `/admin/create/event` | Create event form |
| `/admin/events/[slug]` | Event detail page |
| `/admin/events/[slug]/edit` | Edit event form |
| `/admin/events/[slug]/participants` | Participants list with analytics + CSV export |
| `/admin/events/[slug]/form` | Form builder |

---

## Layout

`src/app/admin/layout.tsx`

- Checks `useAuth()` on mount. Redirects to `/login` if unauthenticated, to `/` if role is not `core` or `adviser`.
- Renders `<AdminSidebar />` + `<main>` side by side.
- Top offset `pt-[74px]` accounts for the fixed global Navbar.

---

## Sidebar

`src/components/admin/AdminSidebar.tsx`

- Collapsed: `w-14` (56px). Expanded on hover: `w-52` (208px).
- Smooth 200ms ease-out width transition.
- Active route: white left-border indicator.
- Tooltips on collapsed items (hover).
- Sign-out button at the bottom.

---

## Events list (`/admin/events`)

- Fetches all events via `GET /api/admin/events` on mount.
- Table columns: Event name + location, Type badge, Status badge, Start date, Slug.
- Client-side pagination — `PAGE_SIZE = 10`.
- Color-coded badges:
  - Status: blue (upcoming), green (ongoing), grey (finished)
  - Type: violet (event), amber (workshop), cyan (meet)
- Empty state with "Create event" CTA.
- Pulse skeleton during load.

---

## Create event (`/admin/create/event`)

Uses the shared `<EventForm>` component (`src/components/admin/EventForm.tsx`).

### Form sections

1. **Basic info** — name, slug, description, type, status, location, thumbnail URL, tags
2. **Schedule** — start and end datetime
3. **Registration** — max participants, open-to-all toggle, unregistered form toggle

   **Toggle constraint**: turning on *Unregistered form* automatically enables *Open to all* (and vice versa — turning off *Open to all* disables *Unregistered form*). The combination `isOpenToAll=false` + `unregisteredForm=true` is logically invalid and blocked by the UI with an explanatory banner.
4. **Team settings** — team event toggle, min/max members
5. **Diversity** — female mandatory toggle, min female required
6. **Prizes** — total pool, 1st/2nd/3rd breakdown with live budget tracker

### Slug behaviour

- Auto-fills from event name as you type (hyphenates spaces, strips non-alphanumeric).
- Stops auto-filling once manually edited.
- "Use random slug" toggle generates an 8-char alphanumeric ID and disables the field.
- "Regenerate" button available in random mode.

### Thumbnail

- Live preview below the URL field.
- Falls back to `/event-placeholder.jpg` if URL is empty or unreachable.
- Rendered at `EVENT_THUMBNAIL_WIDTH × EVENT_THUMBNAIL_HEIGHT` (1280×720, 16:9, `object-cover`).
- Dimensions defined in `src/config/index.ts`.

### Client-side validation

- `upcoming` → start date must be in the future
- `ongoing` → start in past, end in future
- `finished` → end date in past
- End date must be after start date
- Prize distribution sum ≤ total prize pool
- Min team members ≤ max team members
- Min female required ≤ max team members
- Per-field inline errors with red border on invalid fields

---

## Event detail (`/admin/events/[slug]`)

### Layout

Full-screen two-column on desktop (`lg`+):
- **Left column** (sticky, `w-72 / xl:w-80`): thumbnail + action buttons
- **Right column** (scrollable): all event metadata

Stacks to single column on mobile.

### Action buttons (left column / mobile)

1. **Edit** — navigates to `/admin/events/[slug]/edit`
2. **Delete** — opens confirmation modal. On confirm calls `DELETE /api/admin/events/[slug]` and redirects to `/admin/events`
3. **See participants** — navigates to `/admin/events/[slug]/participants`
4. **Create form / Edit form** — navigates to `/admin/events/[slug]/form`. Shown only for event types that support forms (not in `EVENT_TYPES_WITHOUT_FORMS`). Label changes once form is created.
5. **Form open/close toggle** — calls `PATCH /api/admin/events/[slug]` with `{ isFormOpen: !current }`. Only visible when `hasForm=true`. Visual state: green (open) / grey (closed)

### Thumbnail

- Renders at 16:9 aspect ratio with `object-cover`.
- Falls back to `/event-placeholder.jpg` on error.

### Content sections

- Status/type/contextual badges (open to all, external form, female mandatory)
- Schedule card (start + end)
- Stats grid (registered count, location)
- Participation card — "Team event: 2–4 members" or "Individual event"
- Prize breakdown (only when `prizeMoney > 0`)
- About (description)
- Tags (pill chips)
- Footer: doc ID, slug, creation date

---

## Edit event (`/admin/events/[slug]/edit`)

Same `<EventForm>` component as create, pre-filled with existing data via `eventToFormData()`.

- Loads event via `GET /api/admin/events/[slug]` on mount.
- `slugManuallyEdited` ref initialised to `true` so auto-fill doesn't overwrite the existing slug.
- On save calls `PATCH /api/admin/events/[slug]`.
- After save navigates to `/admin/events/{newSlug}` (handles slug renames correctly).

---

## Form builder (`/admin/events/[slug]/form`)

`src/app/admin/events/[slug]/form/page.tsx`

Accessible from the "Create form" / "Edit form" button on the event detail page. Not available for event types in `EVENT_TYPES_WITHOUT_FORMS`.

### Layout

- **Sticky top bar** — back arrow, breadcrumb, unsaved-changes indicator, save button
- **Event context card** — thumbnail + event name + form title (plain text) + form description (TipTap rich text editor)
- **Default fields toggle** — admin opts in/out of showing built-in identity fields on the registration page. Preview panel shows which default fields would appear.
- **Tabs** — "Form fields" | "After submission"
- **Field list** — drag-to-reorder using `@dnd-kit/sortable`
- **Add question / Add paragraph** buttons

### Field types

| Type | Input | Notes |
|---|---|---|
| `text` | Short text | |
| `email` | Email | Format validated |
| `mobile` | Phone | 10-digit Indian |
| `rollNumber` | Text | `U24CS089` format validated |
| `url` | URL | `http(s)://` required |
| `dropdown` | Select | Admin defines options |
| `checkbox` | Multi-select | Admin defines options |
| `paragraph` | — | Display-only rich text block (TipTap). Not collected. |

### Paragraph fields (TipTap)

Rich-text editor with toolbar: bold, italic, underline, strikethrough, H2/H3, bullet/ordered lists, blockquote, links, images (URL), text colour, table, clear formatting. Content stored as HTML.

### After submission tab

Configures the confirmation screen shown after a successful submission. Fields:
- **Heading** — plain text
- **Body** — TipTap rich text (can include WhatsApp group links, next steps, etc.)

Live preview rendered below the editor.

### Smart type inference (`FORM_INTELLIGENT_MODE`)

When `true`, infers field type from label (≤4 words, exactly one hint group matches):

| Keywords | Inferred type |
|---|---|
| `email` | `email` |
| `roll`, `admission` | `rollNumber` |
| `url`, `link`, `website`, `portfolio`, `github`, `linkedin` | `url` |
| `mobile`, `phone`, `contact` | `mobile` |

### Save button states

| State | Appearance |
|---|---|
| Unsaved changes | White "Save form" |
| Saving | White "Saving…" (disabled) |
| Saved | Green "✓ Form saved" |

### Validation before save

- Title must not be empty
- At least 1 non-paragraph input field
- At least 1 required field
- No duplicate labels (case-insensitive)
- All input fields must have a label
- Dropdown/checkbox must have no empty options

---

## Participants (`/admin/events/[slug]/participants`)

`src/app/admin/events/[slug]/participants/page.tsx`

### Header analytics (3 stat boxes)

- Total registered (all time)
- Registered in last 3 days
- Registered in last 24 hours

### Table columns

When `includeDefaultFields=true`: Submitter Name, Submitter Roll, custom field columns, Attended, Registered At, Doc ID.

When `includeDefaultFields=false`: custom field columns only + Attended, Registered At, Doc ID.

Column headers come from the form field labels. The table is built entirely from `extraFields` keys — no assumption about what data is inside.

### Features

- Client-side search across name, roll number, and all response values
- 25 rows per page
- **Export CSV** — downloads all responses with the same column structure, timestamped filename

---

## Shared components

| Component | Path | Purpose |
|---|---|---|
| `EventForm` | `src/components/admin/EventForm.tsx` | Full event form — create and edit |
| `AdminSidebar` | `src/components/admin/AdminSidebar.tsx` | Collapsible nav sidebar |
| `ToggleRow` | `src/components/ui/ToggleRow.tsx` | Labelled toggle switch row |

### ToggleRow

Reusable accessible toggle used for the form-open switch.

```tsx
<ToggleRow
  checked={event.isFormOpen}
  onChange={handleToggleForm}
  label="Form is open"
  labelOff="Form is closed"
  loading={togglingForm}
/>
```

Track: 44×24px. Thumb: 20×20px, 2px inset. `translate-x-5` when on (exactly 22px travel — no overflow).

---

## Admin API client

`src/lib/firebase/admin-api.ts`

All functions auto-attach `Authorization: Bearer <idToken>` from the current Firebase user.

| Function | Method | Endpoint |
|---|---|---|
| `listEvents()` | GET | `/api/admin/events` |
| `createEvent(data)` | POST | `/api/admin/events` |
| `getEvent(slug)` | GET | `/api/admin/events/[slug]` |
| `updateEvent(slug, data)` | PATCH | `/api/admin/events/[slug]` |
| `deleteEvent(slug)` | DELETE | `/api/admin/events/[slug]` |
| `listParticipants(slug)` | GET | `/api/admin/events/[slug]/participants` |
| `downloadParticipantsCsv(slug)` | GET | `/api/admin/events/[slug]/participants/csv` |
| `getForm(slug)` | GET | `/api/admin/events/[slug]/form` |
| `saveForm(slug, data)` | PUT | `/api/admin/events/[slug]/form` |
| `deleteForm(slug)` | DELETE | `/api/admin/events/[slug]/form` |

---

## Middleware

`/admin/*` routes bypass the onboarding gate. Public routes (`/events`, `/events/*`, etc.) bypass all auth gates — defined in `src/config/routes.ts`. Access control for admin is handled by the admin layout guard.

---

## Config flags (`src/config/index.ts`)

| Constant | Default | Purpose |
|---|---|---|
| `EVENT_THUMBNAIL_WIDTH/HEIGHT` | `1280 / 720` | Thumbnail render dimensions (16:9) |
| `EVENT_THUMBNAIL_ASPECT_RATIO` | `"1280 / 720"` | CSS aspect-ratio string |
| `EVENT_TYPES_WITHOUT_FORMS` | `['meet']` | Event types that cannot have forms or registrations |
| `FORM_MAX_FIELDS` | `50` | Max custom fields per form |
| `FORM_INTELLIGENT_MODE` | `true` | Enable smart type inference in form builder |

See also `src/config/routes.ts` — `PUBLIC_ROUTES` array and `isPublicRoute()` helper.
