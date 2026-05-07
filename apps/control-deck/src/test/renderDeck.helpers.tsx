import { type ComponentProps } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within
} from "@testing-library/react";
import { deriveSupervisorState } from "@threadsmith/runtime";
import { afterEach, beforeEach, expect, vi } from "vitest";
import { App, DeckScreen } from "../App";
import { events, projectSupervision, runningLatestRun, state } from "./renderDeck.fixtures";
import { useDeckStore } from "../features/deck/useDeckStore";

export function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });
  fireEvent(window, new Event("resize"));
}

export function registerRenderDeckTestLifecycle() {
  afterEach(() => {
    cleanup();
    useDeckStore.setState({ drawer: null, previewAction: null });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    setViewportWidth(1440);
  });
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

export type DeckRenderOverrides = Partial<ComponentProps<typeof DeckScreen>>;

export function buildDeckScreenProps(
  overrides: DeckRenderOverrides = {}
): ComponentProps<typeof DeckScreen> {
  return {
    projectRoot: "/tmp/project",
    currentProjectSourceId: "fresh-demo",
    currentProjectSourceLabel: "最新 packet 示例",
    customProjectDraft: "",
    customProjectError: null,
    customProjectErrorKind: null,
    isConnectingCustomProject: false,
    isInitializingCustomProject: false,
    recentProjects: [],
    supervisorState: deriveSupervisorState(state, events, runningLatestRun, null, projectSupervision),
    loading: false,
    error: null,
    errorKind: null,
    actionHistoryLength: 0,
    onSelectProjectSource: vi.fn(),
    onCustomProjectDraftChange: vi.fn(),
    onConnectCustomProject: vi.fn(),
    onInitializeCustomProject: vi.fn(),
    onPinRecentProject: vi.fn(),
    onUnpinRecentProject: vi.fn(),
    onRemoveRecentProject: vi.fn(),
    onRunAction: async () => {},
    onApplyTransition: async () => {},
    ...overrides
  };
}

export function renderDeckScreen(overrides: DeckRenderOverrides = {}) {
  return render(<DeckScreen {...buildDeckScreenProps(overrides)} />);
}

export function renderThreadsmithApp() {
  return render(<App />);
}

export function findInspectorPanel(title: string) {
  const heading = screen
    .getAllByText(title)
    .find((element) => element.closest(".inspector-panel"));
  const panel = heading?.closest(".inspector-panel");

  expect(panel).not.toBeNull();

  return panel as HTMLElement;
}

export function openInspectorPanel(buttonName: string, title: string) {
  fireEvent.click(screen.getByRole("button", { name: buttonName }));
  return within(findInspectorPanel(title));
}

export function getArticleByHeading(name: string) {
  const article = screen.getByRole("heading", { name }).closest("article");

  expect(article).not.toBeNull();

  return article as HTMLElement;
}
