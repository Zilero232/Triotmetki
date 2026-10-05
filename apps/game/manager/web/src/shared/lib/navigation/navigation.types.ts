import type { PAGE_IDS, PAGE_SECTIONS } from '../../config';

export type PageId = (typeof PAGE_IDS)[number];

export type SectionId = keyof typeof PAGE_SECTIONS;

export type TabbedSectionId = { [Section in SectionId]: (typeof PAGE_SECTIONS)[Section]['tabs'] extends true ? Section : never }[SectionId];

export type NavigationParams = {
  preset?: string | null;
  profileCode?: string;
  profileId?: string;
  components?: string[];
  review?: boolean;
};

export type NavigationTarget = {
  page: PageId;
  params?: NavigationParams;
};

export type NavigationValue = {
  page: PageId;
  params: NavigationParams;
  visit: number;
  navigate: (target: NavigationTarget) => void;
};
