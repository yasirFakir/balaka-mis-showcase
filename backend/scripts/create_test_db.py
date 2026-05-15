import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def create_test_db():
    try:
        # Connect to default 'postgres' db
        conn = psycopg2.connect(
            user="postgres", 
            password="password", 
            host="localhost", 
            port="5432",
            database="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Drop if exists
        cur.execute("DROP DATABASE IF EXISTS balaka_test;")
        # Create
        cur.execute("CREATE DATABASE balaka_test;")
        
        print("✅ Database 'balaka_test' created.")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Failed to create DB: {e}")

if __name__ == "__main__":
    create_test_db()
