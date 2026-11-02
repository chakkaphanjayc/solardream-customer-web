import { DEFAULT_KB_CONFIG, type KnowledgeBaseConfig } from "@/schemas/support";

type FAQItem = KnowledgeBaseConfig["faqs"][number];
type TutorialItem = KnowledgeBaseConfig["tutorials"][number];

export interface LocalizedKnowledgeBaseCopy {
  faqs: ReadonlyMap<string, Pick<FAQItem, "question" | "answer">>;
  tutorials: ReadonlyMap<
    string,
    Pick<TutorialItem, "title" | "description" | "duration"> & { searchTerm: string }
  >;
}

const defaultFAQsById = new Map(DEFAULT_KB_CONFIG.faqs.map((item) => [item.id, item]));
const defaultTutorialsById = new Map(DEFAULT_KB_CONFIG.tutorials.map((item) => [item.id, item]));

export function localizeDefaultKnowledgeBase(
  config: KnowledgeBaseConfig,
  copy: LocalizedKnowledgeBaseCopy,
): KnowledgeBaseConfig {
  return {
    faqs: config.faqs.map((faq) => {
      const defaultFAQ = defaultFAQsById.get(faq.id);
      const localizedFAQ = copy.faqs.get(faq.id);

      if (
        !defaultFAQ ||
        !localizedFAQ
      ) {
        return faq;
      }

      return {
        ...faq,
        question: faq.question === defaultFAQ.question ? localizedFAQ.question : faq.question,
        answer: faq.answer === defaultFAQ.answer ? localizedFAQ.answer : faq.answer,
      };
    }),
    tutorials: config.tutorials.map((tutorial) => {
      const defaultTutorial = defaultTutorialsById.get(tutorial.id);
      const localizedTutorial = copy.tutorials.get(tutorial.id);

      if (!defaultTutorial || !localizedTutorial) {
        return tutorial;
      }

      const { searchTerm, ...localizedText } = localizedTutorial;
      const searchParams = new URLSearchParams({ search_query: searchTerm });
      const localizedVideoUrl = tutorial.videoUrl === defaultTutorial.videoUrl
        ? `https://www.youtube.com/results?${searchParams.toString()}`
        : tutorial.videoUrl;

      return {
        ...tutorial,
        title: tutorial.title === defaultTutorial.title ? localizedText.title : tutorial.title,
        description: tutorial.description === defaultTutorial.description
          ? localizedText.description
          : tutorial.description,
        duration: tutorial.duration === defaultTutorial.duration ? localizedText.duration : tutorial.duration,
        videoUrl: localizedVideoUrl,
      };
    }),
  };
}

export function isYouTubeSearchResultsUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return (
      (url.hostname === "youtube.com" || url.hostname === "www.youtube.com") &&
      url.pathname === "/results"
    );
  } catch {
    return false;
  }
}
