import argparse
import sys
import os

# Ensure the parent directory is in sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cli.finance import run_finance_diagnostics
from cli.users import list_users
from cli.requests import list_requests
from cli.vendors import list_vendors, list_vendor_transactions
from cli.transactions import list_transactions

def main():
    parser = argparse.ArgumentParser(description="Balaka MIS Command Line Interface (Flexible Variant)")
    subparsers = parser.add_subparsers(dest="command", help="Available modules")

    # Finance Module
    finance_parser = subparsers.add_parser("finance", help="Financial diagnostics")
    finance_parser.add_argument("--diagnostics", action="store_true", help="Run full health check")
    finance_parser.add_argument("--verbose", action="store_true", help="Show category breakdown")

    # Users Module
    users_parser = subparsers.add_parser("users", help="User and Staff management")
    users_parser.add_argument("--role", type=str, help="Filter by role (Client/Staff)")
    users_parser.add_argument("--active", action="store_true", help="Show only active users")

    # Requests Module
    req_parser = subparsers.add_parser("requests", help="Service request auditing")
    req_parser.add_argument("--status", type=str, help="Filter by status")
    req_parser.add_argument("--limit", type=int, default=20, help="Number of records to show")

    # Vendors Module
    vendor_parser = subparsers.add_parser("vendors", help="Vendor and debt management")
    vendor_parser.add_argument("--list", action="store_true", help="List all vendors and balances")
    vendor_parser.add_argument("--txns", action="store_true", help="Show recent vendor transactions")

    # Transactions Module
    txn_parser = subparsers.add_parser("transactions", help="Client transaction auditing")
    txn_parser.add_argument("--list", action="store_true", help="List recent client payments")

    args = parser.parse_args()

    if args.command == "finance":
        run_finance_diagnostics(verbose=args.verbose) if args.diagnostics else finance_parser.print_help()
    elif args.command == "users":
        list_users(role=args.role, active_only=args.active)
    elif args.command == "requests":
        list_requests(status=args.status, limit=args.limit)
    elif args.command == "vendors":
        if args.list: list_vendors()
        elif args.txns: list_vendor_transactions()
        else: vendor_parser.print_help()
    elif args.command == "transactions":
        list_transactions() if args.list else txn_parser.print_help()
    else:
        parser.print_help()

if __name__ == "__main__":
    main()