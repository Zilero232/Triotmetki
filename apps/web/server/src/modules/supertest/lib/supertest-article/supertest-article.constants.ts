export const SUPERTEST_ARTICLE_PARAMS = {
  angleParams: new Set<string>(['depression', 'elevation']),
  changeVerb: /увелич|уменьш|измен|улучш|ухудш|сниж|повыш|сокращ|ускор|замедл|добавл|убран/iu,
  closingPunctuation: /[.:!?,;]$/u
} as const;
