/**
 * Global footer. The assignment requires the author's name, GitHub, and LinkedIn
 * on every page (submission guideline R-32), so this lives in the root layout.
 *
 * TODO(dharmik): replace the two URLs below with your real profile links.
 */
const AUTHOR = {
  name: "Dharmik Puri Goswami",
  github: "https://github.com/your-username",
  linkedin: "https://www.linkedin.com/in/your-handle",
};

export function SiteFooter() {
  return (
    <footer className="border-border border-t">
      <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm sm:flex-row">
        <p>
          Built by <span className="text-foreground font-medium">{AUTHOR.name}</span>
        </p>
        <nav aria-label="Author links" className="flex items-center gap-4">
          <a
            href={AUTHOR.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a
            href={AUTHOR.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}
