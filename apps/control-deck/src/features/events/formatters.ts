export function formatEventTime(timestamp: string | null) {
  if (!timestamp) {
    return "无时间戳";
  }

  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
