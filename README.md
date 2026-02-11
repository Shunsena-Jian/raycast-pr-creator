# QualityTrade PR Creator

A powerful Raycast extension designed to streamline the Pull Request lifecycle. It automates branch selection based on established release/hotfix strategies, extracts JIRA tickets from branch names, and generates detailed PR descriptions from commit history.

## ✨ Features

- **Strategic Branching:** Built-in support for Release and Hotfix workflows (Staging, Alpha, Beta, Live).
- **JIRA Integration:** Automatic extraction of JIRA ticket IDs from branch names with markdown link generation.
- **Smart Descriptions:** Auto-generates PR descriptions by aggregating commit messages between source and target branches.
- **Multi-Target PRs:** Create multiple PRs simultaneously (e.g., to `develop` and `staging`) with a single click.
- **Reviewer Management:** Integration with GitHub contributors to easily assign reviewers.
- **Real-time Preview:** Live preview of PR title and body as you configure the form.

## 🚀 Installation

### 1. Prerequisites
Ensure you have the following installed and authenticated:
- **GitHub CLI (`gh`)**: `brew install gh`. Run `gh auth login` to authenticate.
- **Node.js**: Version 20 or higher.
- **Python**: Version 3.12 or higher.

### 2. Setup
```bash
# Clone the repository
git clone <repository-url>
cd raycast-pr-creator

# Install dependencies
npm install

# Initialize the Python environment
cd assets
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 3. Launch
Run `npm run dev` to start the extension in development mode and install it into Raycast.

## ⚙️ Configuration

Upon first launch, select your **Projects Directory** in the extension preferences. This should be the parent folder containing your local git repositories.

### Advanced Customization
Create a `.pr_creator_config.json` in your **Home folder** (`~`) to customize the default behavior:

```json
{
  "default_target_branch": "main",
  "jira_base_url": "https://qualitytrade.atlassian.net/browse/",
  "ignored_authors": ["bot", "dependabot"]
}
```

## 🛠 Development

### Project Structure
- `src/`: Raycast UI (TypeScript/React).
- `assets/pr_creator/`: Python Logic Engine.
- `assets/pr_engine.py`: Integration Bridge.

### Testing the Engine
You can run the Python logic independently for debugging:
```bash
cd assets
source venv/bin/activate
python3 pr_engine.py /absolute/path/to/your/repo
```

## ❓ Troubleshooting

- **"gh CLI not found"**: Verify `gh` is in your system PATH (`gh --version`).
- **"No repositories found"**: Ensure the "Projects Directory" preference points to the correct parent folder.
- **Python Errors**: Re-run the environment setup in the `assets` folder to ensure all dependencies are correctly installed.
