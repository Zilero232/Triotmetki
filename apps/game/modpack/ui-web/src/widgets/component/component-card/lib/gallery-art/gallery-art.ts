import type { ArtStyle } from './gallery-art.types';

export const artStyle = (image: string): ArtStyle => ({ backgroundImage: `url("${image}")` });
