import assert from "node:assert/strict";
import { test } from "node:test";

import { DEFAULT_KB_CONFIG } from "@/schemas/support";
import {
  isYouTubeSearchResultsUrl,
  localizeDefaultKnowledgeBase,
} from "./knowledgeBasePresentation";

test("localizes default knowledge content without replacing edited admin copy", () => {
  const config = {
    faqs: DEFAULT_KB_CONFIG.faqs.map((faq) => ({ ...faq })),
    tutorials: DEFAULT_KB_CONFIG.tutorials.map((tutorial) => ({ ...tutorial })),
  };
  config.faqs[1].answer = "Admin-edited battery guidance";
  config.tutorials[2].title = "Admin-edited production tutorial";
  config.tutorials[1].videoUrl = "https://www.youtube.com/watch?v=admin-selected-video";

  const localized = localizeDefaultKnowledgeBase(config, {
    faqs: new Map([
      ["faq-inverter-1", { question: "Localized inverter question", answer: "Localized inverter answer" }],
      ["faq-battery-1", { question: "Localized battery question", answer: "Localized battery answer" }],
    ]),
    tutorials: new Map([
      [
        "tut-1",
        {
          title: "Localized inverter tutorial",
          description: "Localized inverter description",
          duration: "4 min",
          searchTerm: "ไฟแดงอินเวอร์เตอร์",
        },
      ],
      [
        "tut-3",
        {
          title: "Localized production tutorial",
          description: "Localized production description",
          duration: "5 min",
          searchTerm: "solar production graph",
        },
      ],
      [
        "tut-2",
        {
          title: "Localized bill tutorial",
          description: "Localized bill description",
          duration: "6 min",
          searchTerm: "วิธีอ่านบิลค่าไฟ",
        },
      ],
    ]),
  });

  assert.equal(localized.faqs[0].question, "Localized inverter question");
  assert.equal(localized.faqs[1].answer, "Admin-edited battery guidance");
  assert.equal(localized.faqs[1].question, "Localized battery question");
  assert.equal(localized.tutorials[0].title, "Localized inverter tutorial");
  assert.equal(localized.tutorials[0].description, "Localized inverter description");
  assert.equal(
    new URL(localized.tutorials[0].videoUrl).searchParams.get("search_query"),
    "ไฟแดงอินเวอร์เตอร์",
  );
  assert.equal(localized.tutorials[1].title, "Localized bill tutorial");
  assert.equal(
    localized.tutorials[1].videoUrl,
    "https://www.youtube.com/watch?v=admin-selected-video",
  );
  assert.equal(localized.tutorials[2].title, "Admin-edited production tutorial");
  assert.equal(config.faqs[0].question, DEFAULT_KB_CONFIG.faqs[0].question);
});

test("identifies YouTube search result links without mislabeling direct videos", () => {
  assert.equal(isYouTubeSearchResultsUrl("https://www.youtube.com/results?search_query=solar"), true);
  assert.equal(isYouTubeSearchResultsUrl("https://youtube.com/results?search_query=solar"), true);
  assert.equal(isYouTubeSearchResultsUrl("https://www.youtube.com/watch?v=abc123"), false);
  assert.equal(isYouTubeSearchResultsUrl("https://youtu.be/abc123"), false);
  assert.equal(isYouTubeSearchResultsUrl("https://youtube.com.evil.test/results"), false);
  assert.equal(isYouTubeSearchResultsUrl("not a URL"), false);
});
