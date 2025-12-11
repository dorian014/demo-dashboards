#!/usr/bin/env python3
"""
Fetch Superbetin influencer metrics from Google Sheets.

This script:
1. Connects to Google Sheets using service account credentials
2. Fetches data from Facebook and Instagram/X worksheets
3. Saves combined data as JSON for the dashboard
"""

import os
import json
from datetime import datetime
import gspread
from google.oauth2.service_account import Credentials

# Configuration
SERVICE_ACCOUNT_JSON = os.environ.get('GOOGLE_SERVICE_ACCOUNT')
DATA_DIR = 'data'
WORKSHEET_NAME = 'raw_data'

# Sheet IDs for each platform
SHEETS = {
    'instagram': '1V6t6GaDA7fCzIHxWfaBzn2P87pHcQ8hnqV__6fZpIBU',
    'facebook': '1CQwuMGNzc2eOAu9nvdKLvJXplnPcPkZ3XlS8XgpzBoY',
}


def setup_google_sheets():
    """Setup and authenticate Google Sheets client."""
    if not SERVICE_ACCOUNT_JSON:
        raise ValueError("GOOGLE_SERVICE_ACCOUNT environment variable not set")

    creds_dict = json.loads(SERVICE_ACCOUNT_JSON)
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly'
    ]
    creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    return gspread.authorize(creds)


def fetch_data(client, sheet_id, platform):
    """Fetch all data from a specific sheet."""
    try:
        spreadsheet = client.open_by_key(sheet_id)
        worksheet = spreadsheet.worksheet(WORKSHEET_NAME)
        records = worksheet.get_all_records()
        print(f"  Fetched {len(records)} records from {platform}")
        return records
    except gspread.exceptions.WorksheetNotFound:
        print(f"  Warning: Worksheet '{WORKSHEET_NAME}' not found in {platform} sheet")
        return []
    except Exception as e:
        print(f"  Error fetching {platform} data: {e}")
        raise


def save_json(data, filename):
    """Save data to JSON file."""
    os.makedirs(DATA_DIR, exist_ok=True)
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Data saved: {filepath}")


def main():
    """Main function."""
    print("Starting Superbetin data fetch...")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Setup Google Sheets client
    client = setup_google_sheets()

    # Fetch data from each platform
    all_data = {
        'generated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'platforms': {}
    }

    for platform, sheet_id in SHEETS.items():
        print(f"\nFetching {platform} data...")
        records = fetch_data(client, sheet_id, platform)

        platform_data = {
            'sheet_id': sheet_id,
            'worksheet': WORKSHEET_NAME,
            'count': len(records),
            'data': records
        }

        all_data['platforms'][platform] = platform_data

        # Save individual platform file
        save_json({
            'generated': all_data['generated'],
            'platform': platform,
            **platform_data
        }, f'superbetin_{platform}.json')

    # Save combined data
    save_json(all_data, 'superbetin.json')

    print("\n✓ Superbetin data fetch complete!")


if __name__ == '__main__':
    main()
