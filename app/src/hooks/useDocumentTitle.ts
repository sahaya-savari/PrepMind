import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface MetaConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  noIndex?: boolean;
}

const ROUTE_META: Record<string, MetaConfig> = {
  '/': {
    title: 'PrepMind AI — AI-Powered Exam Preparation & Socratic Drills',
    description: 'Personalized exam preparation platform with adaptive practice MCQs, interactive study tutoring, structured concept breakdowns, and progress analytics.',
    canonicalPath: '/',
    noIndex: false,
  },
  '/practice': {
    title: 'Technical Practice Drills & MCQ Calibration — PrepMind AI',
    description: 'High-rigor technical drills across algorithms, distributed systems, SQL, and your private uploaded study materials.',
    canonicalPath: '/practice',
    noIndex: false,
  },
  '/chat': {
    title: 'AI Technical Tutor & Socratic Assistant — PrepMind AI',
    description: 'Real-time Socratic dialogue, conceptual proofs, architectural trade-offs, and grounded retrieval from your study notes.',
    canonicalPath: '/chat',
    noIndex: false,
  },
  '/notebooks': {
    title: 'Private Study Notebooks & Document RAG — PrepMind AI',
    description: 'Private candidate notebooks grounded with vector retrieval, citations, and study synthesis.',
    canonicalPath: '/notebooks',
    noIndex: true,
  },
  '/materials': {
    title: 'Knowledge Library & Study Materials — PrepMind AI',
    description: 'Manage, reprocess, and index your study materials with 768-dimensional vector embeddings for grounded AI retrieval.',
    canonicalPath: '/materials',
    noIndex: true,
  },
  '/progress': {
    title: 'Performance Analytics & Drill Logs — PrepMind AI',
    description: 'Track your diagnostic accuracy, topic strengths, and historical drill progression.',
    canonicalPath: '/progress',
    noIndex: true,
  },
  '/profile': {
    title: 'Candidate Profile & Settings — PrepMind AI',
    description: 'Manage target exam syllabus, cloud synchronization, and credentials.',
    canonicalPath: '/profile',
    noIndex: true,
  },
  '/login': {
    title: 'Candidate Terminal Login — PrepMind AI',
    description: 'Sign in to sync your study drills, benchmark metrics, and Socratic chat history.',
    canonicalPath: '/login',
    noIndex: false,
  },
  '/signup': {
    title: 'Create Candidate Account — PrepMind AI',
    description: 'Create an account to access private study material indexing and cross-device sync.',
    canonicalPath: '/signup',
    noIndex: false,
  },
  '/reset-password': {
    title: 'Password Recovery — PrepMind AI',
    description: 'Request a password recovery link to restore full terminal access.',
    canonicalPath: '/reset-password',
    noIndex: true,
  },
};

export function useDocumentTitle(): void {
  const location = useLocation();

  useEffect(() => {
    const isNotebookDetail = location.pathname.startsWith('/notebooks/');
    const meta: MetaConfig = isNotebookDetail
      ? {
          title: 'Study Notebook Workspace — PrepMind AI',
          description: 'Document-grounded AI notebook workspace with citations.',
          canonicalPath: '/notebooks',
          noIndex: true,
        }
      : ROUTE_META[location.pathname] || {
          title: 'PrepMind AI — AI-Powered Exam Preparation Platform',
          description: 'Personalized exam preparation platform with adaptive practice MCQs and Socratic tutoring.',
          canonicalPath: location.pathname,
          noIndex: false,
        };

    // Update title
    document.title = meta.title;

    // Update meta description
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) {
      descEl.setAttribute('content', meta.description);
    }

    // Update robots directive: private routes are explicitly noindexed
    const robotsEl = document.querySelector('meta[name="robots"]');
    if (robotsEl) {
      robotsEl.setAttribute('content', meta.noIndex ? 'noindex, nofollow' : 'index, follow');
    }

    // Update canonical link
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) {
      canonicalEl.setAttribute('href', `https://prep-weblearning.vercel.app${meta.canonicalPath || location.pathname}`);
    }

    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', meta.title);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', meta.description);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://prep-weblearning.vercel.app${meta.canonicalPath || location.pathname}`);

    // Update Twitter tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', meta.title);

    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', meta.description);
  }, [location.pathname]);
}
