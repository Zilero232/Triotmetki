'use client';

import { Clock, Pencil } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import Image from 'next/image';

import { BLOG_CATEGORY_TONE, BlogCategoryChip, useBlogEditorAccess } from '@/entities/blog/post';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Avatar, Breadcrumbs, buttonVariants } from '@/ui-kit';

import { useArticle } from '../../../model/context';

import s from './ArticleHero.module.scss';

export const ArticleHero = () => {
  const t = useTranslations('blog.article');
  const format = useFormatter();
  const { post } = useArticle();
  const { canEdit } = useBlogEditorAccess();

  return (
    <header className={s.root} data-cover={post.cover !== null} data-tone={BLOG_CATEGORY_TONE[post.category]}>
      {post.cover && (
        <Image
          fill
          unoptimized
          alt=''
          className={s.cover}
          fetchPriority='high'
          loading='eager'
          referrerPolicy='no-referrer'
          sizes='100vw'
          src={post.cover}
        />
      )}
      <span aria-hidden className={s.scrim} />
      <div className={s.inner}>
        <Breadcrumbs className={s.crumbs} items={[{ label: t('breadcrumb'), href: ROUTES.blog.list }, { label: post.title }]} />
        <span className={s.chip}>
          <BlogCategoryChip category={post.category} />
        </span>
        <h1 className={s.title}>{post.title}</h1>
        <p className={s.lead}>{post.excerpt}</p>
        <div className={s.meta}>
          <span className={s.author}>
            {post.author && <Avatar name={post.author.name} size='sm' src={post.author.image ?? undefined} />}
            {post.author?.name ?? t('team')}
          </span>
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{t('published', { date: format.dateTime(new Date(post.publishedAt), 'date') })}</time>
          )}
          <span className={s.reading}>
            <Clock aria-hidden size={14} />
            {t('readingTime', { minutes: post.readingMinutes })}
          </span>
          {canEdit && (
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.blog.editor.edit(post.id)}>
              <Pencil aria-hidden size={14} />
              {t('edit')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
