# @surayaorg/adapter-claude-swarm

Adapter for the claude-swarm multi-agent runtime. MIT-licensed.

G4 (v1.3 §6.4). Same pattern as `@surayaorg/adapter-anthropic-agent-teams`; the wire surface differs because claude-swarm hooks at a different lifecycle layer.

> **Sandbox note.** Lives in suraya meta at `apps/adapter-claude-swarm/` until `surayainc/adapter-claude-swarm` is created.

## Quick start

```typescript
import { suraya } from "@surayaorg/adapter-claude-swarm";

const brain = suraya.connect({
  projectSlug: "my-project",
  hmacSecret: process.env.SURAYA_BRAIN_WEBHOOK_SECRET_MY_PROJECT,
});

// In your swarm config:
swarm.beforeAgent = async (agent) => {
  const context = await brain.retrieveForAgent(agent);
  agent.systemPrompt += "\n\n" + context;
};

swarm.afterTurn = async (turn) => {
  brain.emitFromTurn(turn);
};
```

## API

Same shape as the agent-teams adapter (retrieve / emit / formatAsContext / flush), plus swarm-specific helpers:

- `retrieveForAgent(agent)` — uses the agent's last user message as the query
- `emitFromTurn(turn)` — auto-emits an observation derived from the turn's stop_reason + content

## Status (2026-05-23)

- ✅ README
- ✅ package.json + tsconfig
- ✅ Reuses the agent-teams `BrainProxy` shape via shared types
- ❌ Actual swarm hook integration (out-of-band; depends on claude-swarm SDK shape)
- ❌ Tests
- ❌ npm publish (gated on OQ-15)
