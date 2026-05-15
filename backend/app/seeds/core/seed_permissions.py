from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.permission import Permission
from app.models.role import Role

def seed_permissions(db: Session = None):
    own_db = False
    if db is None:
        db = SessionLocal()
        own_db = True

    permission_matrix = {
        # Core Identity & Access
        "Users": ["view", "manage", "view_sensitive"],
        "Roles": ["view", "manage"],
        
        # Service Management
        "Services": ["view", "manage_catalog", "view_private"],
        
        # Request Lifecycle
        "Requests": ["view_all", "create", "manage", "process_technical", "approve_business", "finalize"],
        
        # Financial Domain
        "Finance": ["view_ledger", "manage_transactions", "settle_staff", "view_reports", "export_ledger"],
        
        # Operational Domains
        "Cargo": ["view_manifest", "manage_manifest", "update_tracking", "receive_items"],
        "Inventory": ["view_stock", "manage_stock", "process_sale"],
        
        # Support & Communication
        "Tickets": ["create", "view_assigned", "view_all", "manage", "participate"],
        
        # Data & Insights
        "Analytics": ["view_dashboard", "view_financial", "view_operational"],
        
        # Governance
        "Internal_Affairs": ["view_audit_logs", "manage_staff_records"],
        
        # System
        "System": ["backup", "restore", "configure", "reset"]
    }

    all_permissions = []

    print("Seeding Permissions...")
    # First ensure all permissions exist or get references to them
    final_permissions_map = {} # slug -> Permission object
    
    for module, actions in permission_matrix.items():
        for action in actions:
            slug = f"{module.lower()}.{action}"
            
            existing_perm = db.query(Permission).filter(Permission.slug == slug).first()
            
            if existing_perm:
                final_permissions_map[slug] = existing_perm
            else:
                perm = Permission(slug=slug, description=f"Can {action} {module}", module=module)
                db.add(perm)
                final_permissions_map[slug] = perm
    
    # Flush to get IDs for new permissions
    db.flush()

    # Define Role-Permission Assignments
    role_assignments = {
        "Admin": list(final_permissions_map.keys()), # All permissions
        
        "Manager": [
            # Full Operations Control
            "requests.view_all", "requests.create", "requests.manage", 
            "requests.process_technical", "requests.approve_business", "requests.finalize",
            
            # Full Financial Oversight (Limited by Scope)
            "finance.view_ledger", "finance.manage_transactions", "finance.view_reports", "finance.export_ledger",
            
            # User & Role Management
            "users.view", "users.manage", "users.view_sensitive",
            "roles.view",
            
            # Insights
            "analytics.view_dashboard", "analytics.view_financial", "analytics.view_operational",
            
            # Support
            "tickets.view_all", "tickets.manage", "tickets.participate",
            
            # Specialized
            "cargo.view_manifest", "cargo.manage_manifest", "inventory.view_stock",
            "services.view", "services.view_private"
        ],
        
        "Finance": [
            "finance.view_ledger", "finance.manage_transactions", "finance.settle_staff", 
            "finance.view_reports", "finance.export_ledger",
            "requests.view_all", "requests.manage",
            "analytics.view_financial",
            "users.view_sensitive",
            "internal_affairs.view_audit_logs"
        ],
        
        "Field Ops": [
            "cargo.view_manifest", "cargo.manage_manifest", "cargo.update_tracking", "cargo.receive_items",
            "inventory.view_stock", "inventory.manage_stock", "inventory.process_sale",
            "requests.view_all", "requests.create", "requests.manage", "requests.process_technical",
            "tickets.create", "tickets.view_assigned", "tickets.participate"
        ],
        
        "Support": [
            "tickets.create", "tickets.view_assigned", "tickets.view_all", "tickets.manage", "tickets.participate",
            "requests.view_all", "requests.create", "requests.manage",
            "users.view",
            "services.view"
        ],
        
        "Staff": [
            "requests.view_all", "requests.create", "requests.manage",
            "requests.process_technical", "requests.approve_business", "requests.finalize",
            "tickets.create", "tickets.view_assigned", "tickets.participate",
            "services.view"
        ],
        
        "Client": [
            "tickets.create", "tickets.participate"
        ]
    }

    print("Assigning Permissions to Roles...")
    for role_name, perm_slugs in role_assignments.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if role:
            role_perms = []
            for slug in perm_slugs:
                if slug in final_permissions_map:
                    role_perms.append(final_permissions_map[slug])
            role.permissions = role_perms
            db.add(role)

    if own_db:
        db.commit()
        db.close()
    else:
        db.flush()

if __name__ == "__main__":
    seed_permissions()