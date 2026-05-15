#!/usr/bin/env python3
import subprocess
import sys
import os
import argparse
import time
from typing import List, Tuple

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
BLUE = "\033[94m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"
BOLD = "\033[1m"

class DebugTool:
    def __init__(self):
        self.root_dir = os.getcwd()
        self.backend_dir = os.path.join(self.root_dir, "backend")
        self.frontend_dir = os.path.join(self.root_dir, "frontend")
        self.cleanup_old_logs()

    def cleanup_old_logs(self):
        """Removes legacy log files to keep root clean."""
        legacy_logs = ["admin.log", "backend.log", "client.log"]
        for log in legacy_logs:
            path = os.path.join(self.root_dir, log)
            if os.path.exists(path):
                os.remove(path)

    def run_command(self, command: str, cwd: str = None, name: str = "Command") -> bool:
        """Runs a command, shows status, and prints full output on failure."""
        print(f"{YELLOW}► Running {name}...{RESET}")
        
        # Open debug.log for writing (overwrites existing)
        log_path = os.path.join(self.root_dir, "debug.log")
        
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, # Merge stderr into stdout
            shell=True,
            cwd=cwd,
            text=True
        )
        
        # Stream output in real-time for better feedback
        full_output = []
        with open(log_path, "w") as log_file:
            log_file.write(f"--- BALAKA DEBUG LOG ---\n")
            log_file.write(f"Command: {command}\n")
            log_file.write(f"CWD: {cwd or self.root_dir}\n")
            log_file.write("-" * 40 + "\n\n")
            
            while True:
                line = process.stdout.readline()
                if not line and process.poll() is not None:
                    break
                if line:
                    # Granular parsing for visual feedback
                    display_line = line
                    if "PASSED" in line:
                        display_line = line.replace("PASSED", f"{GREEN}PASSED{RESET}")
                    elif "FAILED" in line:
                        display_line = line.replace("FAILED", f"{RED}FAILED{RESET}")
                    elif "ERROR" in line:
                        display_line = line.replace("ERROR", f"{RED}ERROR{RESET}")
                    
                    print(f"  {CYAN}│{RESET} {display_line}", end="") 
                    full_output.append(line)
                    log_file.write(line)
                    log_file.flush()
        
        returncode = process.wait()
        
        if returncode == 0:
            print(f"{GREEN}✔ {name} Passed{RESET}")
            return True
        else:
            print(f"{RED}✘ {name} Failed (Exit Code: {returncode}){RESET}")
            print(f"\n{BOLD}{RED}--- ERROR LOGS (See debug.log for full details) ---")
            # Show last 20 lines of failure for quick context
            print("".join(full_output[-20:]))
            print(f"{BOLD}{RED}------------------{RESET}\n")
            return False

    # --- Phase Implementations ---

    def check_backend_lint(self):
        return self.run_command("export PYTHONPATH=$PYTHONPATH:. && source .venv/bin/activate && ruff check .", self.backend_dir, "Backend Lint (Ruff)")

    def run_backend_tests(self, test_path: str = None):
        # Ensure test database exists
        check_db = "sudo -u postgres psql -lqt | cut -d \\| -f 1 | grep -qw balaka_test"
        if os.system(check_db) != 0:
            print(f"{YELLOW}Creating test database 'balaka_test'...{RESET}")
            os.system("sudo -u postgres createdb balaka_test")

        cmd = "export PYTHONPATH=$PYTHONPATH:. && source .venv/bin/activate && pytest -v"
        if test_path:
            cmd += f" {test_path}"
        name = f"Backend Tests ({test_path if test_path else 'All'})"
        return self.run_command(cmd, self.backend_dir, name)

    def check_frontend_types(self):
        client = self.run_command("npx tsc --noEmit --project apps/balaka-client/tsconfig.json", self.frontend_dir, "Frontend Types (Client)")
        admin = self.run_command("npx tsc --noEmit --project apps/balaka-admin/tsconfig.json", self.frontend_dir, "Frontend Types (Admin)")
        return client and admin

    def run_frontend_builds(self):
        client = self.run_command("npm run build --workspace=balaka-client", self.frontend_dir, "Frontend Build (Client)")
        admin = self.run_command("npm run build --workspace=balaka-admin", self.frontend_dir, "Frontend Build (Admin)")
        return client and admin

    def run_e2e(self):
        return self.run_command("./backend/bash_scripts/run_smoke_test.sh", self.root_dir, "E2E Smoke Test")

    # --- Menu logic ---

    def show_menu(self):
        while True:
            os.system('clear' if os.name == 'posix' else 'cls')
            print(f"{BOLD}{CYAN}BALAKA MIS DEBUG & VERIFICATION TOOL{RESET}")
            print("-" * 40)
            print(f"{BOLD}1.{RESET} Run FULL Verification (Production Ready Check)")
            print(f"{BOLD}2.{RESET} Backend: Lint (Ruff)")
            print(f"{BOLD}3.{RESET} Backend: Pytest (All)")
            print(f"{BOLD}4.{RESET} Backend: Modular Tests (E2E)")
            print(f"   {BLUE}a.{RESET} User Management & RBAC")
            print(f"   {BLUE}b.{RESET} Service Catalog & Validation")
            print(f"   {BLUE}c.{RESET} Multi-Currency & Bound Rates")
            print(f"   {BLUE}d.{RESET} Finance Lifecycle & Safeguards")
            print(f"   {BLUE}e.{RESET} System Ops & Maintenance")
            print(f"{BOLD}5.{RESET} Frontend: Type-check (tsc)")
            print(f"{BOLD}6.{RESET} Frontend: Production Build (npm run build)")
            print(f"{BOLD}7.{RESET} E2E: Playwright Smoke Tests")
            print(f"{BOLD}q.{RESET} Quit")
            print("-" * 40)
            
            choice = input(f"{BOLD}Select an option: {RESET}").lower()
            
            if choice == '1':
                res = self.check_backend_lint()
                res = self.run_backend_tests() and res
                res = self.check_frontend_types() and res
                res = self.run_frontend_builds() and res
                res = self.run_e2e() and res
            elif choice == '2':
                self.check_backend_lint()
            elif choice == '3':
                self.run_backend_tests()
            elif choice == '4a':
                self.run_backend_tests("tests/e2e/test_users.py")
            elif choice == '4b':
                self.run_backend_tests("tests/e2e/test_services.py")
            elif choice == '4c':
                self.run_backend_tests("tests/e2e/test_currency.py")
            elif choice == '4d':
                self.run_backend_tests("tests/e2e/test_finance.py")
            elif choice == '4e':
                self.run_backend_tests("tests/e2e/test_system.py")
            elif choice == '5':
                self.check_frontend_types()
            elif choice == '6':
                self.run_frontend_builds()
            elif choice == '7':
                self.run_e2e()
            elif choice == 'q':
                print("Goodbye!")
                break
            else:
                print(f"{RED}Invalid choice.{RESET}")
            
            input(f"\n{YELLOW}Press Enter to return to menu...{RESET}")

def main():
    parser = argparse.ArgumentParser(description="Balaka MIS Debug Tool")
    parser.add_argument("--backend", action="store_true", help="Run backend lint and tests")
    parser.add_argument("--frontend", action="store_true", help="Run frontend typecheck and build")
    parser.add_argument("--e2e", action="store_true", help="Run E2E smoke tests")
    parser.add_argument("--module", type=str, help="Run specific test module (e.g. users, currency)")
    
    args = parser.parse_args()
    tool = DebugTool()

    if len(sys.argv) > 1:
        # CLI Mode
        if args.backend:
            tool.check_backend_lint()
            tool.run_backend_tests()
        if args.frontend:
            tool.check_frontend_types()
            tool.run_frontend_builds()
        if args.e2e:
            tool.run_e2e()
        if args.module:
            module_map = {
                "users": "tests/e2e/test_users.py",
                "services": "tests/e2e/test_services.py",
                "currency": "tests/e2e/test_currency.py",
                "finance": "tests/e2e/test_finance.py",
                "system": "tests/e2e/test_system.py",
                "flow": "tests/test_flow_e2e.py"
            }
            path = module_map.get(args.module)
            if path:
                tool.run_backend_tests(path)
            else:
                print(f"Unknown module: {args.module}")
    else:
        # Interactive Mode
        try:
            tool.show_menu()
        except KeyboardInterrupt:
            print("\nExiting...")

if __name__ == "__main__":
    main()
