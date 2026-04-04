import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

interface AddRepositoryViewProps {
  onValidateRepository: (repoPath: string) => Promise<boolean>;
  onConfirmRepository: (repoPath: string) => Promise<void>;
}

interface AddRepositoryFormValues {
  repository: string[];
}

export function AddRepositoryView({
  onValidateRepository,
  onConfirmRepository,
}: AddRepositoryViewProps) {
  const { pop } = useNavigation();
  const [isSaving, setIsSaving] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = async (values: AddRepositoryFormValues) => {
    const repoPath = values.repository[0];

    if (!repoPath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a repository folder",
      });
      return;
    }

    setIsSaving(true);
    try {
      const success = await onValidateRepository(repoPath);
      if (!success) {
        await showToast({
          style: Toast.Style.Failure,
          title: "That folder is not a git repository",
        });
        return;
      }

      await pop();
      await onConfirmRepository(repoPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Repository added",
      });
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
    }
  };

  return (
    <Form
      isLoading={isSaving}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Repository" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add any local git repository, even if it is outside your Projects Directory." />
      <Form.FilePicker
        id="repository"
        title="Repository Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
