# Contributing Guidelines

Hey team! We are already working on this together, and honestly, we are going to build a great platform. To keep our codebase clean, avoid annoying merge conflicts, and make sure everything runs smoothly without anyone losing their mind, here are a few friendly guidelines we can all try to follow.

> **AI Tooling Tip:** If you are using an AI agentic IDE, try adding this `CONTRIBUTING.md` file as a steering document or context file in your system rules. It will help your AI assistant automatically write branches and commits that match our style!

---

## 1. Branch Naming Strategy

Let's try to avoid pushing directly to the `main` branch so we don't accidentally break anything in production. When you are getting ready to work on something, please try to create a local branch using this simple format:

`[your-name]/[category]/[short-description]`

### Categories we use:
* `feat`: For introducing new features or structural elements.
* `chore`: For routine maintenance, adjusting configurations, or updating dependencies.
* `refactor`: For cleaning up or restructuring existing code without changing how it behaves.
* `tweak`: For minor adjustments, small polishes, or quick localized edits.

### Examples:
* `aayush/feat/add-team-finder-page`
* `aayush/tweak/adjust-header-padding`
* `siddharth/chore/update-database-schema`

---

## 2. Issue and Pull Request Tags

To help keep our project board organized, let's try to classify pull requests or issues using these labels:

* `feature`: New components, pages, or system capabilities.
* `bug`: Fixing broken interfaces, logic flaws, or unintended behaviors.
* `refactor`: Internal structural improvements or performance tune-ups.
* `chore`: Tooling configuration, dependency management, or environment updates.
* `docs`: Modifications to markdown files, documentation, or inline comments.
* `style`: Visual adjustments, layout formatting, or aesthetic corrections that don't alter logic.
* `perf`: Changes targeted at speed, optimization, or execution efficiency.
* `test`: Introducing automated tests or altering testing architecture.
* `tweak`: Minor corrections, fixing typos, or small visual polishments that don't need a massive label.

---

## 3. Conventional Imperative Commits

Let's try to write our commit messages in the **imperative mood** (phrase it like a command to the codebase, e.g., "Fix bug", instead of "Fixed bug" or "Fixes bug"). 

To keep things descriptive, try to include a small scope in parentheses so we know exactly where the changes happened.

### The Standard Format:
`type(scope): description starting with a lowercase letter`

### Examples:

#### Adding Functional Capabilities
* **Better:** `feat(auth): implement session validation via secure tokens`
* **Good:** `feat: added authentication`

#### Fixing Defects
* **Better:** `fix(navigation): resolve layout breakdown on screens smaller than 360px`
* **Good:** `bug: fix navbar mobile view`

#### Styling and Visual Refinements
* **Better:** `style(theme): change background opacity to improve text contrast`
* **Good:** `chore: update colors`

#### Small Polishes and Corrections
* **Better:** `tweak(readme): correct typographical error in initialization step`
* **Good:** `docs: fixed spelling`

#### System Maintenance
* **Better:** `chore(deps): upgrade package dependencies to secure versions`
* **Good:** `feat: ran npm update`

---

## 4. Pull Requests and Code Review

Once your branch is ready and tested, go ahead and open a Pull Request against the `main` branch. 

Before submitting, please try to pull the latest changes from `main` into your branch just to clear out any accidental overlap. When you open the PR, simply tag **Aayush** or **Siddharth** for a quick code review so we can keep each other in the loop and catch any rogue bugs before they slide into production.

---

## 5. Pull Request Format

When opening a PR, please try to use the following clear format in the description text area:

```markdown
## What changed?
(Provide a brief summary of the changes or components you worked on)

## Why is it needed?
(A sentence or two providing context or linking the issue being addressed)

## How to test?
(List quick steps or pages to visit so the reviewer can verify everything works)
