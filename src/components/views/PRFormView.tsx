import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useMemo } from "react";
import { useGitData, GitData } from "../../hooks/useGitData";
import { useRepos } from "../../hooks/useRepos";
import { usePRPreview } from "../../hooks/usePRPreview";
import { usePRForm } from "../../hooks/usePRForm";
import {
  StrategyRecommendation,
  getReleaseStages,
  getChildHotfixStages,
  getParentHotfixStages,
  Stage,
} from "../../utils/strategies";

interface PRFormViewProps {
  data: GitData;
  selectedRepoPath: string;
  recommendation: StrategyRecommendation | null;
}

export function PRFormView({
  data: initialData,
  selectedRepoPath: initialRepoPath,
  recommendation: initialRecommendation,
}: PRFormViewProps) {
  const { repos, isLoading: isReposLoading } = useRepos();
  const [repoPath, setRepoPath] = useState(initialRepoPath);

  // Only fetch if the user changes the repo from the initial one
  const shouldFetch = repoPath !== initialRepoPath;
  const { data: newData, isLoading } = useGitData(
    shouldFetch ? repoPath : undefined,
  );

  // If we are fetching new data, wait for it. Otherwise use initialData.
  const currentData = shouldFetch ? newData : initialData;

  const [strategyType, setStrategyType] = useState<
    "manual" | "release" | "hotfix"
  >(
    initialRecommendation?.name.startsWith("Release")
      ? "release"
      : initialRecommendation?.name.startsWith("Hotfix")
        ? "hotfix"
        : "manual",
  );

  const allStages = useMemo(() => {
    if (!currentData) return [];
    if (strategyType === "release") {
      return getReleaseStages(
        currentData.currentBranch,
        currentData.remoteBranches,
      );
    }
    if (strategyType === "hotfix") {
      return [
        ...getChildHotfixStages(
          currentData.currentBranch,
          currentData.remoteBranches,
        ),
        ...getParentHotfixStages(
          currentData.currentBranch,
          currentData.remoteBranches,
        ),
      ];
    }
    return [];
  }, [currentData, strategyType]);

  const [recommendation, setRecommendation] =
    useState<StrategyRecommendation | null>(initialRecommendation);

  const [preview, setPreview] = useState<{
    title: string;
    body: string;
  } | null>(null);

  // If we are switching repos and loading, pass null or a safe fallback to usePRForm.
  // However, usePRForm requires data to populate fields.
  // We should ideally pause rendering the form content or show loading state if currentData is missing.
  const isDataReady = !!currentData;

  const form = usePRForm({
    selectedRepoPath: repoPath,
    data: currentData,
    setPreview,
    recommendation,
  });

  const { isRefreshing, updatePreview } = usePRPreview({
    selectedRepoPath: repoPath,
    sourceBranch: form.sourceBranch,
    targetBranches: form.targetBranches,
    jiraDetails: form.jiraDetails,
    titleExtension: form.titleExtension,
    description: form.description,
    setPreview,
  });

  // If we're fetching new data (shouldFetch) and it's not ready yet, show loading
  const showLoading = shouldFetch && isLoading;

  // We can render the form but it might be empty if data is null.
  // Let's ensure we default gracefully if data is missing during a fetch.
  if (!isDataReady && showLoading) {
    return <Form isLoading={true} />;
  }

  // Fallback for types if data is strictly null (shouldn't happen due to loading check above, but for TS)
  const safeData = currentData || {
    currentBranch: "",
    remoteBranches: [],
    contributors: [],
    suggestedTickets: [],
    suggestedTitle: "",
  };

  return (
    <Form
      isLoading={isRefreshing || showLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Pull Request"
            onSubmit={form.handleSubmit}
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
        id="repo"
        title="Repository"
        value={repoPath}
        onChange={setRepoPath}
        isLoading={isReposLoading}
      >
        {repos.map((r) => (
          <Form.Dropdown.Item key={r.path} value={r.path} title={r.name} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown
        id="strategy"
        title="Strategy"
        value={strategyType}
        onChange={(val) => {
          setStrategyType(val as any);
          if (val === "manual") setRecommendation(null);
        }}
      >
        <Form.Dropdown.Item value="manual" title="Manual" icon={Icon.Plus} />
        <Form.Dropdown.Item
          value="release"
          title="Release"
          icon={Icon.Rocket}
        />
        <Form.Dropdown.Item value="hotfix" title="Hotfix" icon={Icon.Hammer} />
      </Form.Dropdown>

      {strategyType !== "manual" && (
        <Form.Dropdown
          id="stage"
          title="Stage"
          value={recommendation?.name || ""}
          onChange={(val) => {
            const stage = allStages.find(
              (s: Stage) => s.recommendation.name === val,
            );
            if (stage) setRecommendation(stage.recommendation);
          }}
        >
          {allStages.map((s: Stage) => (
            <Form.Dropdown.Item
              key={s.recommendation.name}
              value={s.recommendation.name}
              title={s.title}
            />
          ))}
          {allStages.length === 0 && (
            <Form.Dropdown.Item value="" title="No stages available" />
          )}
        </Form.Dropdown>
      )}

      <Form.Separator />

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
            title={b === safeData.currentBranch ? `${b} (Current)` : b}
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

      <Form.Checkbox
        id="openPrInBrowser"
        label="Open PR in Browser after creation"
        title="Settings"
        value={form.openPrInBrowser}
        onChange={form.setOpenPrInBrowser}
      />

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
