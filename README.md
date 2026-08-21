# A Decade of Space Launches

An interactive scrollytelling data story built from my Makeover Monday 2026 Week 26 Tableau project.

The story follows 1,723 space launches from January 2017 through June 2026, moving from an ArcFlow-style launch fan into annual launch trends, launch geography, and mission outcomes.

## Built with

- HTML
- CSS
- JavaScript
- SVG
- Local CSV data

No external JavaScript visualization or scrollytelling library is required.

## Project structure

```text
├── index.html
├── style.css
├── script.js
├── assets/
│   └── world-map.svg
└── data/
    └── launches.csv
```

## View locally

From this folder, run:

```text
py -m http.server 8000 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8000/
```

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload the **contents of this folder** to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select **main** and **/(root)**, then save.
6. GitHub Pages will provide the public site URL after deployment.

## Original Tableau project

[View the original Tableau Public visualization](https://public.tableau.com/app/profile/iris6683/viz/MoM2026Week26_SpaceLaunch/MOM2026Week26)

## Credits

- Makeover Monday 2026 Week 26
- Visualization: Iris Sun
- Data: Voronoi
