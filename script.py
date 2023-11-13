import requests
import time

def monitor_update_frequency(api_url, interval_seconds, num_checks):
    prev_last_update = None
    for _ in range(num_checks):
        response = requests.get(api_url)
        data = response.json()
        current_last_update = max(item['last_update'] for item in data)
        if prev_last_update and current_last_update != prev_last_update:
            print(f'Data updated after {interval_seconds} seconds.')
        prev_last_update = current_last_update
        time.sleep(interval_seconds)

api_url = 'https://api.jcdecaux.com/vls/v1/stations?apiKey=872e2f95f2065c9ba756947091605559aa08ff4a&contract=amiens'
interval_seconds = 18
num_checks = 10 

monitor_update_frequency(api_url, interval_seconds, num_checks)
