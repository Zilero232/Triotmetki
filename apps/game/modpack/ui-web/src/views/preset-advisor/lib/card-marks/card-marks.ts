import type { HasMarkInput, MarkCardInput, MarkCardsInput, ShowsImageInput } from './card-marks.types';

import { PRESET_ADVISOR } from '../../config';

const { markAttribute, positionedAttribute, badgeClass, cardPattern, maxCardDepth, staticPosition, imageExtension } = PRESET_ADVISOR.dom;

const hasMark = ({ element, name }: HasMarkInput): boolean => element.getAttribute(name) !== null;

const imageOf = (element: Element): string => {
  if (element.tagName === 'IMG') {
    return element.getAttribute('src') ?? '';
  }

  return element instanceof HTMLElement ? element.style.backgroundImage : '';
};

const showsImage = ({ url, images }: ShowsImageInput): boolean => url !== '' && images.some((name) => url.includes(`/${name}${imageExtension}`));

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
  if (!hasMark({ element: card, name: markAttribute })) {
    card.setAttribute(markAttribute, '');
  }

  if (card instanceof HTMLElement && !hasMark({ element: card, name: positionedAttribute }) && isStatic(card)) {
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

  if (card instanceof HTMLElement && hasMark({ element: card, name: positionedAttribute })) {
    card.removeAttribute(positionedAttribute);
    card.style.position = '';
  }
};

export const markCards = ({ root, images, label }: MarkCardsInput): number => {
  const cards = new Set<Element>();
  const elements = Array.from(root.getElementsByTagName('*'));

  if (images.length > 0) {
    for (const element of elements) {
      if (showsImage({ url: imageOf(element), images })) {
        cards.add(cardOf(element));
      }
    }
  }

  for (const element of elements) {
    if (!cards.has(element) && hasMark({ element, name: markAttribute })) {
      unmarkCard(element);
    }
  }

  cards.forEach((card) => markCard({ card, label }));

  return cards.size;
};
