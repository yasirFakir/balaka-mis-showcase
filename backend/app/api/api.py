from fastapi import APIRouter

from app.api.endpoints import login, users, services, service_requests, files, roles, analytics, transactions, vendors, tickets, events, system, notifications

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(service_requests.router, prefix="/service-requests", tags=["service-requests"])
api_router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["vendors"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(system.router, prefix="/system", tags=["system"])






