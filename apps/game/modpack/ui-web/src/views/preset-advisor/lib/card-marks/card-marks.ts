import type { MarkCardInput, MarkCardsInput } from './card-marks.types';

import { PRESET_ADVISOR } from '../../config';

const { markAttribute, positionedAttribute, badgeClass, cardPattern, maxCardDepth, staticPosition, imageExtension } = PRESET_ADVISOR.dom;

const imageOf = (element: Element): string => {
  if (element.tagName === 'IMG') {
    return element.getAttribute('src') ?? '';
  }

  return element instanceof HTMLElement ? element.style.backgroundImage : '';
};

const showsImage = (url: string, images: readonly string[]): boolean =>
  url !== '' && images.some((name) => url.includes(`/${name}${imageExtension}`));

const isCard = (element: Element): boolean => cardPattern.test(element.getAttribute('class') ?? '');

const cardOf = (element: Element): Element => {
  let current: Element | null = element;

  for (let depth = 0; current && depth <= maxCardDepth; depth += 1) {
    if (isCard(current)) {
      return current;
    }

    current = current.parentElement;
  }

  return element.parentElement ?? element;
};

const badgeOf = (card: Element): Element | null => Array.from(card.children).find((child) => child.classList.contains(badgeClass)) ?? null;

const isStatic = (card: HTMLElement): boolean => card.ownerDocument.defaultView?.getComputedStyle(card).position === staticPosition;

const markCard = ({ card, label }: MarkCardInput): void => {
  if (!card.hasAttribute(markAttribute)) {
    card.setAttribute(markAttribute, '');
  }

  if (card instanceof HTMLElement && !card.hasAttribute(positionedAttribute) && isStatic(card)) {
    card.setAttribute(positionedAttribute, '');
    card.style.position = 'relative';
  }

  const badge = badgeOf(card);

  if (badge?.textContent === label) {
    return;
  }

  badge?.remove();

  if (label !== '') {
    const created = card.ownerDocument.createElement('div');

    created.className = badgeClass;
    created.textContent = label;
    card.appendChild(created);
  }
};

const unmarkCard = (card: Element): void => {
  card.removeAttribute(markAttribute);
  badgeOf(card)?.remove();

  if (card instanceof HTMLElement && card.hasAttribute(positionedAttribute)) {
    card.removeAttribute(positionedAttribute);
    card.style.position = '';
  }
};

export const markCards = ({ root, images, label }: MarkCardsInput): number => {
  const cards = new Set<Element>();

  if (images.length > 0) {
    for (const element of Array.from(root.getElementsByTagName('*'))) {
      if (showsImage(imageOf(element), images)) {
        cards.add(cardOf(element));
      }
    }
  }

  for (const marked of Array.from(root.querySelectorAll(`[${markAttribute}]`))) {
    if (!cards.has(marked)) {
      unmarkCard(marked);
    }
  }

  cards.forEach((card) => markCard({ card, label }));

  return cards.size;
};
