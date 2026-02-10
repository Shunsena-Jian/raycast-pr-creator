import { ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { useGitData } from "../../hooks/useGitData";
import { StrategyList } from "./StrategyList";
import { SelectRepo } from "../SelectRepo";

export function StrategyLoader({
  selectedRepoPath,
}: {
  selectedRepoPath: string;
}) {
  const { data, isLoading, error } = useGitData(selectedRepoPath);

  if (isLoading || (!data && !error)) {
    return <Detail isLoading={true} />;
  }

  if (error || (data as any)?.error) {
    return (
      <Detail
        markdown={`# Error
${error || (data as any)?.error || "Failed to load git data."}`}
        actions={
          <ActionPanel>
            <Action title="Try Again" onAction={() => {}} />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) return null;

  return <StrategyList data={data} selectedRepoPath={selectedRepoPath} />;
}

export function SelectRepoView({
  onSelect,
}: {
  onSelect: (repoPath: string) => Promise<void>;
}) {
  const { push } = useNavigation();

  const handleSelect = async (repoPath: string) => {
    await onSelect(repoPath);
    push(<StrategyLoader selectedRepoPath={repoPath} />);
  };

  return <SelectRepo onSelect={handleSelect} />;
}
