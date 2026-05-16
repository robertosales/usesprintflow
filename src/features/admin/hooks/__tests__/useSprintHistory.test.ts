import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSprintHistory } from "../useSprintHistory";

const waitFor = async (assertion: () => void) => {
  for (let i = 0; i < 20; i++) {
    try { assertion(); return; } catch (error) {
      if (i === 19) throw error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
};

// ── Mocks ─────────────────────────────────────────────────────────────────
const TEAM_A = { id: "team-a", name: "Time Alpha", module: "sala_agil" };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ teams: [TEAM_A] }),
}));

const mockFrom = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mockFrom },
}));

function makeQuery(data: unknown[]) {
  const chain: any = {
    select:  () => chain,
    eq:      () => chain,
    in:      () => chain,
    order:   () => chain,
    range:   () => Promise.resolve({ data, error: null }),
    then:    (cb: any) => Promise.resolve({ data, error: null }).then(cb),
  };
  return chain;
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const CLOSED_DATE = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

const SPRINTS = [
  { id: "sp-1", name: "Sprint 1", is_active: false, closed_at: CLOSED_DATE, end_date: CLOSED_DATE, delay_days: 0,    team_id: "team-a" },
  { id: "sp-2", name: "Sprint 2", is_active: false, closed_at: CLOSED_DATE, end_date: CLOSED_DATE, delay_days: 2,    team_id: "team-a" },
  { id: "sp-3", name: "Sprint 3", is_active: true,  closed_at: null,        end_date: null,        delay_days: null, team_id: "team-a" }, // ativa, não aparece no histórico
];

const USER_STORIES = [
  { id: "hu-1", status: "Concluída",    story_points: 5,  sprint_id: "sp-1", team_id: "team-a" },
  { id: "hu-2", status: "Não Concluída", story_points: 3,  sprint_id: "sp-1", team_id: "team-a" },
  { id: "hu-3", status: "Concluída",    story_points: 8,  sprint_id: "sp-2", team_id: "team-a" },
];

beforeEach(() => {
  mockFrom.mockImplementation((table: string) => {
    if (table === "sprints")      return makeQuery(SPRINTS);
    if (table === "user_stories") return makeQuery(USER_STORIES);
    return makeQuery([]);
  });
});

// ── Testes ─────────────────────────────────────────────────────────────────

describe("useSprintHistory", () => {
  it("inicia em loading e lista de sprints vazia", () => {
    const { result } = renderHook(() => useSprintHistory());
    expect(result.current.loading).toBe(true);
    expect(result.current.sprints).toHaveLength(0);
  });

  it("retorna apenas sprints encerradas (is_active=false e closed_at preenchido)", async () => {
    const { result } = renderHook(() => useSprintHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ids = result.current.sprints.map(s => s.id);
    expect(ids).toContain("sp-1");
    expect(ids).toContain("sp-2");
    expect(ids).not.toContain("sp-3"); // sprint ativa não entra no histórico
  });

  it("calcula velocity (pontos das HUs concluídas) por sprint", async () => {
    const { result } = renderHook(() => useSprintHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const sp1 = result.current.sprints.find(s => s.id === "sp-1");
    expect(sp1?.velocityPontos).toBe(5); // somente hu-1 concluída

    const sp2 = result.current.sprints.find(s => s.id === "sp-2");
    expect(sp2?.velocityPontos).toBe(8); // hu-3 concluída
  });

  it("propaga delay_days da sprint para o histórico", async () => {
    const { result } = renderHook(() => useSprintHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const sp2 = result.current.sprints.find(s => s.id === "sp-2");
    expect(sp2?.delayDays).toBe(2);
  });

  it("filtro por teamId reduz os resultados", async () => {
    const { result } = renderHook(() => useSprintHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFilterTeam("team-a"));
    expect(result.current.sprints.every(s => s.teamId === "team-a")).toBe(true);
  });

  it("não falha com dados vazios", async () => {
    mockFrom.mockImplementation(() => makeQuery([]));
    const { result } = renderHook(() => useSprintHistory());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sprints).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});
