import { List, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { GitData } from "../../hooks/useGitData";
import { PRFormView } from "./PRFormView";
import { StageList } from "./StageList";
import { HotfixStageView } from "./HotfixStageView";
import { ReviewerSelectionView } from "./ReviewerSelectionView";
import { useGitData } from "../../hooks/useGitData";

interface StrategyListProps {
  data: GitData;
  selectedRepoPath: string;
}

export function StrategyList({
  data: initialData,
  selectedRepoPath,
}: StrategyListProps) {
  const { push, pop } = useNavigation();
  const { data, saveReviewers } = useGitData(selectedRepoPath);

  const currentData = data || initialData;

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
                    data={currentData}
                    selectedRepoPath={selectedRepoPath}
                  />,
                )
              }
            />
            <Action
              title="Configure Reviewers"
              icon={Icon.Person}
              onAction={() =>
                push(
                  <ReviewerSelectionView
                    data={currentData}
                    onSave={async (reviewers) => {
                      const success = await saveReviewers(reviewers);
                      return success;
                    }}
                    onSkip={() => pop()}
                  />,
                )
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
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
                  <HotfixStageView
                    data={currentData}
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
                    data={currentData}
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
