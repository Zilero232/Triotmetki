'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { MarkdownEditor } from '@/features/community/markdown-editor';
import { Button, Card, ConfirmDialog, FormField, FormFooter, Input, SegmentedControl, Select, Switch, Textarea } from '@/ui-kit';

import type { BlogPostFormProps } from './BlogPostForm.types';

import { BLOG_POST_FORM } from '../../../config';
import { useBlogPostForm } from '../../../model/hooks';
import { CoverField } from './components';

import s from './BlogPostForm.module.scss';

export const BlogPostForm = ({ post }: BlogPostFormProps) => {
  const t = useTranslations('blog.editor.form');
  const editor = useBlogPostForm(post);

  const { errors } = editor.form.formState;

  return (
    <form noValidate className={s.root} onSubmit={editor.onFormSubmit}>
      <div className={s.layout}>
        <Card className={s.main} padding='lg'>
          <FormField error={errors.title && t('errors.title', editor.titleLimit)} hint={t('counter', editor.titleLimit)} label={t('title')}>
            <Input
              isInvalid={Boolean(errors.title)}
              maxLength={BLOG_POST_FORM.titleMax}
              placeholder={t('titlePlaceholder')}
              {...editor.form.register('title')}
            />
          </FormField>
          <FormField error={errors.excerpt && t('errors.excerpt', editor.excerptLimit)} hint={t('counter', editor.excerptLimit)} label={t('excerpt')}>
            <Textarea
              isInvalid={Boolean(errors.excerpt)}
              maxLength={BLOG_POST_FORM.excerptMax}
              placeholder={t('excerptPlaceholder')}
              rows={BLOG_POST_FORM.rows}
              {...editor.form.register('excerpt')}
            />
          </FormField>
          <FormField error={errors.body && t('errors.body')} hint={t('bodyHint')} label={t('body')}>
            <Controller
              render={({ field, fieldState }) => (
                <MarkdownEditor
                  isInvalid={fieldState.invalid}
                  markdown={field.value}
                  placeholder={t('bodyPlaceholder')}
                  onChange={field.onChange}
                  onImageUpload={editor.onImageUpload}
                />
              )}
              control={editor.form.control}
              name='body'
            />
          </FormField>
        </Card>
        <div className={s.side}>
          <Card className={s.panel} padding='lg'>
            <FormField label={t('category')}>
              <Controller
                control={editor.form.control}
                name='category'
                render={({ field }) => <Select items={editor.categoryItems} value={field.value} onValueChange={field.onChange} />}
              />
            </FormField>
            <FormField label={t('locale')}>
              <Controller
                render={({ field }) => (
                  <SegmentedControl aria-label={t('locale')} options={editor.localeOptions} size='sm' value={field.value} onChange={field.onChange} />
                )}
                control={editor.form.control}
                name='locale'
              />
            </FormField>
            <FormField error={errors.tags && t('errors.tags')} hint={t('tagsHint')} label={t('tags')}>
              <Input isInvalid={Boolean(errors.tags)} placeholder={t('tagsPlaceholder')} {...editor.form.register('tags')} />
            </FormField>
            <Controller
              render={({ field }) => (
                <Switch checked={field.value} description={t('featuredHint')} label={t('featured')} onCheckedChange={field.onChange} />
              )}
              control={editor.form.control}
              name='isFeatured'
            />
          </Card>
          <CoverField
            hasUploadedCover={editor.hasUploadedCover}
            isInvalid={Boolean(errors.coverUrl)}
            isUploading={editor.isUploadingCover}
            preview={editor.coverPreview}
            urlField={editor.form.register('coverUrl')}
            onFile={editor.onCoverFile}
            onRemove={editor.onCoverRemove}
          />
          <Card className={s.panel} padding='lg'>
            <FormField error={errors.slug && t('errors.slug')} hint={t('slugHint')} label={t('slug')}>
              <Input isInvalid={Boolean(errors.slug)} placeholder={t('slugPlaceholder')} {...editor.form.register('slug')} />
            </FormField>
            <FormField error={errors.seoTitle && t('errors.seoTitle')} label={t('seoTitle')}>
              <Input isInvalid={Boolean(errors.seoTitle)} {...editor.form.register('seoTitle')} />
            </FormField>
            <FormField error={errors.seoDescription && t('errors.seoDescription')} label={t('seoDescription')}>
              <Textarea isInvalid={Boolean(errors.seoDescription)} rows={BLOG_POST_FORM.rows} {...editor.form.register('seoDescription')} />
            </FormField>
          </Card>
        </div>
      </div>
      <FormFooter>
        <Button disabled={editor.isPending} type='button' variant='secondary' onClick={editor.onSaveDraft}>
          {editor.draftLabel}
        </Button>
        <Button disabled={editor.isPending} type='button' onClick={editor.onPublish}>
          {editor.publishLabel}
        </Button>
      </FormFooter>
      <ConfirmDialog
        cancelLabel={t('cancel')}
        confirmLabel={t('unpublish')}
        description={t('unpublishDescription')}
        isPending={editor.isPending}
        open={editor.isUnpublishOpen}
        title={t('unpublishTitle')}
        tone='danger'
        onConfirm={editor.onUnpublish}
        onOpenChange={editor.onUnpublishOpenChange}
      />
    </form>
  );
};
