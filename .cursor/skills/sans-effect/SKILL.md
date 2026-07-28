---
name: sans-effect
description: "Enforce a no-direct-useEffect discipline in React/TypeScript codebases. Use this skill whenever writing, reviewing, refactoring, or generating React component code — especially when the output contains useEffect, when the user asks to fix infinite loops or race conditions, when building new components or features in React, when an AI agent is generating React code, or when the user mentions 'useEffect', 'effect cleanup', 'dependency array', 'infinite loop', 'race condition', or 'stale state'. Also trigger when creating React artifacts, dashboards, or interactive widgets. This skill prevents the #1 class of React bugs by replacing raw useEffect with declarative alternatives."
author: "Debarshi Das"
---

# Effectless React

**Zero direct `useEffect` calls. Ever.**

This skill enforces a battle-tested engineering rule: never call `useEffect` directly in components. Every pattern that developers reach for `useEffect` to solve has a better, more declarative alternative that is easier to reason about, harder to break, and produces fewer renders.

This matters doubly when AI agents write code — `useEffect` is the hook agents add "just in case," and that move seeds the next race condition, infinite loop, or phantom re-render.

---

## The Rule

```
useEffect → BANNED in components
```

The only sanctioned escape hatch is `useMountEffect` — a named wrapper that makes intent explicit:

```typescript
function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
```

If you catch yourself writing `useEffect(` anywhere else, **stop**. One of the five replacement patterns below covers your case.

---

## Why This Exists

Direct `useEffect` causes four compounding problems:

1. **Brittleness** — Dependency arrays hide coupling. An unrelated refactor silently changes effect behavior.
2. **Infinite loops** — `state update → render → effect → state update` spirals, especially when dep lists get "fixed" incrementally.
3. **Dependency hell** — Effect chains (A sets state → triggers B) create time-based control flow that is hard to trace and easy to regress.
4. **Debugging pain** — "Why did this run?" / "Why didn't this run?" with no clear entrypoint like a handler.

### The Bug Spectrum

| `useMountEffect` bugs | Correct | `useEffect` bugs |
|---|---|---|
| **0 calls** — feature never initializes | **1 call** — stable mount, deterministic logic | **2+ calls → ∞** — race conditions, memory leaks, infinite loops |
| Obvious, loud, caught in dev | ✅ | Subtle, gradual degradation, hits prod |

**Choose your bug class.** Mount-effect failures are binary and loud. Direct useEffect failures degrade gradually and show up as flaky behavior, perf issues, or loops before a hard crash.

---

## The Five Replacement Patterns

### Pattern 1: Derive State — Don't Sync It

**Smell test:** You're about to write `useEffect(() => setX(deriveFromY(y)), [y])` or you have state that only mirrors other state/props.

```typescript
// ❌ BAD: Two render cycles — first stale, then filtered
function ProductList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);

  useEffect(() => {
    setFilteredProducts(products.filter((p) => p.inStock));
  }, [products]);
}

// ✅ GOOD: Compute inline in one render
function ProductList() {
  const [products, setProducts] = useState([]);
  const filteredProducts = products.filter((p) => p.inStock);
}
```

Loop hazard example:

```typescript
// ❌ BAD: total in deps can loop
function Cart({ subtotal }) {
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => { setTax(subtotal * 0.1); }, [subtotal]);
  useEffect(() => { setTotal(subtotal + tax); }, [subtotal, tax, total]);
}

// ✅ GOOD: No effects required
function Cart({ subtotal }) {
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
}
```

**For expensive computations**, use `useMemo` — not `useEffect` + `setState`:

```typescript
const visibleTodos = useMemo(
  () => getFilteredTodos(todos, filter),
  [todos, filter]
);
```

### Pattern 2: Use Data-Fetching Libraries

**Smell test:** Your effect does `fetch(...)` then `setState(...)`. You're re-implementing caching, retries, cancellation, or stale handling.

```typescript
// ❌ BAD: Race condition risk, no caching, no cancellation
function ProductPage({ productId }) {
  const [product, setProduct] = useState(null);
  useEffect(() => {
    fetchProduct(productId).then(setProduct);
  }, [productId]);
}

// ✅ GOOD: Library handles cancellation/caching/staleness
function ProductPage({ productId }) {
  const { data: product } = useQuery(
    ['product', productId],
    () => fetchProduct(productId)
  );
}
```

Use React Query / TanStack Query, SWR, or your framework's built-in data fetching. If you must fetch in an effect (no library available), **always add cleanup** to ignore stale responses:

```typescript
useEffect(() => {
  let ignore = false;
  fetchResults(query).then(json => {
    if (!ignore) setResults(json);
  });
  return () => { ignore = true; };
}, [query]);
```

But extract this into a custom hook like `useData(url)` — never leave raw fetch-in-effect in a component.

### Pattern 3: Event Handlers — Not Effects

**Smell test:** State is used as a flag so an effect can do the real action. You're building "set flag → effect runs → reset flag" mechanics.

```typescript
// ❌ BAD: Effect as an action relay
function LikeButton() {
  const [liked, setLiked] = useState(false);
  useEffect(() => {
    if (liked) { postLike(); setLiked(false); }
  }, [liked]);
  return <button onClick={() => setLiked(true)}>Like</button>;
}

// ✅ GOOD: Direct event-driven action
function LikeButton() {
  return <button onClick={() => postLike()}>Like</button>;
}
```

If you need to share logic between multiple handlers, extract a function — don't use an effect as a relay:

```typescript
function buyProduct() {
  addToCart(product);
  showNotification(`Added ${product.name} to cart!`);
}

function handleBuyClick() { buyProduct(); }
function handleCheckoutClick() { buyProduct(); navigateTo('/checkout'); }
```

### Pattern 4: `useMountEffect` for One-Time External Sync

**Smell test:** You're synchronizing with an external system. The behavior is "setup on mount, cleanup on unmount."

Legitimate uses:
- DOM integration (focus, scroll)
- Third-party widget lifecycles
- Browser API subscriptions (WebSocket, IntersectionObserver)

```typescript
// ❌ BAD: Guard inside effect
function VideoPlayer({ isLoading }) {
  useEffect(() => {
    if (!isLoading) playVideo();
  }, [isLoading]);
}

// ✅ GOOD: Mount only when preconditions are met via conditional rendering
function VideoPlayerWrapper({ isLoading }) {
  if (isLoading) return <LoadingScreen />;
  return <VideoPlayer />;
}

function VideoPlayer() {
  useMountEffect(() => playVideo());
}
```

**Conditional mounting** is the pattern: parents own orchestration and lifecycle boundaries; children assume preconditions are already met.

### Pattern 5: Reset with `key` — Not Dependency Choreography

**Smell test:** Your effect's only job is to reset local state when an ID/prop changes. You want the component to behave like a brand-new instance per entity.

```typescript
// ❌ BAD: Effect to emulate remount
function VideoPlayer({ videoId }) {
  useEffect(() => { loadVideo(videoId); }, [videoId]);
}

// ✅ GOOD: key forces clean remount
function VideoPlayerWrapper({ videoId }) {
  return <VideoPlayer key={videoId} videoId={videoId} />;
}

function VideoPlayer({ videoId }) {
  useMountEffect(() => { loadVideo(videoId); });
}
```

For state resets specifically:

```typescript
// ❌ BAD: Effect to reset comment on user change
function ProfilePage({ userId }) {
  const [comment, setComment] = useState('');
  useEffect(() => { setComment(''); }, [userId]);
}

// ✅ GOOD: key-based remount
function ProfilePage({ userId }) {
  return <Profile userId={userId} key={userId} />;
}

function Profile({ userId }) {
  const [comment, setComment] = useState('');
  // Fresh state per userId — no effect needed
}
```

---

## Component Tree Design

Banning direct `useEffect` is a forcing function for cleaner component trees:

- **Parents** own orchestration and lifecycle boundaries
- **Children** assume preconditions are met
- Each component does one job; coordination happens at clear boundaries

This is Unix philosophy applied to React: compose small, focused units with explicit interfaces.

### Architecture Pattern

```
<MainLayout />              ← mounts once
  <AuthProvider key={userId} />  ← remounts on auth change
    <NavBar />               ← WebSocket subscription via useMountEffect
    <SessionDetailPage key={sessionId} />  ← remounts per session
      <MessageHistory />     ← derives display from props
      <FileView />           ← external sync via useMountEffect
      <ChatInput />          ← event handlers only
```

---

## Decision Flowchart

When you're about to write `useEffect`, ask:

1. **Am I computing state from other state/props?** → **Derive it inline** (Pattern 1)
2. **Am I fetching data?** → **Use a data-fetching library** (Pattern 2)
3. **Am I responding to a user action?** → **Use an event handler** (Pattern 3)
4. **Am I syncing with an external system on mount?** → **Use `useMountEffect`** (Pattern 4)
5. **Am I resetting state when a prop/ID changes?** → **Use `key` for remount** (Pattern 5)

If none of these apply, you've found a genuinely rare case. Wrap it in a **custom hook** with a descriptive name that documents intent — never leave a bare `useEffect` in a component.

---

## Enforcement

- **ESLint**: Use `no-restricted-syntax` to ban direct `useEffect` calls
- **Agent guidance**: Include this rule in `AGENTS.md`, `.cursorrules`, or system prompts
- **Code review**: Any PR introducing a direct `useEffect` must justify why none of the five patterns apply

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-syntax": [
      "error",
      {
        "selector": "CallExpression[callee.name='useEffect']",
        "message": "Direct useEffect is banned. Use useMountEffect for mount-only effects, derive state inline, use event handlers, or use key-based remounting. See effectless-react skill."
      }
    ]
  }
}
```

---

## Quick Reference

| Instead of... | Use... |
|---|---|
| `useEffect(() => setX(f(y)), [y])` | `const x = f(y)` |
| `useEffect(() => setX(expensiveF(y)), [y])` | `const x = useMemo(() => expensiveF(y), [y])` |
| `useEffect(() => fetch(...).then(setState), [id])` | `useQuery` / `useSWR` / custom `useData` hook |
| `useEffect(() => { if (flag) doAction() }, [flag])` | `onClick={() => doAction()}` |
| `useEffect(setup, [])` | `useMountEffect(setup)` |
| `useEffect(() => reset(), [id])` | `<Component key={id} />` |
| `useEffect(() => onChange(state), [state])` | Call `onChange` in the event handler alongside `setState` |
