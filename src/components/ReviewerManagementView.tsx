import { Detail, useNavigation } from "@raycast/api";
import { useGitData } from "../hooks/useGitData";
import { SelectRepo } from "./SelectRepo";
import { ReviewerEditorView } from "./views/ReviewerEditorView";
import { AddRepositoryView } from "./views/AddRepositoryView";

export function ReviewerManagementView({
  onSelectRepo,
}: {
  onSelectRepo: (repoPath: string) => Promise<boolean>;
}) {
  const { push } = useNavigation();

  const handleSelect = async (repoPath: string): Promise<boolean> => {
    const success = await onSelectRepo(repoPath);
    if (success) {
      push(<ReviewerManagementLoader selectedRepoPath={repoPath} />);
    }
    return success;
  };

  return (
    <SelectRepo
      onSelect={handleSelect}
      addRepositoryTarget={
        <AddRepositoryView
          onValidateRepository={onSelectRepo}
          onConfirmRepository={async (repoPath) => {
            push(<ReviewerManagementLoader selectedRepoPath={repoPath} />);
          }}
        />
      }
    />
  );
}

function ReviewerManagementLoader({
  selectedRepoPath,
}: {
  selectedRepoPath: string;
}) {
  const { data, isLoading, error, saveReviewers } =
    useGitData(selectedRepoPath);

  if (isLoading || (!data && !error)) {
    return <Detail isLoading={true} />;
  }

  if (error || data?.error) {
    return (
      <Detail
        markdown={`# Error\n${error || data?.error || "Failed to load git data."}`}
      />
    );
  }

  if (!data) return null;

  return (
    <ReviewerEditorView
      data={data}
      onSave={async (reviewers) => {
        return await saveReviewers(reviewers);
      }}
    />
  );
}
