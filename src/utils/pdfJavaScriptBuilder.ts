import type { FieldDef } from '../types';

/**
 * Builds Adobe Acrobat JavaScript for calculated fields.
 */
export function buildCalculationJavaScript(calculation: string, isNumber: boolean): string {
  let jsStr = '';
  if (isNumber) {
    jsStr = calculation.replace(/\[([^\]]+)\]/g, '(Number(this.getField("$1").value) || 0)');
  } else {
    jsStr = calculation.replace(/\[([^\]]+)\]/g, 'this.getField("$1").value');
  }
  return `event.value = ${jsStr};`;
}

/**
 * Builds Adobe Acrobat JavaScript for Regex validation.
 */
export function buildValidationJavaScript(customRegex: string, regexErrorMsg?: string): string {
  // Escape backslashes and double quotes for PDF JavaScript string literal
  const safeRegex = customRegex.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const errorMsg = (regexErrorMsg || 'Ungültiges Format.').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  
  return `
var re = new RegExp("${safeRegex}");
if (event.value && !re.test(event.value)) {
  app.alert("${errorMsg}");
  event.rc = false;
}
`;
}

/**
 * Builds Adobe Acrobat JavaScript for conditional logic (activation/deactivation of fields based on other fields).
 */
export function buildConditionalLogicJavaScript(sortedFields: FieldDef[]): string {
  let conditionJs = '';
  
  for (const field of sortedFields) {
    if (field.enableCondition) {
      const ctrlField = sortedFields.find(f => f.id === field.enableCondition!.targetFieldId);
      if (ctrlField && ctrlField.name && field.name) {
        const ctrlName = ctrlField.type === 'radio' ? (ctrlField.groupName || ctrlField.name) : ctrlField.name;
        const depName = field.name;
        const idSafe = field.id.replace(/-/g, '');
        
        if (field.enableCondition.condition === 'isChecked') {
          conditionJs += `
var ctrl_${idSafe} = this.getField("${ctrlName}");
var dep_${idSafe} = this.getField("${depName}");
if (ctrl_${idSafe} && dep_${idSafe}) {
  if (ctrl_${idSafe}.value === "Off") {
    dep_${idSafe}.readonly = true;
    dep_${idSafe}.fillColor = ["G", 0.9];
  } else {
    dep_${idSafe}.readonly = false;
    dep_${idSafe}.fillColor = ["T"];
  }
}
`;
        } else {
          let val = field.enableCondition.value || '';
          if (ctrlField.type === 'radio') {
            val = ctrlField.radioValue || ctrlField.id.slice(0, 8);
          }
          
          if (val === '*') {
            conditionJs += `
var ctrl_${idSafe} = this.getField("${ctrlName}");
var dep_${idSafe} = this.getField("${depName}");
if (ctrl_${idSafe} && dep_${idSafe}) {
  if (!ctrl_${idSafe}.value) {
    dep_${idSafe}.readonly = true;
    dep_${idSafe}.fillColor = ["G", 0.9];
  } else {
    dep_${idSafe}.readonly = false;
    dep_${idSafe}.fillColor = ["T"];
  }
}
`;
          } else {
            conditionJs += `
var ctrl_${idSafe} = this.getField("${ctrlName}");
var dep_${idSafe} = this.getField("${depName}");
if (ctrl_${idSafe} && dep_${idSafe}) {
  if (ctrl_${idSafe}.value !== "${val}") {
    dep_${idSafe}.readonly = true;
    dep_${idSafe}.fillColor = ["G", 0.9];
  } else {
    dep_${idSafe}.readonly = false;
    dep_${idSafe}.fillColor = ["T"];
  }
}
`;
          }
        }
      }
    }
  }
  
  return conditionJs;
}
