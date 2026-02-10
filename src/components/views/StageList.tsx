import { List, ActionPanel, Action, useNavigation } from "@raycast/api";
import { GitData } from "../../hooks/useGitData";
import { getReleaseStages, getHotfixStages } from "../../utils/strategies";
import { PRFormView } from "./PRFormView";

interface StageListProps {
  type: "release" | "hotfix";
  data: GitData;
  selectedRepoPath: string;
}

export function StageList({ type, data, selectedRepoPath }: StageListProps) {
  const { push } = useNavigation();
  const stages =
    type === "release"
      ? getReleaseStages(data.currentBranch, data.remoteBranches)
      : getHotfixStages(data.currentBranch, data.remoteBranches);

  return (
    <List
      navigationTitle={`Select ${type === "release" ? "Release" : "Hotfix"} Stage`}
    >
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
        <List.Item title={`No ${type} stages available for current branches`} />
      )}
    </List>
  );
}
