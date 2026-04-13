/**
 * @fileoverview Smart anchor link that scrolls to a section on the homepage.
 * When already on a HOME_SCROLL_PATHS page, it prevents navigation and performs
 * a smooth scroll instead — working around React Router's hash-link no-op.
 */

import { Link, useLocation, useNavigate, type LinkProps } from "react-router-dom";

/** Pages where clicking a section link should scroll in-place instead of navigating. */
const HOME_SCROLL_PATHS = new Set(["/", "/pricing"]);

/** Scrolls the element matching the given ID into view with smooth animation. */
function scrollToSection(elementId: string) {
  document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export type HomeSectionLinkProps = Omit<LinkProps, "to"> & {
  sectionId: string;
};

/**
 * In-app hash links for the homepage: when already on `/` or `/pricing`, repeated clicks
 * still scroll (plain `Link` + useEffect would no-op if the hash is unchanged).
 */
export function HomeSectionLink({ sectionId, onClick, ...props }: HomeSectionLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const to = { pathname: "/" as const, hash: sectionId };

  return (
    <Link
      to={to}
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!HOME_SCROLL_PATHS.has(location.pathname)) return;
        e.preventDefault();
        void navigate(to, { replace: true });
        // Multiple scroll attempts to handle DOM layout shifts after navigation
        scrollToSection(sectionId);
        requestAnimationFrame(() => scrollToSection(sectionId));
        setTimeout(() => scrollToSection(sectionId), 80);
        setTimeout(() => scrollToSection(sectionId), 250);
      }}
    />
  );
}
