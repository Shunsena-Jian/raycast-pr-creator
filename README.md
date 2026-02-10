# QualityTrade PR Creator

A Raycast extension to streamline the creation of Pull Requests with JIRA integration and multi-target support. This tool automates branch selection, ticket extraction, and description generation to match QualityTrade's PR standards.

## 🚀 Installation (For Users)

Follow these steps to set up the tool on your system.

### 1. Prerequisites
You need these three tools installed and authenticated:
*   **GitHub CLI (`gh`)**: [Download here](https://cli.github.com/) or `brew install gh`.
    *   *Important:* Run `gh auth login` in your terminal after installing.
*   **Node.js**: [Download here](https://nodejs.org/) (Version 20+ recommended).
*   **Python**: Version 3.12+ (Usually pre-installed on macOS).

### 2. Setup the Extension
Open your terminal and run the following commands:

```bash
# 1. Clone the project
git clone <repository-url>
cd raycast-pr-creator

# 2. Install Raycast dependencies
npm install

# 3. Setup the Python engine (Copy-paste this entire block)
cd assets
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 3. Add to Raycast
In the project folder, run:
```bash
npm run dev
```
Raycast will open and prompt you to install/open the extension.

---

## ⚙️ Configuration

The first time you run the command, you will be asked for:
*   **Projects Directory**: Select the folder on your computer where all your work repositories are located (e.g., `~/Documents/Github`).

### Optional: Advanced Config
You can create a file named `.pr_creator_config.json` in your **Home folder** to customize settings:
```json
{
  "default_target_branch": "main",
  "jira_base_url": "https://qualitytrade.atlassian.net/browse/"
}
```

---

## 🛠 Developer Setup (Co-Devs)

If you intend to modify the code or contribute to the project:

### Project Structure
*   `src/`: UI code (TypeScript/React).
*   `assets/pr_creator/`: Logic engine (Python).
*   `assets/pr_engine.py`: The bridge between Raycast and Python.

### Development Workflow
1.  **UI Changes**: Edit files in `src/`. The Raycast dev server (`npm run dev`) will live-reload.
2.  **Engine Changes**: Edit files in `assets/pr_creator/`.
3.  **Testing the Engine**: You can test the Python logic directly without Raycast:
    ```bash
    cd assets
    source venv/bin/activate
    python3 pr_engine.py /path/to/a/test/repo
    ```

### Linting & Formatting
*   `npm run lint`: Check for code style issues.
*   `npm run fix-lint`: Automatically fix formatting.

---

## ❓ Troubleshooting

*   **"gh CLI not found"**: Ensure you have installed GitHub CLI and it's in your PATH. Try running `gh --version` in terminal.
*   **"No repositories found"**: Check that your "Projects Directory" preference in Raycast points to the correct parent folder containing your `.git` projects.
*   **Python Errors**: Ensure the `assets/venv` folder exists and contains the required packages from `requirements.txt`.
