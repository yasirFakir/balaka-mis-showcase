from typing import List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
import json

from app import models, schemas
from app.models.transaction import Transaction
from app.models.status_history import StatusHistory
from app.schemas.vendor import VendorTransactionCreate
from app.schemas.ticket import SupportTicketCreate
from app.schemas.service_request import FinancialBreakdownItem
from app.crud.vendor import vendor as vendor_crud
from app.crud.ticket import ticket as ticket_crud
from app.core.events import event_broadcaster
from app.core.notifications import notification_manager

# Constants for Workflow
LIFECYCLE_STATUSES = ["Verifying Information", "Service on Hold", "Processing", "In Transit", "Received at Warehouse", "Out for Delivery"]
PROGRESSION_CHECK = ["Verifying Information", "Service on Hold", "Processing", "In Transit", "Received at Warehouse", "Out for Delivery", "Completed"]

class WorkflowService:
    async def process_creation(
        self,
        db: Session,
        request: models.ServiceRequest,
        current_user: models.User,
        service_def: models.ServiceDefinition
    ):
        """
        Handles post-creation logic: notifications and events.
        """
        # Broadcast Event
        await event_broadcaster.broadcast({
            "event": "request_created",
            "data": {
                "id": request.id,
                "status": request.status,
                "service_name": service_def.name,
                "user_id": current_user.id
            }
        })
        
        # Notification for Staff
        try:
            await notification_manager.notify_staff(
                db,
                title="New Service Request",
                title_bn="নতুন সেবার অনুরোধ",
                message=f"A new request for {service_def.name} has been submitted by {current_user.full_name}.",
                message_bn=f"{current_user.full_name} এর পক্ষ থেকে {service_def.name_bn or service_def.name} এর জন্য একটি নতুন অনুরোধ জমা দেওয়া হয়েছে।",
                link=f"/requests/{request.id}",
                service_def_id=service_def.id,
                notification_type="request_created"
            )
        except Exception as e:
            # We don't want to fail the request if notification fails
            print(f"NOTIFICATION ERROR (Creation): {e}")

    async def process_update(
        self,
        db: Session,
        request: models.ServiceRequest,
        request_in: schemas.ServiceRequestUpdate,
        current_user: models.User
    ) -> models.ServiceRequest:
        """
        Centralized logic for updating a service request.
        Handles state machine, financials, history, and notifications.
        """
        old_status = request.status
        
        # 1. Financial Pre-calculation for validation
        incoming_price = 0.0
        if request_in.financial_breakdown:
            incoming_price = sum(float(item.amount or 0) for item in request_in.financial_breakdown if item.type == "INCOME")

        # 2. State Machine & Transition Validation
        new_status, transitions_to_log = self.validate_status_transition(
            db=db,
            request=request,
            new_status=request_in.status or old_status,
            incoming_price=incoming_price,
            rejection_reason=request_in.rejection_reason,
            current_user=current_user
        )

        # 3. Financial Sync
        if request_in.financial_breakdown:
            self.sync_financials(
                db=db,
                request=request,
                breakdown=request_in.financial_breakdown,
                user_id=current_user.id
            )
        elif request_in.cost_price is not None or request_in.vendor_id:
            if request_in.vendor_id:
                request.vendor_id = request_in.vendor_id
            if request_in.cost_price is not None:
                request.cost_price = request_in.cost_price
            request.profit = (request.selling_price or 0) - (request.cost_price or 0)

        # 4. Apply other field updates
        form_data_changed = False
        changes_summary = []
        
        if request_in.form_data is not None:
            old_form_data = request.form_data or {}
            new_form_data = request_in.form_data
            
            for key, new_val in new_form_data.items():
                old_val = old_form_data.get(key)
                if old_val != new_val:
                    form_data_changed = True
                    label = key.replace("_", " ").title()
                    changes_summary.append(f"- {label}: '{old_val}' -> '{new_val}'")
            
            # Check for deleted keys if necessary (though usually they are just cleared)
            for key in old_form_data:
                if key not in new_form_data:
                    form_data_changed = True
                    label = key.replace("_", " ").title()
                    changes_summary.append(f"- {label}: Removed")

        update_data = request_in.model_dump(exclude= {
            "status", "financial_breakdown", "rejection_reason", "vendor_id", "cost_price"
        })
        for field, value in update_data.items():
            if value is not None:
                setattr(request, field, value)
        
        if request_in.rejection_reason is not None:
            request.rejection_reason = request_in.rejection_reason
        
        # Explicit Financial Field Sync (Backwards Compatibility & Direct Admin Edit)
        if request_in.currency is not None:
            request.currency = request_in.currency
        if request_in.exchange_rate is not None:
            request.exchange_rate = request_in.exchange_rate
        
        # Final status assignment
        if request_in.status:
            request.status = new_status

        # Audit Trail
        request.updated_by_id = current_user.id

        # 5. Save and History
        db.add(request)
        db.flush()
        
        # --- NEW: Audit Support Ticket for Data Changes ---
        # If an admin (not the client) changed the form data, open a ticket
        is_admin_action = any(role.name in ["Admin", "Manager", "Staff"] for role in current_user.roles) or current_user.is_superuser
        is_owner = request.user_id == current_user.id
        
        if form_data_changed and is_admin_action and not is_owner:
            try:
                ticket_msg = f"Administrative correction performed by {current_user.full_name}.\n\nChanges:\n" + "\n".join(changes_summary)
                
                audit_ticket_in = SupportTicketCreate(
                    subject=f"Data Update: {request.service_definition.name} (REQ-{request.id})",
                    priority="Medium",
                    category="General",
                    initial_message=ticket_msg,
                    service_request_id=request.id,
                    user_id=request.user_id # Create for the client
                )
                
                # Use current_user.id as the creator (the admin)
                ticket = ticket_crud.create_with_user(db, obj_in=audit_ticket_in, user_id=current_user.id)
                
                # Permanent Notification for the client
                await notification_manager.create_notification(
                    db,
                    user_id=request.user_id,
                    title="Information Updated by Admin",
                    title_bn="অ্যাডমিন দ্বারা তথ্য আপডেট করা হয়েছে",
                    message=f"Admin {current_user.full_name} has updated your application details. A support ticket has been opened with the details.",
                    message_bn=f"অ্যাডমিন {current_user.full_name} আপনার আবেদনের বিবরণ আপডেট করেছেন। বিস্তারিত তথ্যের জন্য একটি সাপোর্ট টিকিট খোলা হয়েছে।",
                    link=f"/support/{ticket.id}",
                    notification_type="request_updated"
                )
            except Exception as e:
                print(f"AUDIT TICKET ERROR: {e}")

        for old_s, new_s in transitions_to_log:
            history = StatusHistory(
                service_request_id=request.id,
                old_status=old_s,
                new_status=new_s,
                changed_by_id=current_user.id
            )
            db.add(history)
        
        db.commit()
        db.refresh(request)

        # 6. Post-update Actions (Broadcast & Notifications)
        await event_broadcaster.broadcast({
            "event": "request_updated",
            "data": {
                "id": request.id,
                "status": request.status,
                "rejection_reason": request.rejection_reason
            }
        })
        
        if new_status != old_status:
            try:
                await notification_manager.create_notification(
                    db,
                    user_id=request.user_id,
                    title="Request Update",
                    title_bn="অনুরোধ আপডেট",
                    message=f"Your request for {request.service_definition.name} has been updated to: {new_status}.",
                    message_bn=f"{request.service_definition.name_bn or request.service_definition.name} এর জন্য আপনার অনুরোধটি বর্তমানে এই অবস্থায় আছে: {new_status}।",
                    link=f"/requests/{request.id}",
                    notification_type="request_updated"
                )
            except Exception as e:
                print(f"NOTIFICATION ERROR (Update): {e}")

        return request

    async def cancel_request(
        self,
        db: Session,
        request: models.ServiceRequest,
        current_user: models.User
    ) -> models.ServiceRequest:
        """
        Handles cancellation logic, history, and events.
        """
        if request.status in ["Completed", "Rejected", "Cancelled"]:
            raise HTTPException(status_code=400, detail=f"Request is already {request.status}")

        old_status = request.status
        request.status = "Cancelled"
        request.updated_by_id = current_user.id
        db.add(request)
        
        # Log Status Change
        history_entry = StatusHistory(
            service_request_id=request.id,
            old_status=old_status,
            new_status="Cancelled",
            changed_by_id=current_user.id
        )
        db.add(history_entry)
        db.commit()
        db.refresh(request)
        
        # Broadcast Event
        await event_broadcaster.broadcast({
            "event": "request_updated",
            "data": {
                "id": request.id,
                "status": "Cancelled",
                "rejection_reason": None
            }
        })
        
        return request

    def validate_status_transition(
        self,
        db: Session,
        request: models.ServiceRequest,
        new_status: str,
        incoming_price: float,
        current_user: models.User,
        rejection_reason: Optional[str] = None
    ) -> Tuple[str, List[Tuple[str, str]]]:
        """
        Enforces state machine logic and returns the computed status and transitions to log.
        """
        old_status = request.status
        computed_status = new_status
        transitions = []

        def has_perm(perm: str) -> bool:
            if current_user.is_superuser:
                return True
            for role in current_user.roles:
                for p in role.permissions:
                    if p.slug == perm:
                        return True
            return False

        # 1. Handle Rejected State Locking
        if old_status == "Rejected":
            if computed_status == "Rejected":
                raise HTTPException(status_code=400, detail="Request is already rejected.")
            if computed_status not in ["Pending", "Approved"]:
                raise HTTPException(status_code=400, detail="Request is Rejected. You must change status to Pending/Approved to re-open it.")
            
            if not has_perm("requests.approve_business"):
                raise HTTPException(status_code=403, detail="Not authorized to re-open rejected requests.")
                
            request.rejection_reason = None

        # 2. Handle Completed/Cancelled State Locking
        if old_status in ["Completed", "Cancelled"]:
            raise HTTPException(status_code=400, detail=f"Request is {old_status} and cannot be modified.")

        # 3. Regression Prevention for 'Verifying Information'
        if computed_status == "Verifying Information":
            if old_status in PROGRESSION_CHECK:
                if PROGRESSION_CHECK.index(old_status) > PROGRESSION_CHECK.index(computed_status):
                    computed_status = old_status

        # 4. Logical Transitions
        if computed_status != old_status:
            # A. Transition: Pending -> Approved/Lifecycle
            if old_status == "Pending":
                if computed_status not in ["Approved", "Rejected"] + LIFECYCLE_STATUSES:
                    raise HTTPException(status_code=400, detail="Initial action must be Approve or Reject.")
                
                if computed_status == "Approved" or computed_status in LIFECYCLE_STATUSES:
                    if not has_perm("requests.approve_business"):
                        raise HTTPException(status_code=403, detail="Not authorized to Approve requests.")
                
                if computed_status in LIFECYCLE_STATUSES:
                    transitions.append(("Pending", "Approved"))
                    old_status = "Approved"

            # B. Transition: -> Rejected
            if computed_status == "Rejected":
                if not rejection_reason:
                    raise HTTPException(status_code=400, detail="Rejection reason is mandatory.")
                
                if not has_perm("requests.approve_business"):
                    raise HTTPException(status_code=403, detail="Not authorized to Reject requests.")
                
                # Auto-create Support Ticket
                from app.crud.ticket import ticket as ticket_crud
                from app.schemas.ticket import SupportTicketCreate

                ticket_in = SupportTicketCreate(
                    subject=f"Application Rejected: {request.service_definition.name} (ID: #{request.id})",
                    priority="Medium",
                    category="Order",
                    initial_message=f"Your application has been rejected. \n\nReason: {rejection_reason}",
                    service_request_id=request.id
                )
                # Use request.user_id as the ticket owner, but current_user.id as the creator (admin)
                ticket_crud.create_with_user(db, obj_in=ticket_in, user_id=current_user.id)

            # C. Transition: -> Lifecycle Stages
            if computed_status in LIFECYCLE_STATUSES:
                if not has_perm("requests.process_technical") and not has_perm("requests.approve_business"):
                    raise HTTPException(status_code=403, detail="Not authorized for technical processing.")

                effective_price = max(request.selling_price or 0, incoming_price)
                
                # Internal affairs (private services) can have 0 selling price
                is_public = True
                if request.service_definition:
                    is_public = request.service_definition.is_public
                
                if is_public and effective_price <= 0:
                    raise HTTPException(status_code=400, detail="Pricing must be defined before processing.")

            # D. Transition: -> Completed
            if computed_status == "Completed":
                if not has_perm("requests.finalize"):
                    raise HTTPException(status_code=403, detail="Not authorized to Finalize requests.")

                total_credited = db.query(func.sum(Transaction.amount + Transaction.discount)).filter(
                    Transaction.service_request_id == request.id,
                    Transaction.status == "Verified"
                ).scalar() or 0.0
                
                if total_credited < request.selling_price:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Cannot complete operation. Payment incomplete. Balance Due: {request.selling_price - total_credited}"
                    )

            transitions.append((old_status, computed_status))

        return computed_status, transitions

    def sync_financials(
        self,
        db: Session,
        request: models.ServiceRequest,
        breakdown: Optional[List[FinancialBreakdownItem]],
        user_id: int
    ):
        """
        Calculates profit, updates main pricing, and syncs vendor debt.
        """
        if breakdown is not None:
            # 1. Update Breakdown and Pricing
            request.financial_breakdown = [item.model_dump() for item in breakdown]
            
            total_income = sum(float(item.amount or 0) for item in breakdown if item.type == "INCOME")
            total_expense = sum(float(item.amount or 0) for item in breakdown if item.type in ["EXPENSE", "PAYMENT"])
            total_discount = sum(float(item.amount or 0) for item in breakdown if item.type == "DISCOUNT")
            total_payouts = sum(float(item.amount or 0) for item in breakdown if item.type == "PAYMENT")
            
            # Determine if internal (private) service
            is_internal = False
            if request.service_definition and not request.service_definition.is_public:
                is_internal = True

            # Final selling price (Target) logic:
            # - Public: Income - Discount
            # - Internal: (Income - Discount) + Payouts (We treat payouts as the 'Bill' to be settled)
            base_target = max(0, total_income - total_discount)
            final_selling_price = base_target + (total_payouts if is_internal else 0)
            
            request.selling_price = round(final_selling_price, 2)
            request.cost_price = round(total_expense, 2)
            request.profit = round(base_target - total_expense, 2)
        
        # 2. Sync Vendor Debt
        # We must ensure the service definition is loaded for the public/internal check
        is_internal = False
        if request.service_definition:
            is_internal = not request.service_definition.is_public
        
        # Determine if the request is in a state where financials should be realized
        is_active_state = request.status in [
            "Approved", "Verifying Information", "Payment Verified", 
            "Processing", "Completed", "Service on Hold", 
            "In Transit", "Received at Warehouse", "Out for Delivery"
        ]
        
        # Internal operations (Private Services) sync debt immediately; 
        # Public operations sync upon reaching active states.
        if (is_internal or is_active_state) and request.financial_breakdown:
            ref_note = f"Service Request #{request.id}"
            
            # 1. Clean up old automated transactions from this request
            # We filter by PURCHASE type and the specific reference note
            old_txns = db.query(models.VendorTransaction).filter(
                models.VendorTransaction.notes.contains(ref_note),
                models.VendorTransaction.transaction_type == "PURCHASE"
            ).all()
            
            for txn in old_txns:
                # Reverse the balance impact before deleting
                vendor = db.query(models.Vendor).filter(models.Vendor.id == txn.vendor_id).first()
                if vendor:
                    vendor.current_balance = round((vendor.current_balance or 0) - txn.amount, 2)
                    db.add(vendor)
                db.delete(txn)
            db.flush() 
            
            # 2. Create new transactions from current breakdown
            for item in request.financial_breakdown:
                # Include both EXPENSE and PAYMENT types for vendor debt
                if item.get("type") in ["EXPENSE", "PAYMENT"] and item.get("vendor_id"):
                    try:
                        v_id = int(item["vendor_id"])
                        
                        # Recalculate from sub-items if present for maximum accuracy
                        if item.get("sub_items") and len(item["sub_items"]) > 0:
                            amt = sum(float(si.get("amount") or 0) for si in item["sub_items"])
                        else:
                            amt = float(item.get("amount") or 0)
                            
                        lbl = item.get("label") or "Expense"
                        
                        if amt > 0:
                            txn_in = VendorTransactionCreate(
                                vendor_id=v_id,
                                amount=round(amt, 2),
                                transaction_type="PURCHASE",
                                notes=f"Purchase for {ref_note}: {lbl}"
                            )
                            # This call handles its own commit/refresh internally
                            vendor_crud.record_transaction(db, obj_in=txn_in, user_id=user_id)
                    except (ValueError, TypeError, KeyError):
                        continue

workflow_service = WorkflowService()
