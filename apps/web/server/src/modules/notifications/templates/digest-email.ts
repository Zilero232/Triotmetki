import { createElement as h } from 'react';
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'react-email';

import type { DigestEmailProps } from '../notifications.types';

import { EMAIL_THEME } from '../config/email.constants';

const styles = {
  body: { backgroundColor: EMAIL_THEME.background, fontFamily: EMAIL_THEME.fontFamily, margin: 0, padding: '24px 0' },
  card: { backgroundColor: EMAIL_THEME.card, borderRadius: '12px', padding: '28px', maxWidth: '520px', margin: '0 auto' },
  brand: { color: EMAIL_THEME.accent, fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' },
  heading: { color: EMAIL_THEME.text, fontSize: '22px', margin: '8px 0 16px' },
  text: { color: EMAIL_THEME.muted, fontSize: '15px', lineHeight: '22px' },
  button: { backgroundColor: EMAIL_THEME.accent, borderRadius: '8px', color: EMAIL_THEME.background, fontWeight: 700, padding: '12px 20px' }
} as const;

export const DigestEmail = ({ locale, title, body, url, cta }: DigestEmailProps) =>
  h(
    Html,
    { lang: locale },
    h(Head),
    h(Preview, null, body),
    h(
      Body,
      { style: styles.body },
      h(
        Container,
        { style: styles.card },
        h(Text, { style: styles.brand }, 'Три отметки'),
        h(Heading, { style: styles.heading }, title),
        h(Text, { style: styles.text }, body),
        h(Section, { style: { paddingTop: '12px' } }, h(Button, { href: url, style: styles.button }, cta))
      )
    )
  );
