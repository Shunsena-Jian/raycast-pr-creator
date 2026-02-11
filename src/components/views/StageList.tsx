import { List, ActionPanel, Action, useNavigation } from "@raycast/api";
import { GitData } from "../../hooks/useGitData";
import {
  getReleaseStages,
  getChildHotfixStages,
  getParentHotfixStages,
  Stage,
} from "../../utils/strategies";
import { PRFormView } from "./PRFormView";

interface StageListProps {
  type: "release" | "hotfix-child" | "hotfix-parent";
  data: GitData;
  selectedRepoPath: string;
}

export function StageList({ type, data, selectedRepoPath }: StageListProps) {
  const { push } = useNavigation();

  let stages: Stage[] = [];
  if (type === "release") {
    stages = getReleaseStages(data.currentBranch, data.remoteBranches);
  } else if (type === "hotfix-child") {
    stages = getChildHotfixStages(data.currentBranch, data.remoteBranches);
  } else if (type === "hotfix-parent") {
    stages = getParentHotfixStages(data.currentBranch, data.remoteBranches);
  }

  const title =
    type === "release"
      ? "Select Release Stage"
      : type === "hotfix-child"
        ? "Select Child Hotfix"
        : "Select Parent Hotfix";

  return (
    <List navigationTitle={title}>
      {stages.map((stage, index) => (
        <List.Item
          key={index}
          title={stage.title}
          actions={
            <ActionPanel>
              <Action
                title="Select Stage"
                onAction={() =>
                  push(
                    <PRFormView
                      data={data}
                      selectedRepoPath={selectedRepoPath}
                      recommendation={stage.recommendation}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
      {stages.length === 0 && (
        <List.Item
          title={`No branches available for this stage`}
          subtitle="Check your remote branches or try fetching again."
        />
      )}
    </List>
  );
}
