# Shared Regex Patterns for Balaka MIS
# Relaxed patterns to prevent unnecessary 422 errors during creation

# Phone: Allow +, digits, spaces, hyphens, parentheses. Min 5 chars.
PHONE_REGEX = r"^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,10}$|^(\+?[0-9\s\-\(\)]{5,25})?$"

# Name: Letters, spaces, dots, hyphens. Case insensitive.
# Note: Pydantic regex is for Python `re`, which doesn't support \p{L} easily without regex module.
# We'll stick to a permissive pattern.
NAME_REGEX = r"^.*$"

# Passport: Alphanumeric
PASSPORT_REGEX = r"^([a-zA-Z0-9\s\-]{5,25})?$"

# NID: Numeric mostly
NID_REGEX = r"^([0-9\s\-]{8,25})?$"

# Iqama / Visa Number: Numeric mostly
IQAMA_REGEX = r"^([0-9\s\-]{8,25})?$"
VISA_NUMBER_REGEX = r"^([0-9\s\-]{8,25})?$"

# Accepted Email Domains (Whitelist Approach #164)
# Only trusted providers and internal domains are allowed.
ACCEPTED_EMAIL_DOMAINS = {
    "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", 
    "icloud.com", "me.com", "live.com", "msn.com", "aol.com",
    "balaka.com", "airbalakatravel.com", "example.com", "test.com", # Internal/Testing
    "saudia.com", "biman.gov.bd", "flydubai.com", "global.com", "gdp.gov.sa" # Strategic Vendors
}