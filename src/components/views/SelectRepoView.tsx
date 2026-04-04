import { ActionPanel, Action, Detail, useNavigation } from "@raycast/api";
import { useGitData } from "../../hooks/useGitData";
import { StrategyList } from "./StrategyList";
import { SelectRepo } from "../SelectRepo";
import { ReviewerSelectionView } from "./ReviewerSelectionView";
import { useState } from "react";
import { AddRepositoryView } from "./AddRepositoryView";

export function StrategyLoader({
  selectedRepoPath,
}: {
  selectedRepoPath: string;
}) {
  const { data, isLoading, error, saveReviewers, refresh } =
    useGitData(selectedRepoPath);
  const [hasSkippedReviewers, setHasSkippedReviewers] = useState(false);

  if (isLoading || (!data && !error)) {
    return <Detail isLoading={true} />;
  }

  if (error || data?.error) {
    return (
      <Detail
        markdown={`# Error
${error || data?.error || "Failed to load git data."}`}
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={() => refresh()} />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) return null;

  // Prompt for reviewer selection if not already configured and we haven't skipped it
  if (data.personalizedReviewers.length === 0 && !hasSkippedReviewers) {
    return (
      <ReviewerSelectionView
        data={data}
        onSave={async (reviewers) => {
          const success = await saveReviewers(reviewers);
          return success;
        }}
        onSkip={() => setHasSkippedReviewers(true)}
      />
    );
  }

  return <StrategyList data={data} selectedRepoPath={selectedRepoPath} />;
}

export function SelectRepoView({
  onSelect,
}: {
  onSelect: (repoPath: string) => Promise<boolean>;
}) {
  const { push } = useNavigation();

  const handleSelect = async (repoPath: string): Promise<boolean> => {
    const success = await onSelect(repoPath);
    if (success) {
      push(<StrategyLoader selectedRepoPath={repoPath} />);
    }
    return success;
  };

  return (
    <SelectRepo
      onSelect={handleSelect}
      addRepositoryTarget={
        <AddRepositoryView
          onValidateRepository={onSelect}
          onConfirmRepository={async (repoPath) => {
            push(<StrategyLoader selectedRepoPath={repoPath} />);
          }}
        />
      }
    />
  );
}
