import { Detail, useNavigation } from "@raycast/api";
import { useGitData } from "../hooks/useGitData";
import { SelectRepo } from "./SelectRepo";
import { ReviewerEditorView } from "./views/ReviewerEditorView";

export function ReviewerManagementView({
  onSelectRepo,
}: {
  onSelectRepo: (repoPath: string) => Promise<void>;
}) {
  const { push } = useNavigation();

  const handleSelect = async (repoPath: string) => {
    await onSelectRepo(repoPath);
    push(<ReviewerManagementLoader selectedRepoPath={repoPath} />);
  };

  return <SelectRepo onSelect={handleSelect} />;
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

  if (error || (data as any)?.error) {
    return (
      <Detail
        markdown={`# Error\n${error || (data as any)?.error || "Failed to load git data."}`}
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
