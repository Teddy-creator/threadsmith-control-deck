import { watch } from "node:fs";
import { loadProjectState } from "./fileStore.ts";
import { getThreadsmithDir } from "./paths.ts";

export function watchProjectState(
  projectRoot: string,
  onUpdate: (snapshot: Awaited<ReturnType<typeof loadProjectState>>) => void,
  onError?: (error: unknown) => void
) {
  const watcher = watch(getThreadsmithDir(projectRoot), async () => {
    try {
      onUpdate(await loadProjectState(projectRoot));
    } catch (error) {
      onError?.(error);
    }
  });

  return () => watcher.close();
}
