import {
  List,
  ActionPanel,
  Action,
  Icon,
  Detail,
  getPreferenceValues,
} from "@raycast/api";
import { ReactNode } from "react";
import { useRepos, Preferences } from "../hooks/useRepos";
import { Repo } from "../utils/repos";

interface SelectRepoProps {
  onSelect: (path: string) => Promise<boolean>;
  addRepositoryTarget: ReactNode;
}

function RepoItem({
  repo,
  onSelect,
}: {
  repo: Repo;
  onSelect: (path: string) => void;
}) {
  return (
    <List.Item
      key={repo.path}
      title={repo.name}
      subtitle={repo.path}
      icon={Icon.Folder}
      actions={
        <ActionPanel>
          <Action
            title="Select Repository"
            onAction={() => {
              void onSelect(repo.path);
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export function SelectRepo({ onSelect, addRepositoryTarget }: SelectRepoProps) {
  const preferences = getPreferenceValues<Preferences>();
  const { repos, isLoading } = useRepos();
  const recentRepos = repos.filter((repo) => repo.source === "recent");
  const projectRepos = repos.filter((repo) => repo.source === "projects");

  if (isLoading) {
    return (
      <List isLoading={true} searchBarPlaceholder="Loading repositories..." />
    );
  }

  if (repos.length === 0) {
    return (
      <Detail
        markdown={`# No Repositories Found\n\nPlease check your **Projects Directory** in extension preferences.\n\nCurrent path: \`${preferences.projectsDirectory}\`\n\nEnsure this directory exists and contains git repositories.`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Repository"
              icon={Icon.PlusCircle}
              target={addRepositoryTarget}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List searchBarPlaceholder="Search repositories...">
      <List.Section title="Quick Actions">
        <List.Item
          title="Add Repository..."
          subtitle="Select a git repository outside your Projects Directory"
          icon={Icon.PlusCircle}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Repository"
                icon={Icon.PlusCircle}
                target={addRepositoryTarget}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {recentRepos.length > 0 && (
        <List.Section title="Recent">
          {recentRepos.map((repo) => (
            <RepoItem key={repo.path} repo={repo} onSelect={onSelect} />
          ))}
        </List.Section>
      )}
      {projectRepos.length > 0 && (
        <List.Section title="Projects Directory">
          {projectRepos.map((repo) => (
            <RepoItem key={repo.path} repo={repo} onSelect={onSelect} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
