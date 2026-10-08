const isNewTabClick = (event: MouseEvent): boolean => {
  const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

  return event.button !== 0 || hasModifier;
};

const anchorOf = (event: MouseEvent): HTMLAnchorElement | null => {
  if (!(event.target instanceof Element)) {
    return null;
  }

  const anchor = event.target.closest('a[href]');

  return anchor instanceof HTMLAnchorElement ? anchor : null;
};

const opensElsewhere = (anchor: HTMLAnchorElement): boolean => {
  const opensNewWindow = anchor.target !== '' && anchor.target !== '_self';

  return opensNewWindow || anchor.hasAttribute('download');
};

const isSamePage = (anchor: HTMLAnchorElement): boolean => {
  const next = new URL(anchor.href, window.location.href);

  return next.pathname === window.location.pathname && next.search === window.location.search;
};

export const isLeavingClick = (event: MouseEvent): boolean => {
  if (event.defaultPrevented || isNewTabClick(event)) {
    return false;
  }

  const anchor = anchorOf(event);

  if (!anchor || opensElsewhere(anchor)) {
    return false;
  }

  return !isSamePage(anchor);
};
