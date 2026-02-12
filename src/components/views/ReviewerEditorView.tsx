import {
  ActionPanel,
  Action,
  Form,
  showToast,
  Toast,
  Icon,
  useNavigation,
} from "@raycast/api";
import { GitData } from "../../hooks/useGitData";
import { useMemo, useState } from "react";

interface ReviewerEditorViewProps {
  data: GitData;
  onSave: (reviewers: string[]) => Promise<boolean>;
}

export function ReviewerEditorView({ data, onSave }: ReviewerEditorViewProps) {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);

  const allAvailableReviewers = useMemo(() => {
    const contributors = data.contributors || [];
    const personalized = data.personalizedReviewers || [];
    return Array.from(new Set([...contributors, ...personalized]));
  }, [data.contributors, data.personalizedReviewers]);

  const handleSubmit = async (values: {
    reviewers: string[];
    addCustom?: string;
  }) => {
    let finalReviewers = values.reviewers;

    if (values.addCustom && values.addCustom.trim()) {
      const newReviewers = values.addCustom.split(/[\s,]+/).filter(Boolean);
      finalReviewers = Array.from(
        new Set([...finalReviewers, ...newReviewers]),
      );
    }

    setIsSaving(true);
    try {
      const success = await onSave(finalReviewers);
      if (success) {
        await showToast({
          style: Toast.Style.Success,
          title: "Reviewers updated",
        });
        pop();
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update reviewers",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Reviewers" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Modify the personalized reviewers for this repository." />

      <Form.TagPicker
        id="reviewers"
        title="Reviewers"
        defaultValue={data.personalizedReviewers || []}
      >
        {allAvailableReviewers.map((reviewer) => (
          <Form.TagPicker.Item
            key={reviewer}
            value={reviewer}
            title={reviewer}
            icon={Icon.Person}
          />
        ))}
      </Form.TagPicker>

      <Form.Separator />

      <Form.TextField
        id="addCustom"
        title="Add New Reviewer"
        placeholder="Enter GitHub handle (e.g. jdoe)"
        info="Type GitHub handles (space or comma separated) and submit to add them."
      />
    </Form>
  );
}
