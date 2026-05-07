import type {
  PhaseOwner,
  ProjectState,
  WorkflowTransitionId
} from "@threadsmith/domain";

export interface WorkflowTransitionAction {
  id: WorkflowTransitionId;
  role: PhaseOwner;
  label: string;
  detail: string;
  tone: "neutral" | "warning" | "success";
}

function action(
  id: WorkflowTransitionId,
  role: PhaseOwner,
  label: string,
  detail: string,
  tone: WorkflowTransitionAction["tone"]
): WorkflowTransitionAction {
  return {
    id,
    role,
    label,
    detail,
    tone
  };
}

export function selectWorkflowTransitions(
  state: ProjectState
): WorkflowTransitionAction[] {
  const runningRoles = new Set(
    state.activeWork.items
      .filter((item) => item.status === "running")
      .map((item) => item.role)
  );

  const transitions: WorkflowTransitionAction[] = [];

  if (runningRoles.has("executor")) {
    transitions.push(
      action(
        "executor-ready-for-review",
        "executor",
        "准备进入 Review",
        "executor 把当前 slice 交给 reviewer。",
        "success"
      )
    );
  }

  if (runningRoles.has("reviewer")) {
    transitions.push(
      action(
        "reviewer-ready-for-verification",
        "reviewer",
        "准备进入 Verification",
        "reviewer 已经放行这个 slice，可以进入 verification。",
        "success"
      ),
      action(
        "reviewer-blocked",
        "reviewer",
        "阻塞 Review",
        "reviewer 发现了阻塞问题，需要再来一个修复 slice。",
        "warning"
      )
    );
  }

  if (runningRoles.has("verifier")) {
    transitions.push(
      action(
        "verifier-accepted",
        "verifier",
        "先接受，等待 Closeout",
        "verification 已支持当前 claim，但 closeout 仍然需要完成。",
        "success"
      ),
      action(
        "verifier-failed",
        "verifier",
        "Verification 失败",
        "verifier 发现当前 claim 还没有被支持。",
        "warning"
      )
    );
  }

  if (runningRoles.has("closeout")) {
    transitions.push(
      action(
        "closeout-complete",
        "closeout",
        "标记为已接受",
        "closeout 已完成，这个 slice 可以被接受。",
        "success"
      )
    );
  }

  return transitions;
}
