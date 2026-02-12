import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  getPreferenceValues,
} from "@raycast/api";
import { useRepos, Preferences } from "../hooks/useRepos";

interface SelectRepoProps {
  onSelect: (path: string) => void;
}

export function SelectRepo({ onSelect }: SelectRepoProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { repos, isLoading } = useRepos();

  if (isLoading) {
    return (
      <List isLoading={true} searchBarPlaceholder="Loading repositories..." />
    );
  }

  if (repos.length === 0) {
    return (
      <Detail
        markdown={`# No Repositories Found\n\nPlease check your **Projects Directory** in extension preferences.\n\nCurrent path: \`${preferences.projectsDirectory}\`\n\nEnsure this directory exists and contains git repositories.`}
      />
    );
  }

  return (
    <List searchBarPlaceholder="Search repositories...">
      {repos.map((repo) => (
        <List.Item
          key={repo.path}
          title={repo.name}
          subtitle={repo.path}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action
                title="Select Repository"
                onAction={() => onSelect(repo.path)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
