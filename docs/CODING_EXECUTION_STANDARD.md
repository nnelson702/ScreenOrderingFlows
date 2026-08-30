# Coding Execution Standard

## Purpose

This document defines the preferred execution model for coding projects. It is intentionally general and should be reused across future technical projects, not just this repository.

The goal is to keep the business owner out of direct code editing while still allowing fast, controlled implementation through GitHub, Copilot, pull requests, review, and smoke testing.

## Core principle

The business owner should define the outcome, test the workflow, and approve the behavior. The coding agents should handle implementation, review, and technical risk management through GitHub.

The preferred process is:

```text
Clarify requirements -> document the spec -> implement through GitHub -> review the diff -> merge -> deploy -> smoke test -> document defects -> repeat
```

## Roles

### Business owner

The business owner owns:

- Desired workflow and operational outcome
- Approval of wording, layout, process, and user experience
- Real-world testing and feedback
- Priority decisions
- Go/no-go decisions

The business owner should not be expected to directly edit code.

### ChatGPT / assistant

The assistant owns:

- Translating business requirements into technical specs
- Inspecting the repository and current implementation
- Creating issues, branches, documentation, and safe pull requests when possible
- Reviewing pull request diffs
- Identifying risk before merge
- Writing precise Copilot prompts when direct patching is unsafe
- Managing merge recommendations
- Building test plans and smoke-test checklists

### GitHub Copilot / coding agent

Copilot should be used when:

- A change requires careful edits inside a large backend or large single-file application
- The assistant cannot safely apply a targeted patch through available GitHub tools
- The change needs local validation, syntax checks, CodeQL review, or a full-file context

Copilot should receive exact instructions, including:

- File or files to edit
- Required behavior
- Out-of-scope areas not to touch
- Acceptance criteria
- Validation commands
- Pull request title/body expectations

## Standard workflow

### 1. Clarify the business behavior

Before code changes, define the workflow in plain English.

Capture:

- What should happen
- Who triggers it
- Who receives communication
- What human action is required
- What should not happen
- What counts as success

Do not start coding while the operational process is unclear.

### 2. Create a design or process spec first when needed

For workflows, emails, forms, customer experience, or internal operations, document and approve the intended behavior before coding.

Preferred artifacts:

- Markdown spec in `/docs`
- GitHub issue with acceptance criteria
- Mockup document or PDF when visual review matters
- Screenshots or annotated examples when managers or non-technical users need to understand the process

### 3. Make small scoped branches

Each branch should target one clear change.

Good examples:

- `fix-status-email-idempotency`
- `implement-lifecycle-email-templates`
- `fix-vendor-form-colors`
- `add-api-proxy-route`

Avoid large mixed branches that combine unrelated fixes.

### 4. Use direct GitHub edits only when safe

The assistant can make direct GitHub changes when the scope is small and the file is safe to replace or update with high confidence.

Examples:

- Documentation
- Configuration files
- Small standalone JavaScript files
- Isolated front-end helper files
- Visual guide assets or markdown specs

Direct edits should still go through a branch and pull request unless the urgency and risk are both low.

### 5. Use Copilot for large or risky code changes

If a file is large, backend-critical, or controls multiple workflows, do not make a blind full-file replacement from partial context.

Instead:

1. Create a GitHub issue with exact implementation guidance.
2. Give Copilot a precise prompt.
3. Have Copilot open a code-only PR.
4. Review the diff before merge.

This is the preferred pattern for backend Workers, payment logic, authentication, order lifecycle logic, and other high-risk areas.

### 6. Review before merge

Every functional PR should be reviewed for:

- Scope control
- Correct behavior
- No unrelated changes
- No schema changes unless explicitly approved
- No regression risk in payment, auth, routing, pricing, or status transitions
- Correct environment/config assumptions
- Clean validation output

If risk is found, request changes before merge.

### 7. Merge only after the diff is understood

Do not merge simply because a PR says tests passed.

Merge only after:

- The changed files match the intended scope
- The business behavior is implemented
- The code path is understood enough to trust it
- Any blockers are resolved
- Validation has passed or a reason is documented

### 8. Deploy the correct system

Identify which deployment target is affected.

Examples:

- Front-end/static page or Vercel config changes require Vercel deployment.
- Cloudflare Worker code or `api/wrangler.jsonc` changes require Worker deployment.
- Environment variable/config changes may require a Worker redeploy if managed by Wrangler config.

Do not assume Vercel deployment updates the API Worker.

### 9. Smoke test the real workflow

After deployment, test the real workflow end to end.

A good smoke test should include:

- Creating a realistic fake record
- Progressing it through each status or stage
- Verifying emails and outputs
- Checking dashboard state
- Checking vendor forms or documents
- Confirming no duplicate sends or repeated side effects
- Capturing screenshots for defects

### 10. Convert defects into focused issues

When testing finds a bug, create a focused issue with:

- What happened
- What should have happened
- Steps to reproduce
- Screenshot or quote/order ID when available
- Suspected root cause if known
- Acceptance criteria

Then repeat the branch, PR, review, merge, deploy, smoke-test cycle.

## Pull request rules

A good PR should include:

- Clear title
- Summary of behavior changed
- Files changed
- Explicit out-of-scope list
- Test/validation notes
- Deployment notes if relevant

For code PRs, prefer code-only unless documentation changes are directly required.

## Copilot prompt template

Use this structure when asking Copilot to implement a change:

```text
Create a code-only PR.

Repository: [repo]
Branch name: [branch]
Issue/spec: [issue or doc]
Files to edit: [specific files]

Required behavior:
- [specific behavior]
- [specific behavior]
- [specific behavior]

Do not change:
- [protected area]
- [protected area]
- [protected area]

Acceptance criteria:
- [testable outcome]
- [testable outcome]
- [testable outcome]

Validation:
- Run [command]
- Confirm [result]

Open PR titled: [title]
```

## Safety rules

- Do not hot-edit production systems when GitHub review is available.
- Do not merge large backend changes without diff review.
- Do not mix unrelated fixes in one PR unless there is a strong reason.
- Do not let environment variables drift between dashboard and repo-managed config.
- Do not rely on screenshots alone when network errors or backend behavior can be inspected.
- Do not ask the business owner to perform direct coding work unless there is no other option.

## Preferred operating memory

For future coding projects, use GitHub as the source of truth and execution hub. The business owner provides requirements and testing feedback. The assistant manages specs, issues, safe direct edits, PR review, and technical orchestration. Copilot is used for large or risky code changes that require full repository context or local validation. All implementation should move through branch, PR, review, merge, deploy, and smoke test.
