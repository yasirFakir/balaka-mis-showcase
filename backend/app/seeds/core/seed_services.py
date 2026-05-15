from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.service import ServiceDefinition, ServiceVariant
from app.models.vendor import Vendor
from app.models.user import User
from app.models.role import Role
from app.core.security import get_password_hash

def seed_services(db: Session = None):
    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    print("🚀 Syncing Professional Service Catalog...")

    # --- 1. Seed Strategic Financial Sources (Simplified Vendors) ---
    # We maintain existing vendors and only add/update core ones
    vendors_data = [
        {"name": "External Cost", "type": "EXTERNAL", "contact_person": "System", "phone": "", "email": ""},
        {"name": "Internal Cost", "type": "INTERNAL", "contact_person": "System", "phone": "", "email": ""},
        {"name": "Petty Cash", "type": "INTERNAL", "contact_person": "Office Manager", "phone": "", "email": ""},
        {"name": "Delivery Cost", "type": "EXTERNAL", "contact_person": "Logistics", "phone": "", "email": ""},
        {"name": "Abraj", "type": "EXTERNAL", "contact_person": "Sales", "phone": "", "email": ""},
        {"name": "Universal", "type": "EXTERNAL", "contact_person": "Accountant", "phone": "", "email": ""},
    ]
    
    vendor_map = {}
    for v in vendors_data:
        existing_v = db.query(Vendor).filter(Vendor.name == v["name"]).first()
        if existing_v:
            for key, value in v.items():
                setattr(existing_v, key, value)
            db.flush()
            vendor_map[v["name"]] = existing_v.id
        else:
            new_vendor = Vendor(**v)
            db.add(new_vendor)
            db.flush()
            vendor_map[v["name"]] = new_vendor.id

    common_fields = [
        {"key": "full_name", "label": "Full Name / নাম", "type": "text", "required": True},
        {"key": "contact_number", "label": "Contact Number / মোবাইল নম্বর", "type": "phone", "required": True},
    ]

    services = [
        {
            "name": "Air Ticket",
            "name_bn": "এয়ার টিকিট",
            "slug": "air-ticket",
            "category": "Ticket Service",
            "code_prefix": "TKT",
            "vendor_ids": [vendor_map["External Cost"], vendor_map["Internal Cost"], vendor_map["Abraj"], vendor_map["Universal"]],
            "tags": ["Ticket Service"],
            "is_public": True,
            "description": "Professional flight booking and multi-passenger itinerary management.",
            "description_bn": "পেশাদার ফ্লাইট বুকিং এবং মাল্টি-প্যাসেঞ্জার ভ্রমণ ব্যবস্থাপনা।",
            "image_url": "/shared/images/services/svc-air-ticket.webp",
            "form_schema": {
                "sections": [
                    {
                        "title": "Booking Details / বুকিং বিবরণ", 
                        "fields": [
                            {"key": "pnr_number", "label": "PNR Number / পিএনআর নম্বর", "type": "text", "required": True, "admin_only": True},
                            {"key": "is_return_trip", "label": "Return Trip? / রিটার্ন ট্রিপ?", "type": "checkbox", "required": False}
                        ]
                    },
                    {
                        "title": "Passenger Information / যাত্রীদের তথ্য", 
                        "fields": [
                            {"key": "adult_passengers", "label": "Adult Name(s) / প্রাপ্তবয়স্কদের নাম", "type": "list", "required": True},
                            {"key": "adult_passengers_count", "label": "Total Adults / মোট প্রাপ্তবয়স্ক", "type": "number", "read_only": True},
                            {"key": "child_passengers", "label": "Child Name(s) / শিশুদের নাম", "type": "list", "required": False},
                            {"key": "child_passengers_count", "label": "Total Children / মোট শিশু", "type": "number", "read_only": True},
                            {"key": "infant_passengers", "label": "Infant Name(s) / শিশুদের নাম (২ বছরের নিচে)", "type": "list", "required": False},
                            {"key": "infant_passengers_count", "label": "Total Infants / মোট শিশু (২ বছরের নিচে)", "type": "number", "read_only": True}
                        ]
                    },
                    {
                        "title": "Itinerary / ভ্রমণপথ", 
                        "fields": [
                            {"key": "departure_city", "label": "From / থেকে", "type": "text", "required": True},
                            {"key": "arrival_city", "label": "To / গন্তব্য", "type": "text", "required": True},
                            {"key": "travel_date", "label": "Travel Date / ভ্রমণের তারিখ", "type": "date", "required": True},
                            {
                                "key": "return_date", 
                                "label": "Return Date / ফেরার তারিখ", 
                                "type": "date", 
                                "required": False,
                                "conditions": [
                                    {"depend_on": "is_return_trip", "value": False, "action": "disable"}
                                ]
                            },
                            {"key": "contact_number", "label": "Contact Number / মোবাইল নম্বর", "type": "phone", "required": False},
                            {"key": "passport_copy", "label": "Passport Copy / পাসপোর্টের কপি", "type": "file", "required": False}
                        ]
                    }
                ]
            },
            "financial_schema": [
                {"key": "base_price", "label": "Total Price", "type": "INCOME", "source": "CLIENT", "amount": 0},
                {"key": "base_cost", "label": "Ticket Cost", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("External Cost"), "amount": 0},
            ],
            "variants": [
                {"name_en": "Regular Ticket", "name_bn": "সাধারণ টিকিট", "price_model": "FIXED", "default_price": 0.0}
            ],
            "coupon_config": {"enabled": False, "code": "FLYBALAKA", "percentage": 5.0}
        },
        {
            "name": "Cargo Service",
            "name_bn": "কার্গো সেবা",
            "slug": "cargo-service",
            "category": "Cargo Service",
            "code_prefix": "CRG",
            "vendor_ids": [vendor_map["External Cost"], vendor_map["Internal Cost"], vendor_map["Delivery Cost"]],
            "tags": ["Cargo Service"],
            "is_public": True,
            "description": "Professional door-to-door cargo and logistics from KSA to Bangladesh.",
            "description_bn": "কেএসএ থেকে বাংলাদেশে পেশাদার ডোর-টু-ডোর কার্গো এবং লজিস্টিক সেবা।",
            "image_url": "/shared/images/services/svc-cargo-service.webp",
            "form_schema": {
                "sections": [
                    {"title": "Sender Details / প্রেরকের বিবরণ", "fields": common_fields + [
                        {"key": "location", "label": "Location / ঠিকানা", "type": "textarea", "required": True}
                    ]},
                    {"title": "Receiver Details / প্রাপকের বিবরণ", "fields": [
                        {"key": "receiver_name", "label": "Receiver Name / প্রাপকের নাম", "type": "text", "required": True},
                        {"key": "receiver_phone", "label": "Receiver Phone / প্রাপকের ফোন", "type": "phone", "required": True},
                        {"key": "district", "label": "District / জেলা", "type": "select", "options": [
                            "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra", "Brahmanbaria", 
                            "Chandpur", "Chapai Nawabganj", "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar", 
                            "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", 
                            "Habiganj", "Jamalpur", "Jhalokati", "Jashore", "Jhenaidah", "Joypurhat", 
                            "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", 
                            "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", 
                            "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", 
                            "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", 
                            "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", 
                            "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", 
                            "Tangail", "Thakurgaon"
                        ], "required": True}
                    ]},
                    {"title": "Shipment Details / চালানের বিবরণ", "fields": [
                        {"key": "weight_kg", "label": "Weight (KG) / ওজন (কেজি)", "type": "number", "required": False, "admin_only": True},
                        {"key": "carton_count", "label": "Carton Count / কার্টুন সংখ্যা", "type": "number", "required": False, "admin_only": True},
                        {"key": "cargo_items", "label": "Items & Quantities / পণ্যের তালিকা ও পরিমাণ (e.g. Laptop 2pcs)", "type": "list", "required": False}
                    ]}
                ]
            },
            "financial_schema": [
                {
                    "key": "base_price", 
                    "label": "Shipping Charges", 
                    "type": "INCOME", 
                    "source": "CLIENT", 
                    "amount": 0
                },
                {"key": "base_cost", "label": "Vendor Shipping Cost", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("External Cost"), "amount": 0},
                {"key": "packaging", "label": "Packaging Cost", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("Internal Cost"), "amount": 15},
            ],
            "variants": [
                {"name_en": "Standard Box", "name_bn": "স্ট্যান্ডার্ড বক্স", "price_model": "FIXED", "default_price": 300.0, "default_cost": 250.0, "default_vendor_id": vendor_map.get("External Cost")},
                {"name_en": "Per KG (Air)", "name_bn": "প্রতি কেজি (এয়ার)", "price_model": "FIXED", "default_price": 35.0, "default_cost": 30.0, "default_vendor_id": vendor_map.get("External Cost")},
            ],
            "coupon_config": {"enabled": False, "code": "CARGOSAVE", "percentage": 10.0}
        },
        {
            "name": "Umrah & Hajj",
            "name_bn": "ওমরাহ এবং হজ্জ",
            "slug": "umrah-package",
            "category": "Hajj & Umrah",
            "code_prefix": "HAJ",
            "vendor_ids": [vendor_map["External Cost"], vendor_map["Abraj"], vendor_map["Universal"]],
            "tags": ["Hajj & Umrah"],
            "is_public": True,
            "description": "Group and individual Umrah & Hajj travel arrangements with dynamic passenger tracking.",
            "description_bn": "গ্রুপ এবং ব্যক্তিগত ওমরাহ ও হজ্জ ভ্রমণ ব্যবস্থা এবং যাত্রী ট্র্যাকিং।",
            "image_url": "/shared/images/services/svc-umrah-package.webp",
            "form_schema": {
                "sections": [
                    {
                        "title": "Booking Details / বুকিং বিবরণ", 
                        "fields": [
                            {"key": "pnr_number", "label": "Reference / PNR Number", "type": "text", "required": True, "admin_only": True},
                            {"key": "is_return_trip", "label": "Return Trip? / রিটার্ন ট্রিপ?", "type": "checkbox", "required": False}
                        ]
                    },
                    {
                        "title": "Pilgrim Information / হাজীদের তথ্য", 
                        "fields": [
                            {"key": "adult_passengers", "label": "Pilgrim Name(s) / হাজীদের নাম", "type": "list", "required": True},
                            {"key": "adult_passengers_count", "label": "Total Pilgrims / মোট হাজী", "type": "number", "read_only": True},
                            {"key": "child_passengers", "label": "Child Name(s) / শিশুদের নাম", "type": "list", "required": False},
                            {"key": "child_passengers_count", "label": "Total Children / মোট শিশু", "type": "number", "read_only": True},
                            {"key": "infant_passengers", "label": "Infant Name(s) / শিশুদের নাম (২ বছরের নিচে)", "type": "list", "required": False},
                            {"key": "infant_passengers_count", "label": "Total Infants / মোট শিশু (২ বছরের নিচে)", "type": "number", "read_only": True}
                        ]
                    },
                    {
                        "title": "Package Details / প্যাকেজ বিবরণ", 
                        "fields": [
                            {"key": "departure_city", "label": "From / থেকে", "type": "text", "required": True},
                            {"key": "arrival_city", "label": "To / গন্তব্য", "type": "text", "required": True},
                            {"key": "travel_date", "label": "Travel Date / ভ্রমণের তারিখ", "type": "date", "required": True},
                            {
                                "key": "return_date", 
                                "label": "Return Date / ফেরার তারিখ", 
                                "type": "date", 
                                "required": False,
                                "conditions": [
                                    {"depend_on": "is_return_trip", "value": False, "action": "disable"}
                                ]
                            },
                            {"key": "contact_number", "label": "Contact Number / মোবাইল নম্বর", "type": "phone", "required": False},
                            {"key": "passport_copy", "label": "Passport Scans / পাসপোর্টের কপি", "type": "file", "required": False}
                        ]
                    }
                ]
            },
            "financial_schema": [
                {"key": "base_price", "label": "Package Total", "type": "INCOME", "source": "CLIENT", "amount": 0},
                {"key": "base_cost", "label": "Package Cost", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("External Cost"), "amount": 0},
            ],
            "variants": [
                {"name_en": "Standard Package", "name_bn": "স্ট্যান্ডার্ড প্যাকেজ", "price_model": "FIXED", "default_price": 0.0},
            ],
            "coupon_config": {"enabled": False, "code": "UMRAH2026", "percentage": 2.5}
        },
        {
            "name": "General Service",
            "name_bn": "সাধারণ সেবা",
            "slug": "general-service",
            "category": "General Service",
            "code_prefix": "GEN",
            "vendor_ids": [vendor_map["External Cost"], vendor_map["Internal Cost"], vendor_map["Petty Cash"]],
            "tags": ["General Service"],
            "is_public": False, 
            "description": "Consolidated service for all general tasks, visas, and documentation.",
            "description_bn": "সমস্ত সাধারণ কাজ, ভিসা এবং ডকুমেন্টেশনের জন্য সমন্বিত সেবা।",
            "image_url": "/shared/images/services/svc-jawazat-services.webp",
            "form_schema": {
                "sections": [
                    {"title": "General Info", "fields": common_fields}
                ]
            },
            "financial_schema": [
                {"key": "service_fee", "label": "Service Charge", "type": "INCOME", "source": "CLIENT", "amount": 0},
                {"key": "external_cost", "label": "External Cost", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("External Cost"), "amount": 0},
            ],
            "variants": [
                {"name_en": "Family Visa", "name_bn": "ফ্যামিলি ভিসা", "price_model": "FIXED", "default_price": 1000.0},
                {"name_en": "Passport Malumat", "name_bn": "পাসপোর্ট মালুমাত", "price_model": "FIXED", "default_price": 120.0},
                {"name_en": "Driving License", "name_bn": "ড্রাইভিং লাইসেন্স", "price_model": "FIXED", "default_price": 3500.0},
                {"name_en": "International License", "name_bn": "আন্তর্জাতিক লাইসেন্স", "price_model": "FIXED", "default_price": 200.0},
                {"name_en": "Iqama Renewal", "name_bn": "ইকামা নবায়ন", "price_model": "FIXED", "default_price": 100.0},
                {"name_en": "Exit Re-Entry", "name_bn": "এক্সিট রি-এন্ট্রি", "price_model": "FIXED", "default_price": 50.0},
                {"name_en": "Hurub Check", "name_bn": "হুরুব চেক", "price_model": "FIXED", "default_price": 30.0},
            ]
        },
        # --- Internal Services ---
        {
            "name": "TT-GR",
            "name_bn": "সম্পদ স্থানান্তর",
            "slug": "tt-gr",
            "category": "General Service",
            "code_prefix": "OPS",
            "vendor_ids": [vendor_map["Internal Cost"], vendor_map["Petty Cash"]],
            "tags": ["General Service"],
            "is_public": False,
            "description": "Tracking cash or asset movements between internal agents.",
            "description_bn": "অভ্যন্তরীণ এজেন্টদের মধ্যে নগদ বা সম্পদ স্থানান্তরের ট্র্যাকিং।",
            "form_schema": {
                "sections": [
                    {"title": "Transfer Info / স্থানান্তরের তথ্য", "fields": [
                        {"key": "asset_type", "label": "Asset Type / সম্পদের ধরন", "type": "select", "options": ["Gold", "SAR Cash", "USD Cash"], "required": True},
                        {"key": "quantity", "label": "Amount / Weight / পরিমাণ/ওজন", "type": "number", "required": True},
                        {"key": "carrier_name", "label": "Responsible Agent / দায়িত্বপ্রাপ্ত এজেন্ট", "type": "select", "source": "staff", "required": True}
                    ]}
                ]
            },
            "financial_schema": [
                {"key": "initial_value", "label": "Value Sent", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("Internal Cost"), "amount": 0},
                {"key": "returned_value", "label": "Value Received", "type": "INCOME", "source": "CLIENT", "amount": 0},
            ],
            "variants": [
                {"name_en": "Internal Transfer", "name_bn": "অভ্যন্তরীণ স্থানান্তর", "price_model": "FIXED", "default_price": 0.0}
            ]
        },
        {
            "name": "Staff Settlement",
            "name_bn": "স্টাফ সেটেলমেন্ট",
            "slug": "staff-settlement",
            "category": "General Service",
            "code_prefix": "OPS",
            "vendor_ids": [vendor_map["Internal Cost"]],
            "tags": ["General Service"],
            "is_public": False,
            "description": "Monthly payroll and expense reconciliation.",
            "description_bn": "মাসিক বেতন এবং খরচ সমন্বয়।",
            "form_schema": {
                "sections": [
                    {"title": "Period Details / সময়ের বিবরণ", "fields": [
                        {"key": "agent", "label": "Staff Member / স্টাফ সদস্য", "type": "select", "source": "staff", "required": True},
                        {"key": "month", "label": "Month / মাস", "type": "select", "options": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], "required": True},
                        {"key": "year", "label": "Year / বছর", "type": "year", "required": True}
                    ]}
                ]
            },
            "financial_schema": [
                {
                    "key": "staff_fixed_costs", 
                    "label": "Total Settlement", 
                    "type": "EXPENSE", 
                    "source": "VENDOR",
                    "source_id": vendor_map.get("Internal Cost"),
                    "amount": 0,
                    "sub_items": [
                        {"label": "Monthly Salary", "amount": 0},
                        {"label": "House Rent", "amount": 0},
                        {"label": "Food Allowance", "amount": 0},
                        {"label": "Others", "amount": 0}
                    ]
                }
            ],
            "variants": [
                {"name_en": "Monthly P&L", "name_bn": "মাসিক পিএন্ডএল", "price_model": "FIXED", "default_price": 0.0}
            ]
        },
        {
            "name": "Trading",
            "name_bn": "অভ্যন্তরীণ ট্রেডিং",
            "slug": "internal-trading",
            "category": "General Service",
            "code_prefix": "OPS",
            "vendor_ids": [vendor_map["External Cost"], vendor_map["Internal Cost"]],
            "tags": ["General Service"],
            "is_public": False,
            "description": "Trip-based goods sourcing and retail sales cycle.",
            "description_bn": "ট্রিপ-ভিত্তিক পণ্য সোর্সিং এবং খুচরা বিক্রয় চক্র।",
            "form_schema": {
                "sections": [
                    {"title": "Trip Details / ট্রিপের বিবরণ", "fields": [
                        {"key": "agent", "label": "Responsible Agent / দায়িত্বপ্রাপ্ত এজেন্ট", "type": "select", "source": "staff", "required": True},
                        {"key": "departure_date", "label": "Departure Date / যাওয়ার তারিখ", "type": "date", "required": True},
                        {"key": "return_date", "label": "Return Date / ফেরার তারিখ", "type": "date", "required": True},
                        {"key": "description", "label": "Notes / মন্তব্য", "type": "textarea", "required": True}
                    ]}
                ]
            },
            "financial_schema": [
                {"key": "ticket_cost", "label": "Ticket Cost", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("External Cost"), "amount": 0},
                {"key": "purchase_cost", "label": "Sourcing Cost", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("External Cost"), "amount": 0},
                {"key": "revenue_bd", "label": "Sales (Bangladesh)", "type": "INCOME", "source": "CLIENT", "amount": 0},
                {"key": "revenue_ksa", "label": "Sales (KSA)", "type": "INCOME", "source": "CLIENT", "amount": 0}
            ],
            "variants": [
                {"name_en": "Trading Cycle", "name_bn": "ট্রেডিং সাইকেল", "price_model": "FIXED", "default_price": 0.0}
            ]
        },
        {
            "name": "Office Expenses",
            "name_bn": "অফিস খরচ",
            "slug": "office-expenses",
            "category": "General Service",
            "code_prefix": "OPS",
            "vendor_ids": [vendor_map["Petty Cash"]],
            "tags": ["General Service"],
            "is_public": False,
            "description": "Maintenance and utility costs for specific branches.",
            "description_bn": "নির্দিষ্ট শাখাগুলোর রক্ষণাবেক্ষণ এবং ইউটিলিটি খরচ।",
            "form_schema": {
                "sections": [
                    {"title": "Expense Record / খরচের রেকর্ড", "fields": [
                        {"key": "office", "label": "Office Location / অফিস", "type": "select", "options": ["Dhaka", "Riyadh", "Jeddah"], "required": True},
                        {"key": "expense_type", "label": "Category / খরচের ধরন", "type": "select", "options": ["Rent", "Electricity", "Internet", "Maintenance", "Supplies"], "required": True},
                        {"key": "description", "label": "Description / বিবরণ", "type": "textarea", "required": True}
                    ]}
                ]
            },
            "financial_schema": [
                {"key": "cost_amount", "label": "Amount Paid", "type": "EXPENSE", "source": "VENDOR", "source_id": vendor_map.get("Petty Cash"), "amount": 0}
            ],
            "variants": [
                {"name_en": "Utility/Rent", "name_bn": "ইউটিলিটি/ভাড়া", "price_model": "FIXED", "default_price": 0.0}
            ]
        }
    ]

    for svc in services:
        if not svc.get("slug"): continue
        existing_svc = db.query(ServiceDefinition).filter(ServiceDefinition.slug == svc["slug"]).first()
        variants_data = svc.pop("variants")
        if existing_svc:
            for key, value in svc.items():
                setattr(existing_svc, key, value)
            db.flush()
            service_id = existing_svc.id
        else:
            new_service = ServiceDefinition(**svc)
            db.add(new_service)
            db.flush()
            service_id = new_service.id
        
        # Clean/Sync Variants (Smart Sync)
        for var in variants_data:
            existing_var = db.query(ServiceVariant).filter(
                ServiceVariant.service_def_id == service_id,
                ServiceVariant.name_en == var["name_en"]
            ).first()
            
            if existing_var:
                for key, value in var.items():
                    setattr(existing_var, key, value)
            else:
                new_var = ServiceVariant(**var, service_def_id=service_id)
                db.add(new_var)
        db.flush()
    
    if own_db:
        db.commit()
        db.close()
    else:
        db.flush()

if __name__ == "__main__":
    seed_services()