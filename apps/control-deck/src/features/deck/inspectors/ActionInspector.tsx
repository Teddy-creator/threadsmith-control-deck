import {
  AppHomeActionInspectorView,
  ProjectActionInspectorView
} from "./action";
import type { ActionInspectorProps } from "./action";

export type { ActionInspectorProps } from "./action";

export function ActionInspector(props: ActionInspectorProps) {
  if (props.mode === "app-home") {
    return <AppHomeActionInspectorView {...props} />;
  }

  return <ProjectActionInspectorView {...props} />;
}
