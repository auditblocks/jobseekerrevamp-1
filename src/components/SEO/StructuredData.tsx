import { Helmet } from "react-helmet-async";

interface StructuredDataProps {
  type?: "homepage" | "page";
  pageTitle?: string;
  pageDescription?: string;
  pageUrl?: string;
}

const StructuredData = ({ type = "page", pageTitle, pageDescription, pageUrl }: StructuredDataProps) => {
  const baseUrl = "https://startworking.in";
  const siteName = "JobSeeker";
  const siteDescription = "AI-Powered Job Outreach Platform - Automate your recruiter outreach with AI-generated personalized emails";

  // Organization Schema
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": siteName,
    "url": baseUrl,
    "logo": `${baseUrl}/icon-512.png`,
    "description": siteDescription,
    "sameAs": [
      // Add social media URLs when available
      // "https://twitter.com/jobseeker",
      // "https://linkedin.com/company/jobseeker",
      // "https://github.com/jobseeker"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "email": "support@startworking.in",
      "availableLanguage": "English"
    }
  };

  // WebSite Schema (for homepage)
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteName,
    "url": baseUrl,
    "description": siteDescription,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  // SoftwareApplication Schema
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": siteName,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.5",
      "ratingCount": "100"
    },
    "description": siteDescription,
    "url": baseUrl
  };

  // BreadcrumbList Schema (for non-homepage pages)
  const breadcrumbSchema = pageTitle && pageUrl ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": pageTitle,
        "item": `${baseUrl}${pageUrl}`
      }
    ]
  } : null;

  // WebPage Schema (for non-homepage pages)
  const webpageSchema = pageTitle && pageUrl ? {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": pageTitle,
    "description": pageDescription || siteDescription,
    "url": `${baseUrl}${pageUrl}`,
    "isPartOf": {
      "@type": "WebSite",
      "name": siteName,
      "url": baseUrl
    }
  } : null;

  return (
    <Helmet>
      {type === "homepage" ? (
        <>
          <script type="application/ld+json">
            {JSON.stringify(organizationSchema)}
          </script>
          <script type="application/ld+json">
            {JSON.stringify(websiteSchema)}
          </script>
          <script type="application/ld+json">
            {JSON.stringify(softwareApplicationSchema)}
          </script>
        </>
      ) : (
        <>
          {breadcrumbSchema && (
            <script type="application/ld+json">
              {JSON.stringify(breadcrumbSchema)}
            </script>
          )}
          {webpageSchema && (
            <script type="application/ld+json">
              {JSON.stringify(webpageSchema)}
            </script>
          )}
        </>
      )}
    </Helmet>
  );
};

export default StructuredData;

