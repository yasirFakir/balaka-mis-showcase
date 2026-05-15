import * as z from "zod";
import { FormSchema } from "./form-types";

// Relaxed patterns to match backend and support international inputs
export const PHONE_REGEX = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$|^(\+?[0-9\s\-\(\)]{10,20})?$/;
// Allow almost anything for names to support Bangla, etc.
export const NAME_REGEX = /^.*$/;
export const PASSPORT_REGEX = /^[a-zA-Z0-9\s\-]{5,25}$/;
export const NID_REGEX = /^[0-9\s\-]{8,25}$/;
export const VISA_NUMBER_REGEX = /^[0-9\s\-]{8,25}$/;
export const IQAMA_REGEX = /^[0-9\s\-]{8,25}$/;

// Accepted Email Domains (Whitelist Approach #164)
export const ACCEPTED_EMAIL_DOMAINS = [
  "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", 
  "icloud.com", "me.com", "live.com", "msn.com", "aol.com",
  "balaka.com", "example.com", "test.com"
];

export function generateZodSchema(schema: FormSchema, isInternal = false) {
  const zodSchemaObject: Record<string, z.ZodTypeAny> = {};
  const defaultValues: Record<string, any> = {};

  schema.sections.forEach((section) => {
    section.fields.forEach((field) => {
      const isActuallyRequired = field.required && (!field.admin_only || isInternal);
      
      // Default value initialization
      if (field.type === "date") {
        defaultValues[field.key] = undefined; 
      } else if (field.type === "checkbox_group" || field.type === "list") {
        defaultValues[field.key] = [];
      } else if (field.type === "checkbox") {
        defaultValues[field.key] = false;
      } else {
        defaultValues[field.key] = "";
      }

      let validator: any;

      switch (field.type) {
        case "checkbox":
          validator = z.boolean();
          break;

        case "list":
          validator = z.array(z.string());
          if (isActuallyRequired) {
              validator = validator.min(1, { message: `At least one ${field.label} is required` });
          } else {
              validator = validator.optional().or(z.literal(null)).or(z.array(z.string()));
          }
          break;

        case "number":
          validator = z.any().transform((val) => {
             if (val === "" || val === undefined || val === null) return undefined;
             const num = Number(val);
             return isNaN(num) ? undefined : num;
          });
          
          if (isActuallyRequired) {
             validator = validator.transform((val: any) => val ?? 0);
          } else {
             validator = validator.optional();
          }

          if (field.validation?.min !== undefined) {
             validator = validator.refine((val: any) => !val || val >= field.validation!.min!, { message: `Minimum value is ${field.validation!.min}` });
          }
          if (field.validation?.max !== undefined) {
             validator = validator.refine((val: any) => !val || val <= field.validation!.max!, { message: `Maximum value is ${field.validation!.max}` });
          }
          break;

        case "email":
          validator = z.string();
          if (isActuallyRequired) {
             validator = validator.min(1, { message: `${field.label} is required` }).email({ message: "Invalid email address" });
          } else {
             validator = validator.email().optional().or(z.literal(""));
          }

          // Enforce email whitelist (#164)
          validator = validator.refine((val: string) => {
            if (!val) return true;
            const domain = val.split("@").pop()?.toLowerCase();
            return ACCEPTED_EMAIL_DOMAINS.includes(domain || "");
          }, {
            message: "Please use a trusted email provider (e.g., Gmail, Outlook)."
          });
          break;

        case "phone":
          validator = z.string();
          if (isActuallyRequired) {
             validator = validator.min(1, { message: `${field.label} is required` }).regex(PHONE_REGEX, { message: "Invalid Phone Number" });
          } else {
             validator = validator.regex(PHONE_REGEX, { message: "Invalid Phone Number" }).optional().or(z.literal(""));
          }
          break;

        case "passport":
          validator = z.string();
          if (isActuallyRequired) {
             validator = validator.min(1, { message: `${field.label} is required` }).regex(PASSPORT_REGEX, { message: "Invalid Passport. Must be 6-20 alphanumeric characters" });
          } else {
             validator = validator.regex(PASSPORT_REGEX, { message: "Invalid Passport" }).optional().or(z.literal(""));
          }
          break;

        case "nid":
          validator = z.string();
          if (isActuallyRequired) {
             validator = validator.min(1, { message: `${field.label} is required` }).regex(NID_REGEX, { message: "Invalid NID. Must be 10-20 digits" });
          } else {
             validator = validator.regex(NID_REGEX, { message: "Invalid NID" }).optional().or(z.literal(""));
          }
          break;

        case "visa_number":
          validator = z.string();
          if (isActuallyRequired) {
             validator = validator.min(1, { message: `${field.label} is required` }).regex(VISA_NUMBER_REGEX, { message: "Invalid Visa Number. Must be 10-20 digits" });
          } else {
             validator = validator.regex(VISA_NUMBER_REGEX, { message: "Invalid Visa Number" }).optional().or(z.literal(""));
          }
          break;

        case "iqama":
          validator = z.string();
          if (isActuallyRequired) {
             validator = validator.min(1, { message: `${field.label} is required` }).regex(IQAMA_REGEX, { message: "Invalid Iqama. Must be 10-20 digits" });
          } else {
             validator = validator.regex(IQAMA_REGEX, { message: "Invalid Iqama" }).optional().or(z.literal(""));
          }
          break;

        case "date":
          validator = z.date();
          if (isActuallyRequired) {
            validator = z.date({ message: `${field.label} is required` });
          } else {
            validator = z.date().optional();
          }
          break;

        case "year":
          validator = z.string();
          if (isActuallyRequired) {
             validator = validator.min(1, { message: `${field.label} is required` });
          } else {
             validator = validator.optional();
          }
          break;

        case "checkbox_group":
          validator = z.array(z.string());
          if (isActuallyRequired) {
              validator = validator.min(1, { message: `Select at least one ${field.label}` });
          }
          break;

        default: // text, textarea, file, select, etc.
          validator = z.string();
          
          // Auto-apply validations based on key names for better UX, BUT NOT FOR FILES
          if (field.type !== 'file') {
              if (field.key.includes("passport")) {
                  validator = validator.regex(PASSPORT_REGEX, { message: "Invalid Passport Format" });
              } else if (field.key.includes("nid") || field.key.includes("national_id")) {
                  validator = validator.regex(NID_REGEX, { message: "Invalid NID Format" });
              } else if (field.key.includes("visa_number")) {
                  validator = validator.regex(VISA_NUMBER_REGEX, { message: "Invalid Visa Number" });
              } else if (field.key.includes("iqama")) {
                  validator = validator.regex(IQAMA_REGEX, { message: "Invalid Iqama Number" });
              } else if (field.key.includes("name") || field.key.includes("full_name")) {
                  validator = validator.regex(NAME_REGEX, { message: "Invalid Name" });
              }
          }

          if (isActuallyRequired) {
             validator = validator.min(1, { message: `${field.label} is required` });
          } else {
             validator = validator.optional();
          }

          if (field.validation?.minLength !== undefined) {
             validator = validator.min(field.validation.minLength, { message: `Minimum length is ${field.validation.minLength}` });
          }
          if (field.validation?.maxLength !== undefined) {
             validator = validator.max(field.validation.maxLength, { message: `Maximum length is ${field.validation.maxLength}` });
          }
          if (field.validation?.pattern) {
             try {
                const regex = new RegExp(field.validation.pattern);
                validator = validator.regex(regex, { message: "Invalid format" });
             } catch (e) {
                console.warn(`Invalid regex pattern for field ${field.key}: ${field.validation.pattern}`);
             }
          }
      }
      
      zodSchemaObject[field.key] = validator;
    });
  });

  return {
      schema: z.object(zodSchemaObject),
      defaultValues
  };
}
