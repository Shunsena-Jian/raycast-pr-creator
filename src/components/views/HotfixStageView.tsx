import { List, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { GitData } from "../../hooks/useGitData";
import { StageList } from "./StageList";

interface HotfixStageViewProps {
  data: GitData;
  selectedRepoPath: string;
}

export function HotfixStageView({
  data,
  selectedRepoPath,
}: HotfixStageViewProps) {
  const { push } = useNavigation();

  return (
    <List navigationTitle="Select Hotfix Stage">
      <List.Item
        title="Child hotfix branch to Parent hotfix branch"
        icon={Icon.Hammer}
        actions={
          <ActionPanel>
            <Action
              title="Select Stage"
              onAction={() =>
                push(
                  <StageList
                    type="hotfix-child"
                    data={data}
                    selectedRepoPath={selectedRepoPath}
                  />,
                )
              }
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Parent hotfix branch to release branches and default branch"
        icon={Icon.HardDrive}
        actions={
          <ActionPanel>
            <Action
              title="Select Stage"
              onAction={() =>
                push(
                  <StageList
                    type="hotfix-parent"
                    data={data}
                    selectedRepoPath={selectedRepoPath}
                  />,
                )
              }
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
