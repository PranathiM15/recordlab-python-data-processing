# RecordLab — Python Data Processing

A small, polished, Python-powered web app for **Task 9: Python Data Processing**. Load structured records, standardise blank values, inspect numerical summaries and category counts, and export the processed records and a report.

## Features

- Three built-in sample datasets: students, employees, and sales.
- Upload or drag-and-drop CSV and JSON files.
- Python-powered parsing and calculations: count, missing values, duplicate rows, unique values, minimum, maximum, mean, median, sum, and range.
- Numeric field insights and a field-by-field summary table.
- Search the preview and export cleaned CSV or a JSON summary report.
- Runs locally with Python's standard library; no Jupyter Notebook, virtual environment, package installation, database, or API key is needed.

## Run on Windows (recommended: Command Prompt or VS Code Terminal)

1. Download `recordlab-python-data-processing.zip` and extract it. Open the extracted **`recordlab-python-data-processing`** folder.
2. Click the folder address bar in File Explorer, type `cmd`, and press Enter. This opens Command Prompt in the project folder.
3. Check Python is available:

   ```bat
   py --version
   ```

   Python 3.10 or newer is recommended. If `py` is not recognised, try `python --version`. If neither works, install Python from <https://www.python.org/downloads/windows/> and during setup select **Add Python to PATH**.

4. Start the app:

   ```bat
   py app.py
   ```

   If the `py` command did not work but `python --version` did, use `python app.py` instead.

5. Open **http://127.0.0.1:8000** in Chrome or Edge. The Student Records demo loads automatically. Select Employee Records or Sales Records, or upload your own `.csv` / `.json` file.
6. To stop the server, return to the terminal and press **Ctrl+C**.

### If port 8000 is already in use

Start on port 8001 instead:

```bat
py app.py 8001
```

Then open <http://127.0.0.1:8001>.

## Run the tests

In the same terminal and project folder, use:

```bat
py -m unittest -v
```

The tests use Python's built-in `unittest` module. No notebook is involved.

## Push to your GitHub account

GitHub profile supplied: <https://github.com/PranathiM15>

1. Sign in to GitHub, then open **<https://github.com/new>**.
2. Repository name: `recordlab-python-data-processing`.
3. Description: `A Python-powered web app for processing structured records and generating summary statistics.`
4. Choose **Public** if your course requires the repository to be visible to reviewers (otherwise choose Private).
5. **Important:** leave “Add a README file”, `.gitignore`, and license options unchecked because these files are already included in this project. Click **Create repository**.
6. In the project's extracted folder, open Command Prompt/VS Code Terminal and run each command below, in sequence:

   ```bat
   git --version
   git init
   git add .
   git status
   git commit -m "Build RecordLab Python data processing app"
   git branch -M main
   git remote add origin https://github.com/PranathiM15/recordlab-python-data-processing.git
   git push -u origin main
   ```

   The `git status` step lets you check the files before committing. If Git asks for your identity, set it once with the name and email used for your GitHub commits:

   ```bat
   git config --global user.name "PranathiM15"
   git config --global user.email "YOUR_GITHUB_EMAIL"
   ```

   Then repeat `git commit -m "Build RecordLab Python data processing app"` and `git push -u origin main`. Replace `YOUR_GITHUB_EMAIL` with the email you use for GitHub; do not type the placeholder literally.

### Common Git issues

- **`git` is not recognised:** install Git for Windows from <https://git-scm.com/download/win>, reopen the terminal, and check `git --version`.
- **`remote origin already exists`:** run `git remote -v`. If it points to the wrong repository, correct it with `git remote set-url origin https://github.com/PranathiM15/recordlab-python-data-processing.git`. Then retry the push.
- **`src refspec main does not match any`:** confirm `git status` and create the first commit with `git add .` then `git commit -m "Build RecordLab Python data processing app"`.
- **GitHub authentication prompts:** follow the browser sign-in flow Git provides. GitHub no longer accepts an account password as the HTTPS Git password; use an approved credential manager or token when prompted.
- **A repository with the same name already exists:** either use that empty repository if it is yours, or choose a different repository name and update the `git remote add origin` URL to match it.

After a successful push, the repository will be at <https://github.com/PranathiM15/recordlab-python-data-processing>.

## Project files

- `app.py` — local HTTP server, CSV/JSON parsing, data cleaning, and statistics.
- `index.html` — user interface structure.
- `style.css` — responsive styling.
- `script.js` — sample selection, upload, display, search, and downloads.
- `test_app.py` — tests that run with `unittest`.
- `.gitignore` — ignores Python cache and editor files.

## Note about the original task sheet

The screenshot lists a notebook as one of its deliverables. This version intentionally follows your request to avoid Jupyter Notebook and instead provides a runnable Python program plus an interactive web app, sample summaries, processed-record preview, and downloadable report. If your evaluator strictly requires an `.ipynb` notebook, confirm whether a `.py` program and web app are accepted as an alternative.

## Scope and safety

This is intended for local coursework and demos, not deployment as a public server. The app binds to `127.0.0.1`, accepts CSV/JSON uploads up to 2 MB, and stores no uploaded datasets on disk. Avoid uploading sensitive personal data.
