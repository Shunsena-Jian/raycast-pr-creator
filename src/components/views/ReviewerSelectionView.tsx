import { ReviewerEditorView } from "./ReviewerEditorView";
import { GitData } from "../../hooks/useGitData";

interface ReviewerSelectionViewProps {
    data: GitData;
    onSave: (reviewers: string[]) => Promise<boolean>;
    onSkip: () => void;
}

export function ReviewerSelectionView({ data, onSave, onSkip }: ReviewerSelectionViewProps) {
    return (
        <ReviewerEditorView
            data={data}
            onSave={async (reviewers) => {
                const success = await onSave(reviewers);
                if (success) {
                    onSkip();
                }
                return success;
            }}
        />
    );
}

