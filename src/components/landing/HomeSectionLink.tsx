import { Link, useLocation, useNavigate, type LinkProps } from "react-router-dom";

const HOME_SCROLL_PATHS = new Set(["/", "/pricing"]);

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
        scrollToSection(sectionId);
        requestAnimationFrame(() => scrollToSection(sectionId));
        setTimeout(() => scrollToSection(sectionId), 80);
        setTimeout(() => scrollToSection(sectionId), 250);
      }}
    />
  );
}
