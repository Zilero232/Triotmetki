'use client';

import type { CompactErrorViewProps } from '@/views/error';

import { CompactErrorView } from '@/views/error';

const ErrorPage = ({ error, reset }: CompactErrorViewProps) => <CompactErrorView error={error} reset={reset} />;

export default ErrorPage;
