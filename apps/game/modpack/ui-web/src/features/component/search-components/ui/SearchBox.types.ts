export type SearchBoxProps = {
  query: string;
  onChange: (query: string) => void;
  onClear: () => void;
};
