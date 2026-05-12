/**
 * @surayaorg/adapter-claude-swarm
 *
 * Wraps @surayaorg/brain-sdk for claude-swarm runtimes. Same retrieve/emit
 * surface as the agent-teams adapter, plus two swarm-specific helpers.
 */
import { BrainClient } from "@surayaorg/brain-sdk";
import type {
  ObservationInput,
  RetrieveResult,
} from "@surayaorg/brain-sdk";

export type ConnectOptions = {
  projectSlug: string;
  hmacSecret?: string;
  bootstrapToken?: string;
  baseUrl?: string;
};

// Duck-typed swarm agent + turn shapes; claude-swarm SDK isn't a hard
// dep here.
export type SwarmAgent = {
  id: string;
  systemPrompt?: string;
  lastUserMessage?: string;
};

export type SwarmTurn = {
  agent_id: string;
  swarm_id: string;
  stop_reason?: string;
  content?: string;
  user_message?: string;
};

export type SwarmBrainProxy = {
  client: BrainClient;
  retrieve(q: string, topK?: number): Promise<RetrieveResult[]>;
  retrieveForAgent(agent: SwarmAgent, topK?: number): Promise<RetrieveResult[]>;
  emit(observation: ObservationInput): Promise<void>;
  emitFromTurn(turn: SwarmTurn, projectSlug?: string): Promise<void>;
  formatAsContext(results: RetrieveResult[]): string;
};

function connect(options: ConnectOptions): SwarmBrainProxy {
  const client = new BrainClient({
    baseUrl: options.baseUrl ?? "https://brain.suraya.ai",
    projectSlug: options.projectSlug,
    ...(options.hmacSecret ? { hmacSecret: options.hmacSecret } : {}),
    ...(options.bootstrapToken ? { bootstrapToken: options.bootstrapToken } : {}),
  });

  function formatAsContext(results: RetrieveResult[]): string {
    if (results.length === 0) return "Brain context: no observations matched.";
    return [
      `Brain context (top ${results.length} observations):`,
      ...results.map(
        (r, i) =>
          `  ${i + 1}. [${r.type}] ${r.representative_summary} (sim ${r.similarity.toFixed(2)})`
      ),
    ].join("\n");
  }

  return {
    client,

    async retrieve(q, topK = 5): Promise<RetrieveResult[]> {
      const res = await client.retrieve({ q, topK });
      return res.results;
    },

    async retrieveForAgent(agent, topK = 5): Promise<RetrieveResult[]> {
      const q = agent.lastUserMessage?.trim();
      if (!q) return [];
      const res = await client.retrieve({ q, topK });
      return res.results;
    },

    async emit(observation): Promise<void> {
      await client.emitObservation(observation);
    },

    async emitFromTurn(turn, projectSlug): Promise<void> {
      const summary =
        turn.stop_reason === "tool_use"
          ? `Swarm agent ${turn.agent_id} dispatched tool call`
          : turn.stop_reason === "end_turn"
            ? `Swarm agent ${turn.agent_id} completed turn`
            : `Swarm agent ${turn.agent_id} stopped (${turn.stop_reason ?? "unknown"})`;
      await client.emitObservation({
        type: "decision",
        representative_summary: summary.slice(0, 300),
        criticality: "low",
        actor_handle: `swarm:${turn.agent_id}`,
        ...(projectSlug ? { project_slug: projectSlug } : {}),
        tags: ["swarm", `swarm:${turn.swarm_id}`],
        payload: { stop_reason: turn.stop_reason, content_preview: turn.content?.slice(0, 200) },
      });
    },

    formatAsContext,
  };
}

export const suraya = { connect };
