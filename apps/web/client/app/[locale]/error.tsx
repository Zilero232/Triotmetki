'use client';

import type { ErrorViewProps } from '@/views/error';

import { ErrorView } from '@/views/error';

const ErrorPage = ({ error, reset }: ErrorViewProps) => <ErrorView withAttribution error={error} reset={reset} />;

export default ErrorPage;
