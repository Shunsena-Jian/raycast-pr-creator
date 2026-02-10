import { List, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { GitData } from "../../hooks/useGitData";
import { PRFormView } from "./PRFormView";
import { StageList } from "./StageList";

interface StrategyListProps {
  data: GitData;
  selectedRepoPath: string;
}

export function StrategyList({ data, selectedRepoPath }: StrategyListProps) {
  const { push, pop } = useNavigation();

  return (
    <List navigationTitle="Select Strategy">
      <List.Item
        title="Release Strategy"
        icon={Icon.Rocket}
        actions={
          <ActionPanel>
            <Action
              title="Select Release Strategy"
              onAction={() =>
                push(
                  <StageList
                    type="release"
                    data={data}
                    selectedRepoPath={selectedRepoPath}
                  />,
                )
              }
            />
            <Action
              title="Change Repository"
              icon={Icon.Switch}
              onAction={() => pop()}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Hotfix Strategy"
        icon={Icon.Hammer}
        actions={
          <ActionPanel>
            <Action
              title="Select Hotfix Strategy"
              onAction={() =>
                push(
                  <StageList
                    type="hotfix"
                    data={data}
                    selectedRepoPath={selectedRepoPath}
                  />,
                )
              }
            />
            <Action
              title="Change Repository"
              icon={Icon.Switch}
              onAction={() => pop()}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Create Manual Pull Request"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action
              title="Select Manual"
              onAction={() =>
                push(
                  <PRFormView
                    data={data}
                    selectedRepoPath={selectedRepoPath}
                    recommendation={null}
                  />,
                )
              }
            />
            <Action
              title="Change Repository"
              icon={Icon.Switch}
              onAction={() => pop()}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
