# Ownership, Proprietary Code, Privacy, and Security

This guide separates things that sound similar but are **not the same**. It is a plain-English explanation, not individualized legal advice.

## 1. Who controls the project?

The GitHub repository **Schneider-Joseph/TDL** is hosted under the GitHub account `Schneider-Joseph`. Its repository settings and access permissions are controlled by the account owner and any authorized administrators/collaborators.

The actual legal copyright owner of particular code depends on authorship, assignments, licenses, and agreements—not simply which GitHub account hosts a copy. If any third-party contributions or copied materials have their own rights, a new notice cannot erase those rights.

The repository now contains [LICENSE](../LICENSE), an explicit **all-rights-reserved** notice identifying the TDL project owner by GitHub handle. The handle is not a verified legal name; the copyright holder can replace it with the correct person or entity after checking their ownership.

## 2. “Public”, “private”, “proprietary”, and “open source” are different

| Word | What it means |
| --- | --- |
| **Public GitHub repository** | Other people can browse the source and may view/fork it as GitHub's terms permit |
| **Private GitHub repository** | Repository access is limited by GitHub account permissions |
| **Proprietary / all rights reserved** | The copyright holder has not granted a broad open-source reuse license |
| **Open-source license** | A license giving others specified rights to use, modify, and redistribute code |
| **Private task data** | Your saved homework/notes are not posted to the repository by TDL's current code |
| **Trade secret** | A separate legal concept requiring confidentiality; placing code in a public repo normally works against secrecy |

**Important:** An all-rights-reserved notice is not an access-control system. The code remains readable as long as the repository is public. Someone may have already viewed, downloaded, or forked it. The notice cannot rewind that history.

GitHub's own licensing documentation explains that without an open-source license, normal copyright rules apply, while public repositories remain subject to GitHub's Terms of Service.

Official reference: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository

## 3. What changed by adding LICENSE?

- The repository now has an explicit statement that the project is **not licensed as open source**.
- It says no general permission to redistribute, modify, or commercially exploit the original code is being granted beyond the rights already available under applicable law and GitHub terms.
- It acknowledges possible third-party rights and that hosting ownership alone doesn't prove legal authorship.

**It did NOT** make the repository private, revoke GitHub users' rights under GitHub's terms, restrict access to the live website, or alter the app's behavior.

## 4. How to change repository visibility (manual control)

If you decide you want the source hidden:

1. Log into the GitHub account that administers TDL.
2. Open https://github.com/Schneider-Joseph/TDL.
3. Select **Settings** for the repository.
4. Under **General**, look for the **Danger Zone** section.
5. Locate **Change repository visibility**.
6. Carefully review GitHub's warnings, then choose **Private** if that's what you intend.

**Do not do this impulsively.** TDL is currently served from GitHub Pages. Changing a Pages source repository from public to private may affect Pages availability depending on the GitHub plan and settings. Confirm the current Pages requirements and, if necessary, arrange another hosting method before changing visibility. Public copies/forks that already exist will not automatically become secret.

We have **not** changed TDL's visibility.

## 5. What should never go into GitHub?

Never commit:

- Passwords, personal access tokens, OAuth client secrets.
- Firebase **service account JSON files**, Admin SDK private keys, or server secrets.
- Private school calendar subscription URLs or API tokens.
- Private exports containing your homework, schedules, notes, or unrelated personal data.
- Browser cookies, session tokens, or copies of browser profiles.
- Backup files with credentials, private API responses, or sensitive personal information.

The `.gitignore` excludes common `.env` secret files, TDL JSON backup filenames, and calendar exports from routine Git tracking, but **.gitignore is not a security guarantee**. You can still accidentally commit a secret by pasting it into tracked code or documentation.

If a credential is accidentally pushed: **revoke/rotate it immediately** at the provider. Deleting a file from the latest commit may not remove copies from history, forks, or caches.

## 6. Is a Firebase web API key a secret?

Generally, a Firebase **web app configuration object** identifies your Firebase project and is often delivered to browsers publicly. This is different from service account private keys and backend secrets.

**But public configuration does not equal public authorization.** Firebase Authentication, Firestore Security Rules, App Check where appropriate, and usage controls provide the real boundary. A leaked service account private key is a very different security incident from exposure of a normal web app config value.

Never rely on hiding a JavaScript value to protect user data; visitors can inspect frontend JavaScript.

## 7. What changes when TDL gets accounts?

Right now, task content generally stays in your own browser local storage. Adding Firebase would introduce:

- A third-party cloud service storing synchronized records.
- Authentication sessions and account identity.
- Network requests carrying task data to that service.
- Security Rules and IAM permissions requiring active maintenance.
- Potential billing and data-retention considerations.
- A risk of offline cached task data remaining on a shared device.

Those are real tradeoffs. The future feature must document consent, sign-out behavior, retention/deletion, and recovery before launch.

See [Firebase Sync Design](FIREBASE_SYNC_DESIGN.md).

## 8. Keep control of your own changes

- Keep your GitHub account secure with strong authentication.
- Keep backups locally; GitHub source history is not a backup of browser tasks.
- Make feature branches and review diffs.
- Keep a current ownership notice and record any outside contributions.
- Review dependency licenses before adding libraries.
- Do not give a helper unlimited repository or Firebase administration access unnecessarily.
- Write documentation for new code at the same time you add features.

The project's objective is both **ownership** and **understanding**. A system you cannot safely inspect, modify, or recover is not really under your operational control, regardless of who paid for the hosting.

## Further reading

- [GitHub: Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [GitHub: Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)
- [Firebase: Avoid insecure security rules](https://firebase.google.com/docs/rules/insecure-rules)
- [TDL: Data and Backups](DATA_AND_BACKUPS.md)
