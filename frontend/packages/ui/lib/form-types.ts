export interface FieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "email" | "select" | "file" | "date" | "textarea" | "password" | "phone" | "passport" | "nid" | "visa_number" | "iqama" | "checkbox_group" | "year" | "checkbox" | "list";
  required?: boolean;
  read_only?: boolean;
  options?: string[]; // For select inputs
  accept?: string;    // For file inputs
  placeholder?: string;
  source?: "staff" | "vendors" | "clients"; // Dynamic Data Source
  admin_only?: boolean;
  conditions?: {
    depend_on: string;
    value: any;
    action: "hide" | "disable";
  }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string; // Regex string
  };
}

export interface SectionDefinition {
  title?: string;
  fields: FieldDefinition[];
}

export interface FormSchema {
  sections: SectionDefinition[];
}
