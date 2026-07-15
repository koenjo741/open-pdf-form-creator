import type { FieldDef } from '../../types';
import type { FieldGeneratorContext } from './types';
import { generateTextField } from './generateTextField';

export function generateTimeField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  generateTextField(field, rect, ctx, isDuplicate);
}
