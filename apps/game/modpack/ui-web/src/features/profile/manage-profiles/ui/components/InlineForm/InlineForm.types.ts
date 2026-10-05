export type InlineFormProps = {
  value: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  maxLength?: number;
  accent?: boolean;
  onValue: (value: string) => void;
  onKey: (key: string) => void;
  onSubmit: () => void;
};
