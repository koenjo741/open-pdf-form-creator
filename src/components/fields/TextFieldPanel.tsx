import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function TextFieldPanel({ field }: Props) {
  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />
      <FieldTextStyling field={field} />
    </div>
  );
}
