import { ActionPanel, Action, Form, useNavigation, showToast, Toast, Icon, Alert, confirmAlert } from "@raycast/api";
import { GitData } from "../../hooks/useGitData";
import { useState, useMemo } from "react";

interface ReviewerSelectionViewProps {
    data: GitData;
    onSave: (reviewers: string[]) => Promise<boolean>;
    onSkip: () => void;
}

export function ReviewerSelectionView({ data, onSave, onSkip }: ReviewerSelectionViewProps) {
    const { pop } = useNavigation();
    const [customReviewers, setCustomReviewers] = useState<string[]>([]);

    // Merge contributors with any already personalized reviewers that might not be in the contributors list
    const allAvailableReviewers = useMemo(() => {
        const contributors = data.contributors || [];
        const personalized = data.personalizedReviewers || [];
        return Array.from(new Set([...contributors, ...personalized, ...customReviewers]));
    }, [data.contributors, data.personalizedReviewers, customReviewers]);

    const handleSubmit = async (values: { reviewers: string[]; addCustom?: string }) => {
        let finalReviewers = values.reviewers;

        // If there's something in the "Add Custom" field, add it to the list
        if (values.addCustom && values.addCustom.trim()) {
            const newReviewers = values.addCustom.split(/[\s,]+/).filter(Boolean);
            finalReviewers = Array.from(new Set([...finalReviewers, ...newReviewers]));
        }

        if (finalReviewers.length === 0) {
            const confirmed = await confirmAlert({
                title: "No reviewers selected",
                message: "Are you sure you want to proceed without reviewers?",
                primaryAction: {
                    title: "Proceed",
                },
            });
            if (!confirmed) return;
        }

        const success = await onSave(finalReviewers);
        if (success) {
            await showToast({
                style: Toast.Style.Success,
                title: "Reviewers saved",
            });
            onSkip(); // Proceed to next view
        } else {
            await showToast({
                style: Toast.Style.Failure,
                title: "Failed to save reviewers",
            });
        }
    };

    const handleClearConfig = async () => {
        if (await confirmAlert({ title: "Clear Reviewer Config?", message: "This will revert to using all contributors.", primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive } })) {
            const success = await onSave([]); // Saving empty list clears it in our current logic
            if (success) {
                await showToast({ style: Toast.Style.Success, title: "Configuration cleared" });
                onSkip();
            }
        }
    };

    return (
        <Form
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Save and Proceed" onSubmit={handleSubmit} />
                    <Action title="Clear Configuration" onAction={handleClearConfig} icon={Icon.Trash} style={Action.Style.Destructive} />
                    <Action title="Skip for Now" onAction={onSkip} shortcut={{ modifiers: ["cmd"], key: "s" }} />
                </ActionPanel>
            }
        >
            <Form.Description text="Select the reviewers who should be available for this repository. This will help filter out inactive members." />

            <Form.TagPicker id="reviewers" title="Reviewers" defaultValue={data.personalizedReviewers || []}>
                {allAvailableReviewers.map((reviewer) => (
                    <Form.TagPicker.Item key={reviewer} value={reviewer} title={reviewer} icon={Icon.Person} />
                ))}
            </Form.TagPicker>

            <Form.Separator />

            <Form.TextField
                id="addCustom"
                title="Add New Reviewer"
                placeholder="Enter GitHub handle (e.g. jdoe)"
                info="Type a handle and submit to add them to your personalized list."
            />
        </Form>
    );
}
