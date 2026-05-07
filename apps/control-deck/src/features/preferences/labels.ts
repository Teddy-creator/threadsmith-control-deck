import type {
  ContinuationBehavior,
  ContinuationBehaviorSource
} from "@threadsmith/domain";

export function formatContinuationBehavior(value: ContinuationBehavior) {
  switch (value) {
    case "return-current-thread":
      return "返回当前线程";
    case "smart-continuation":
      return "智能 continuation";
    case "ask-every-time":
      return "每次都询问";
  }
}

export function formatContinuationSource(value: ContinuationBehaviorSource) {
  switch (value) {
    case "project-default":
      return "项目默认";
    case "global-default":
      return "全局默认";
    case "fallback":
      return "回退为每次都询问";
  }
}
