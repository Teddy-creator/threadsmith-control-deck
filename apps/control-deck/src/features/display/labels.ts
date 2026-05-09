export function formatRole(role: string) {
  switch (role) {
    case "planner":
      return "规划";
    case "executor":
      return "执行";
    case "reviewer":
      return "评审";
    case "verifier":
      return "验证";
    case "closeout":
      return "收尾";
    case "hygiene":
      return "整理";
    default:
      return role;
  }
}

export function formatRoleStatus(status: string) {
  switch (status) {
    case "idle":
      return "空闲";
    case "running":
      return "进行中";
    case "waiting":
      return "等待中";
    case "blocked":
      return "阻塞";
    case "done":
      return "完成";
    default:
      return status;
  }
}

export function formatAcceptanceStatus(status: string) {
  switch (status) {
    case "not-started":
      return "未开始";
    case "implementing":
      return "实现中";
    case "ready-for-review":
      return "待评审";
    case "in-review":
      return "评审中";
    case "review-blocked":
      return "评审阻塞";
    case "ready-for-verification":
      return "待验证";
    case "ready":
      return "已就绪";
    case "running":
      return "进行中";
    case "failed":
      return "失败";
    case "passed":
      return "通过";
    case "pending":
      return "待处理";
    case "done":
      return "完成";
    case "not-ready":
      return "未就绪";
    case "verification-failed":
      return "验证失败";
    case "accepted-with-closeout-pending":
      return "已接受，等待 closeout";
    case "accepted":
      return "已接受";
    default:
      return status;
  }
}

export function formatDoneWhenStatus(status: string) {
  switch (status) {
    case "pass":
      return "通过";
    case "fail":
      return "失败";
    case "unknown":
      return "未知";
    default:
      return status;
  }
}

export function formatPhaseTrackState(state: string) {
  switch (state) {
    case "done":
      return "已完成";
    case "in-progress":
      return "进行中";
    case "next":
      return "下一步";
    case "later":
      return "稍后";
    default:
      return state;
  }
}

export function formatHealthLevel(level: string) {
  switch (level) {
    case "healthy":
      return "健康";
    case "watch":
      return "关注";
    case "risky":
      return "风险";
    case "blocked":
      return "阻塞";
    default:
      return level;
  }
}

export function formatProjectOverallState(state: string) {
  switch (state) {
    case "planning":
      return "规划中";
    case "in-progress":
      return "进行中";
    case "at-risk":
      return "有风险";
    case "blocked":
      return "阻塞";
    case "stable":
      return "稳定";
    default:
      return state;
  }
}

export function formatThreadHealth(status: string) {
  switch (status) {
    case "healthy":
      return "健康";
    case "watch":
      return "关注";
    case "handoff-recommended":
      return "建议 handoff";
    default:
      return status;
  }
}

export function formatReadinessStatus(status: string) {
  switch (status) {
    case "ready":
      return "已就绪";
    case "not-ready":
      return "未就绪";
    case "pending":
      return "待处理";
    default:
      return status;
  }
}

export function formatVerificationEvidenceStatus(status: string) {
  switch (status) {
    case "not-started":
      return "未开始";
    case "ready":
      return "已就绪";
    case "running":
      return "进行中";
    case "passed":
      return "通过";
    case "failed":
      return "失败";
    default:
      return status;
  }
}

export function formatGateReason(reason: string) {
  switch (reason) {
    case "phase-blocked":
      return "phase 被阻塞";
    case "blocking-review-findings":
      return "存在阻塞性评审发现";
    case "verification-failed":
      return "verification 失败";
    case "closeout-pending":
      return "closeout 待完成";
    case "latest-run-failed":
      return "最新自动执行失败";
    case "stale-continuation-packet":
      return "continuation packet 已过期";
    case "handoff-recommended":
      return "建议创建 handoff";
    case "context-artifact-invalid":
      return "context artifact 不兼容";
    case "context-packet-missing":
      return "缺少 Context Packet";
    case "context-packet-stale":
      return "Context Packet 已过期";
    case "role-packet-missing":
      return "缺少角色 packet";
    case "role-packet-stale":
      return "角色 packet 已过期";
    case "accepted-needs-continuation":
      return "已接受，需要继续点";
    case "phase-run-paused":
      return "自动链路已暂停";
    case "run-in-progress":
      return "等待运行结果回流";
    default:
      return reason;
  }
}

export function formatTimelineBadge(badge: string) {
  switch (badge) {
    case "planner":
    case "executor":
    case "reviewer":
    case "verifier":
    case "closeout":
    case "hygiene":
      return formatRole(badge);
    case "transition":
      return "流转";
    case "decision":
      return "决策";
    case "Live gate":
    case "当前 Gate":
    case "当前门控":
      return "当前门控";
    default:
      return badge;
  }
}
