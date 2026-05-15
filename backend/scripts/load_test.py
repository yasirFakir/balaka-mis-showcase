import asyncio
import aiohttp
import time
import statistics

# Configuration
BASE_URL = "http://localhost:8008/api/v1"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3Njc4NDE0NjAsInN1YiI6IjEifQ.i4z7is2AUyDe98e29a_YzNrrt9NhAH9UJ_SBTzC4g7Y"
CONCURRENT_USERS = 50
REQUESTS_PER_USER = 5
ENDPOINTS = [
    "/service-requests/?limit=50",
    "/analytics/all-history?limit=50",
    "/users/?limit=50"
]

async def fetch(session, url):
    start = time.time()
    async with session.get(f"{BASE_URL}{url}", headers={"Authorization": f"Bearer {TOKEN}"}) as response:
        status = response.status
        await response.text()
        return time.time() - start, status

async def simulate_user(user_id):
    results = []
    async with aiohttp.ClientSession() as session:
        for _ in range(REQUESTS_PER_USER):
            for endpoint in ENDPOINTS:
                latency, status = await fetch(session, endpoint)
                results.append(latency)
    return results

async def run_load_test():
    print(f"🔥 Starting Burst Load Test: {CONCURRENT_USERS} concurrent users...")
    start_time = time.time()
    
    tasks = [simulate_user(i) for i in range(CONCURRENT_USERS)]
    all_results = await asyncio.gather(*tasks)
    
    flat_results = [lat for user_res in all_results for lat in user_res]
    total_time = time.time() - start_time
    
    print("\n--- 📊 Performance Results ---")
    print(f"Total Requests: {len(flat_results)}")
    print(f"Total Time: {total_time:.2f}s")
    print(f"Throughput: {len(flat_results)/total_time:.2f} req/s")
    print(f"Avg Latency: {statistics.mean(flat_results)*1000:.2f}ms")
    print(f"95th Percentile: {statistics.quantiles(flat_results, n=20)[18]*1000:.2f}ms")
    print(f"Max Latency: {max(flat_results)*1000:.2f}ms")
    print("-----------------------------\n")

if __name__ == "__main__":
    asyncio.run(run_load_test())
