# GitChirip

A microblog where **every chirp is an empty commit** and **publishing is a
merge**.

- **Writing.** You make an empty commit on a branch of your fork:
  `git chirp "hello world"`.
- **Publishing.** That opens a pull request. A bot checks it, then merges it.
- **Reading.** `main`'s history is the timeline. A static site is built from
  it and served by GitHub Pages.
- **Profiles** are people's GitHub profiles. **Likes** are reactions on the
  pull request that published the chirp. **Replies** are chirps with an
  `In-Reply-To: <sha>` trailer.

There's no server and no database. Forking the repository copies the whole
network.

## Posting

1. Fork this repository and clone your fork.
2. Add the timeline as `upstream`:
   `git remote add upstream https://github.com/GitChirip/gitchirip-posts`
3. Put `bin/git-chirp` on your `PATH`, and sign in to the
   [GitHub CLI](https://cli.github.com) with `gh auth login`.

```sh
git chirp "just setting up my chirp"
git chirp reply 5e8edb5 "welcome!"
git chirp timeline
```

Your commit's email has to belong to your GitHub account, because the bot
checks that you wrote the chirp yourself. Your `@users.noreply.github.com`
address works.

## What the bot checks

`tey publish` runs on every pull request (`.github/workflows/publish.yml`).
A chirp pull request must:

- have exactly one commit, which is not a merge and changes no file
- be authored by the account that opened the pull request
- be 1–280 characters long, not counting trailers
- if it's a reply, answer a chirp that is already on `main`

If any of these fail, the bot comments with the reasons and leaves the pull
request open. If they all pass, it merges with a real merge commit. A squash
or rebase would change the chirp's SHA, which is its identity. GitHub's merge
message, `Merge pull request #N from login/branch`, is how the site knows who
published what. The merge's own time is the publication time, which the
author can't fake.

## The site

`tey site` reads `main` and writes plain HTML:

| Path | Page |
|---|---|
| `/` | the newest 100 chirps |
| `/page/<n>/` | older chirps, 100 per page |
| `/@<login>/` | a profile and that person's newest 100 chirps |
| `/@<login>/page/<n>/` | their older chirps |
| `/c/<number>/` | a chirp, what it replies to, and its replies |

Pages are numbered from the oldest chirp, so `/page/1/` is the first 100 ever
published. A full page never changes again, and a link to it keeps showing
the same chirps. With JavaScript on, older pages load as you scroll.

Profiles and like counts come from the GitHub API through `gh` when the site
builds. `assets/chirp.js` is the only script, and the site works without it.
It shows relative times, refreshes like counts from GitHub's public API, and
turns a draft typed into the page into a `git chirp` command.

`.github/workflows/site.yml` builds and deploys the site after every publish,
and every 15 minutes so like counts stay fresh.

## Developing

You need [Kex](https://github.com/kexhq/kex) 0.4.0-rc.2 or newer, plus `git`
and `gh`.

```sh
tey test                                  # the specs
tey demo                                  # a fake timeline in _demo/
tey site --timeline _demo --offline       # build it into _site/ without GitHub
python3 -m http.server -d _site 4173      # look at it
tey publish --repository GitChirip/gitchirip-posts --pull 1 --dry-run
```

| File | What it does |
|---|---|
| `src/gitchirip/timeline.kex` | reads chirps out of `git log` |
| `src/gitchirip/github.kex` | profiles and reaction counts, through `gh` |
| `src/gitchirip/site.kex` | renders the pages from `views/*.html.ket` |
| `src/gitchirip/publishing.kex` | the publishing rules, as a pure function |
| `src/site.kex` | the `tey site` command |
| `src/publish.kex` | the `tey publish` command |
| `bin/git-chirp` | the command people post with |

## Setting up a timeline

1. Push this code to the timeline repository.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. In **Settings → General**, allow merge commits.

The workflows use the `ghcr.io/kexhq/kex` image and need no secrets beyond
the built-in token.
