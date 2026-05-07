export interface BeforeInstallPromptChoice {
  outcome: "accepted" | "dismissed";
  platform: string;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<BeforeInstallPromptChoice>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    standalone?: boolean;
  }
}

export type InstallSurfaceStatus = "promptable" | "installed" | "manual";
export type InstallBrowserFamily = "chromium" | "safari" | "unknown";
export type InstallPromptFeedback = "accepted" | "dismissed" | null;

export interface InstallSurfaceState {
  status: InstallSurfaceStatus;
  tone: "green" | "blue" | "zinc";
  badgeLabel: string;
  title: string;
  detail: string;
  hint: string;
  actionLabel: string | null;
}

export function detectInstallBrowserFamily(userAgent: string): InstallBrowserFamily {
  const normalized = userAgent.toLowerCase();
  const isChromium =
    normalized.includes("chrome") ||
    normalized.includes("chromium") ||
    normalized.includes("edg/") ||
    normalized.includes("arc/") ||
    normalized.includes("brave");

  if (isChromium) {
    return "chromium";
  }

  if (normalized.includes("safari") && !normalized.includes("chrome")) {
    return "safari";
  }

  return "unknown";
}

export function readStandaloneDisplayMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const mediaMatches =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)").matches
      : false;

  return mediaMatches || Boolean(window.navigator.standalone);
}

function buildManualDetail(
  browserFamily: InstallBrowserFamily,
  promptFeedback: InstallPromptFeedback
) {
  if (promptFeedback === "dismissed") {
    return "你刚刚取消了安装提示。稍后仍可以从浏览器菜单里重新安装，或者先把这个入口固定下来。";
  }

  switch (browserFamily) {
    case "chromium":
      return "当前浏览器没有直接弹出安装提示时，也可以从浏览器菜单里手动安装，或先把这个标签页固定起来。";
    case "safari":
      return "当前更适合通过 Safari 的菜单把 Threadsmith 添加到 Dock，或先固定这个标签页作为日常入口。";
    default:
      return "如果当前浏览器不支持直接安装，也可以先把这个页面固定到标签页、书签，或继续使用前门启动脚本。";
  }
}

function buildManualHint(browserFamily: InstallBrowserFamily) {
  switch (browserFamily) {
    case "chromium":
      return "推荐路径：浏览器菜单里的“安装 Threadsmith”，或固定当前标签页；如果更习惯命令，也可以继续使用 ./Open-Threadsmith-App.command。";
    case "safari":
      return "推荐路径：把当前页面添加到 Dock，或固定当前标签页；如果更习惯命令，也可以继续使用 ./Open-Threadsmith-App.command。";
    default:
      return "推荐路径：先固定当前页面或保留 ./Open-Threadsmith-App.command，把 Threadsmith 当作稳定前门来打开。";
  }
}

export function buildInstallSurfaceState(args: {
  isStandalone: boolean;
  hasInstallPrompt: boolean;
  browserFamily: InstallBrowserFamily;
  promptFeedback?: InstallPromptFeedback;
}): InstallSurfaceState {
  if (args.isStandalone) {
    return {
      status: "installed",
      tone: "green",
      badgeLabel: "已作为固定入口打开",
      title: "Threadsmith 已在独立窗口中打开",
      detail:
        "你现在看到的是浏览器安装或固定后的独立入口。以后可以优先从 Dock、应用列表或已固定入口进入 Threadsmith 前门。",
      hint: "这仍然是 web 入口，不是原生桌面壳，但已经足够作为稳定的日常前门。",
      actionLabel: null
    };
  }

  if (args.hasInstallPrompt) {
    return {
      status: "promptable",
      tone: "blue",
      badgeLabel: "可安装",
      title: "把 Threadsmith 固定成日常入口",
      detail:
        "当前浏览器已经允许把 Threadsmith 固定成更像独立入口的打开方式。固定后，你会更容易把它放到 Dock、应用列表或独立窗口里使用。",
      hint: "这不会把 Threadsmith 变成原生桌面壳，但会明显降低“先打开哪个入口”的记忆成本。",
      actionLabel: "安装 Threadsmith"
    };
  }

  return {
    status: "manual",
    tone: "zinc",
    badgeLabel: "手动固定",
    title: "先把 Threadsmith 固定成稳定入口",
    detail: buildManualDetail(args.browserFamily, args.promptFeedback ?? null),
    hint: buildManualHint(args.browserFamily),
    actionLabel: null
  };
}
