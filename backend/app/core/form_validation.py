import re
from typing import Any, Dict, List
from fastapi import HTTPException, status

from app.core.validation_constants import PHONE_REGEX, PASSPORT_REGEX, NID_REGEX, VISA_NUMBER_REGEX, IQAMA_REGEX

def validate_dynamic_form(schema: Dict[str, Any], data: Dict[str, Any]):
    """
    Validates submission data against a ServiceDefinition form_schema.
    Raises HTTPException 422 if validation fails.
    Supports extended types: text, number, email, phone, passport, nid, visa_number, date, file, select.
    """
    errors = []
    sections = schema.get("sections", [])

    for section in sections:
        fields = section.get("fields", [])
        for field in fields:
            key = field.get("key")
            label = field.get("label")
            is_required = field.get("required", False)
            is_admin_only = field.get("admin_only", False)
            field_type = field.get("type")
            options = field.get("options", [])
            validation = field.get("validation", {})

            # 1. Check Required (Skip if admin_only as clients won't have this data)
            if is_required and not is_admin_only and (key not in data or data[key] == "" or data[key] is None):
                errors.append(f"Field '{label}' is required.")
                continue

            # If field is not present and not required, skip type checks
            if key not in data or data[key] == "" or data[key] is None:
                continue

            val = data[key]

            # 2. Check Types & Patterns
            if field_type == "number":
                try:
                    num_val = float(val)
                    if "min" in validation and num_val < validation["min"]:
                        errors.append(f"Field '{label}' must be at least {validation['min']}.")
                    if "max" in validation and num_val > validation["max"]:
                        errors.append(f"Field '{label}' must be at most {validation['max']}.")
                except (ValueError, TypeError):
                    errors.append(f"Field '{label}' must be a number.")
            
            elif field_type == "email":
                if "@" not in str(val) or "." not in str(val):
                    errors.append(f"Field '{label}' must be a valid email address.")

            elif field_type == "phone":
                if not re.match(PHONE_REGEX, str(val)):
                    errors.append(f"Field '{label}' must be a valid phone number (10-20 characters).")

            elif field_type == "passport":
                if not re.match(PASSPORT_REGEX, str(val)):
                    errors.append(f"Field '{label}' must be a valid passport number (6-20 alphanumeric).")

            elif field_type == "nid":
                if not re.match(NID_REGEX, str(val)):
                    errors.append(f"Field '{label}' must be a valid NID (10-20 digits).")

            elif field_type == "visa_number":
                if not re.match(VISA_NUMBER_REGEX, str(val)):
                    errors.append(f"Field '{label}' must be a valid Visa Number (10-20 digits).")

            elif field_type == "iqama":
                if not re.match(IQAMA_REGEX, str(val)):
                    errors.append(f"Field '{label}' must be a valid Iqama Number (8-25 digits/characters).")

            # 3. Check Select Options
            if field_type == "select" and options:
                if val not in options:
                    errors.append(f"Invalid option '{val}' for field '{label}'. Allowed: {', '.join(options)}")

            # 4. Check File (Backend just expects a string URL/Path)
            if field_type == "file":
                if not isinstance(val, str) or not (val.startswith("http") or val.startswith("/static/") or val.startswith("/api/")):
                    errors.append(f"Field '{label}' must be a valid file reference.")

            # 5. Generic Validation (Min/Max Length, Regex)
            val_str = str(val)
            if "minLength" in validation and len(val_str) < validation["minLength"]:
                errors.append(f"Field '{label}' must be at least {validation['minLength']} characters.")
            if "maxLength" in validation and len(val_str) > validation["maxLength"]:
                errors.append(f"Field '{label}' must be at most {validation['maxLength']} characters.")
            if "pattern" in validation:
                try:
                    if not re.match(validation["pattern"], val_str):
                        errors.append(f"Field '{label}' format is invalid.")
                except re.error:
                    pass # Ignore invalid regex in schema to prevent crash

    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"message": "Validation failed", "errors": errors}
        )

    return True
