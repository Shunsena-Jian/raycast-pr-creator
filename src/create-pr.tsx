import {
  Form,
  ActionPanel,
  Action,
  Detail,
  LocalStorage,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { useGitData } from "./hooks/useGitData";
import { useRepos } from "./hooks/useRepos";
import { SelectRepo } from "./components/SelectRepo";
import { usePRPreview } from "./hooks/usePRPreview";
import { usePRForm } from "./hooks/usePRForm";

const REPO_PATH_KEY = "selected_repo_path";

export default function Command() {
  const repos = useRepos();
  const [selectedRepoPath, setSelectedRepoPath] = useState<string | null>(null);
  const [isChangingRepo, setIsChangingRepo] = useState(false);
  const { data, isLoading, error } = useGitData(selectedRepoPath || undefined);

  useEffect(() => {
    async function init() {
      const storedPath = await LocalStorage.getItem<string>(REPO_PATH_KEY);
      if (storedPath) {
        setSelectedRepoPath(storedPath);
      }
    }
    init();
  }, []);

  async function handleRepoSelect(repoPath: string) {
    await LocalStorage.setItem(REPO_PATH_KEY, repoPath);
    setSelectedRepoPath(repoPath);
    setIsChangingRepo(false);
  }

  const [preview, setPreview] = useState<{
    title: string;
    body: string;
  } | null>(null);

  const form = usePRForm({
    selectedRepoPath,
    data,
    setPreview, // This matches usePRForm signature
  });

  const { isRefreshing, updatePreview } = usePRPreview({
    selectedRepoPath,
    sourceBranch: form.sourceBranch,
    targetBranches: form.targetBranches,
    jiraDetails: form.jiraDetails,
    titleExtension: form.titleExtension,
    description: form.description,
    setPreview, // It needs to set preview
  });

  if (!selectedRepoPath || isChangingRepo) {
    return <SelectRepo onSelect={handleRepoSelect} />;
  }

  // Show loading during fetch or when transition state causes data/error gap
  if (isLoading || (!data && !error)) {
    return <Detail isLoading={true} />;
  }

  if (error || (data as any)?.error) {
    return (
      <Detail
        markdown={`# Error\n${error || (data as any)?.error || "Failed to load git data."}`}
        actions={
          <ActionPanel>
            <Action
              title="Change Repository"
              onAction={() => setIsChangingRepo(true)}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!data) return null;

  return (
    <Form
      isLoading={isRefreshing}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Pull Request"
            onSubmit={form.handleSubmit}
          />
          <Action
            title="Change Repository"
            icon={Icon.Switch}
            onAction={() => setIsChangingRepo(true)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Refresh Preview"
            icon={Icon.ArrowClockwise}
            onAction={updatePreview}
            shortcut={{ modifiers: ["cmd"], key: "u" }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="repository"
        title="Repository"
        value={selectedRepoPath || ""}
        onChange={handleRepoSelect}
      >
        {repos.map((r) => (
          <Form.Dropdown.Item key={r.path} value={r.path} title={r.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="source"
        title="Source Branch"
        value={form.sourceBranch}
        onChange={form.setSourceBranch}
      >
        {form.allSourceOptions.map((b) => (
          <Form.Dropdown.Item
            key={b}
            value={b}
            title={b === data.currentBranch ? `${b} (Current)` : b}
          />
        ))}
      </Form.Dropdown>

      <Form.TagPicker
        id="targets"
        title="Target Branches"
        placeholder="Select or type target(s)"
        value={form.targetBranches}
        onChange={form.setTargetBranches}
        // @ts-expect-error onSearchTextChange exists in runtime for TagPicker
        onSearchTextChange={form.setTargetSearchText}
      >
        {form.allTargetOptions.map((b) => (
          <Form.TagPicker.Item key={b} value={b} title={b} />
        ))}
        {form.targetSearchText &&
          !form.allTargetOptions.includes(form.targetSearchText) && (
            <Form.TagPicker.Item
              key="__add_target"
              value={form.targetSearchText}
              title={`Add "${form.targetSearchText}"`}
            />
          )}
      </Form.TagPicker>

      <Form.Description
        title="Title Pattern (Default)"
        text={
          form.sourceBranch && form.targetBranches.length > 0
            ? `\`[TICKET][TITLE][${form.sourceBranch}] -> [${form.targetBranches[0] || "target"}]\``
            : "Select branches to see the pattern"
        }
      />

      <Form.Separator />

      <Form.TextArea
        id="jiraDetails"
        title="JIRA Details"
        placeholder="Enter Ticket ID or URL (one per line)"
        value={form.jiraDetails}
        onChange={form.setJiraDetails}
        info="Paste Ticket IDs or full JIRA URLs. One per line."
      />

      <Form.TextField
        id="titleExtension"
        title="Title Extension"
        placeholder="Descriptive part of the title"
        value={form.titleExtension}
        onChange={form.setTitleExtension}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Auto-generated from commits..."
        value={form.description}
        onChange={(val) => {
          form.isDescriptionDirty.current = true;
          form.setDescription(val);
        }}
      />

      <Form.TagPicker
        id="reviewers"
        title="Reviewers"
        placeholder="Select or type username"
        value={form.reviewers}
        onChange={form.setReviewers}
        // @ts-expect-error onSearchTextChange exists in runtime for TagPicker
        onSearchTextChange={form.setReviewerSearchText}
      >
        {form.allReviewerOptions.map((c) => (
          <Form.TagPicker.Item key={c} value={c} title={c} />
        ))}
        {form.reviewerSearchText &&
          !form.allReviewerOptions.includes(form.reviewerSearchText) && (
            <Form.TagPicker.Item
              key="__add_reviewer"
              value={form.reviewerSearchText}
              title={`Add "${form.reviewerSearchText}"`}
            />
          )}
      </Form.TagPicker>

      {preview && (
        <>
          <Form.Separator />
          <Form.Description
            title="Final PR Preview"
            text={`**Full Title:** \`${preview.title}\`\n\n**Full Description:**\n\n${preview.body}`}
          />
        </>
      )}
    </Form>
  );
}
