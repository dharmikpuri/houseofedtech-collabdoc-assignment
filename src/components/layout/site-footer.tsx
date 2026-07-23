/**
 * Global footer with the author's name, GitHub, and LinkedIn on every page.
 */
const AUTHOR = {
  name: "Dharmik Puri Goswami",
  github: "https://github.com/dharmikpuri",
  linkedin: "https://www.linkedin.com/in/dharmikpurigoswami/",
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
